import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/sequelize';
import { Op, type Transaction } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import { InstitutionDateTimeService } from '../../helpers/institution-date-time/institution-date-time.service.js';
import { Appointment, AppointmentStatus } from '../../models/appointment.model.js';
import { AttendanceStatusHistory } from '../../models/attendance-status-history.model.js';
import {
  Attendance,
  AttendanceOccurrence,
  AttendanceResolutionStatus,
} from '../../models/attendance.model.js';
import { Availability } from '../../models/availability.model.js';
import { User } from '../../models/user.model.js';
import type { ListAttendanceHistoryResponseDto } from './dto/list-attendance-history-response.dto.js';
import type { RegisterAttendanceResponseDto } from './dto/register-attendance-response.dto.js';
import type { RegisterAttendanceDto } from './dto/register-attendance.dto.js';

type AttendanceScope = 'admin' | 'professor';
type PreparedAttendance = {
  continuityResponsible: string | null;
  dueDate: string | null;
  internalNotes: string | null;
  nextStep: string | null;
  occurrence: AttendanceOccurrence;
  referral: string | null;
  resolutionStatus: AttendanceResolutionStatus | null;
  solution: string | null;
  unresolvedReason: string | null;
};

function textOrNull(value?: string): string | null {
  return value?.trim() || null;
}

@Injectable()
export class AttendanceService {
  constructor(
    @InjectModel(Appointment) private readonly appointmentModel: typeof Appointment,
    @InjectModel(Availability) private readonly availabilityModel: typeof Availability,
    @InjectModel(Attendance) private readonly attendanceModel: typeof Attendance,
    @InjectModel(AttendanceStatusHistory)
    private readonly attendanceHistoryModel: typeof AttendanceStatusHistory,
    @InjectModel(User) private readonly userModel: typeof User,
    @InjectConnection() private readonly sequelize: Sequelize,
    private readonly institutionDateTime: InstitutionDateTimeService,
  ) {}

  registerAssigned(
    appointmentId: number,
    input: RegisterAttendanceDto,
    actorId: number,
  ): Promise<RegisterAttendanceResponseDto> {
    return this.register(appointmentId, input, actorId, 'professor');
  }

  registerAny(
    appointmentId: number,
    input: RegisterAttendanceDto,
    actorId: number,
  ): Promise<RegisterAttendanceResponseDto> {
    return this.register(appointmentId, input, actorId, 'admin');
  }

  listAssignedHistory(
    attendanceId: number,
    actorId: number,
  ): Promise<ListAttendanceHistoryResponseDto> {
    return this.listHistory(attendanceId, actorId, 'professor');
  }

  listAnyHistory(attendanceId: number, actorId: number): Promise<ListAttendanceHistoryResponseDto> {
    return this.listHistory(attendanceId, actorId, 'admin');
  }

  private async register(
    appointmentId: number,
    input: RegisterAttendanceDto,
    actorId: number,
    scope: AttendanceScope,
  ): Promise<RegisterAttendanceResponseDto> {
    const prepared = this.prepare(input);
    const reference = await this.appointmentModel.findByPk(appointmentId, {
      attributes: ['availabilityId'],
    });
    if (!reference) throw new NotFoundException('Agendamento não encontrado.');

    return this.sequelize.transaction(async (transaction) => {
      const appointment = await this.lockAuthorizedAppointment(
        appointmentId,
        reference.availabilityId,
        actorId,
        scope,
        transaction,
      );
      if (appointment.status !== AppointmentStatus.CONFIRMED) {
        throw new ConflictException('Somente agendamentos confirmados podem ser registrados.');
      }
      if (appointment.startsAt.getTime() > Date.now()) {
        throw new ConflictException('O atendimento só pode ser registrado após o horário inicial.');
      }

      const existing = await this.attendanceModel.findOne({
        attributes: ['id'],
        lock: transaction.LOCK.UPDATE,
        transaction,
        where: { appointmentId },
      });
      if (existing) throw new ConflictException('Este atendimento já foi registrado.');

      const recordedAt = new Date();
      const attendance = await this.attendanceModel.create(
        {
          ...prepared,
          appointmentId,
          createdBy: actorId,
          recordedAt,
          updatedBy: actorId,
        },
        { transaction },
      );
      await this.attendanceHistoryModel.create(
        {
          attendanceId: attendance.id,
          changedAt: recordedAt,
          changeReason: 'Registro inicial do atendimento.',
          createdBy: actorId,
          occurrence: prepared.occurrence,
          resolutionStatus: prepared.resolutionStatus,
        },
        { transaction },
      );
      await appointment.update(
        {
          status:
            prepared.occurrence === AttendanceOccurrence.ABSENCE
              ? AppointmentStatus.ABSENT
              : AppointmentStatus.COMPLETED,
          updatedBy: actorId,
        },
        { fields: ['status', 'updatedBy'], transaction },
      );

      return {
        attendance: {
          appointmentId,
          id: attendance.id,
          occurrence: prepared.occurrence,
          recordedAt: recordedAt.toISOString(),
          resolutionStatus: prepared.resolutionStatus,
        },
        message:
          prepared.occurrence === AttendanceOccurrence.ABSENCE
            ? 'Ausência registrada com sucesso.'
            : 'Atendimento registrado com sucesso.',
      };
    });
  }

  private async lockAuthorizedAppointment(
    appointmentId: number,
    availabilityId: number,
    actorId: number,
    scope: AttendanceScope,
    transaction: Transaction,
  ): Promise<Appointment> {
    const availability = await this.availabilityModel.unscoped().findByPk(availabilityId, {
      attributes: ['id', 'professorId'],
      lock: transaction.LOCK.UPDATE,
      paranoid: false,
      transaction,
    });
    const appointment = await this.appointmentModel.findByPk(appointmentId, {
      attributes: ['availabilityId', 'id', 'startsAt', 'status'],
      lock: transaction.LOCK.UPDATE,
      transaction,
    });
    if (
      !availability ||
      !appointment ||
      appointment.availabilityId !== availability.id ||
      (scope === 'professor' && availability.professorId !== actorId)
    ) {
      throw new NotFoundException('Agendamento não encontrado.');
    }
    return appointment;
  }

  private prepare(input: RegisterAttendanceDto): PreparedAttendance {
    const internalNotes = textOrNull(input.internalNotes);
    if (input.occurrence === AttendanceOccurrence.ABSENCE) {
      if (
        input.resolutionStatus ||
        input.solution ||
        input.referral ||
        input.unresolvedReason ||
        input.continuityResponsible ||
        input.nextStep ||
        input.dueDate
      ) {
        throw new BadRequestException('Uma ausência não possui classificação de resolução.');
      }
      return {
        continuityResponsible: null,
        dueDate: null,
        internalNotes,
        nextStep: null,
        occurrence: input.occurrence,
        referral: null,
        resolutionStatus: null,
        solution: null,
        unresolvedReason: null,
      };
    }

    if (!input.resolutionStatus) {
      throw new BadRequestException('Informe a classificação do atendimento realizado.');
    }
    const solution = textOrNull(input.solution);
    const referral = textOrNull(input.referral);
    const unresolvedReason = textOrNull(input.unresolvedReason);
    const continuityResponsible = textOrNull(input.continuityResponsible);
    const nextStep = textOrNull(input.nextStep);
    const dueDate = input.dueDate ?? null;

    if (input.resolutionStatus === AttendanceResolutionStatus.RESOLVED && !solution && !referral) {
      throw new BadRequestException('Informe a solução ou o encaminhamento do atendimento.');
    }
    if (input.resolutionStatus === AttendanceResolutionStatus.UNRESOLVED && !unresolvedReason) {
      throw new BadRequestException('Informe a justificativa do atendimento não resolvido.');
    }
    if (input.resolutionStatus === AttendanceResolutionStatus.IN_PROGRESS) {
      if (!continuityResponsible || !nextStep || !dueDate) {
        throw new BadRequestException('Informe responsável, próximo passo e prazo da tratativa.');
      }
      const parsedDueDate = new Date(`${dueDate}T00:00:00.000Z`);
      if (
        Number.isNaN(parsedDueDate.getTime()) ||
        parsedDueDate.toISOString().slice(0, 10) !== dueDate
      ) {
        throw new BadRequestException('Informe um prazo válido para a tratativa.');
      }
      if (dueDate < this.currentInstitutionDate()) {
        throw new BadRequestException('O prazo da tratativa não pode estar no passado.');
      }
    }

    return {
      continuityResponsible:
        input.resolutionStatus === AttendanceResolutionStatus.IN_PROGRESS
          ? continuityResponsible
          : null,
      dueDate: input.resolutionStatus === AttendanceResolutionStatus.IN_PROGRESS ? dueDate : null,
      internalNotes,
      nextStep: input.resolutionStatus === AttendanceResolutionStatus.IN_PROGRESS ? nextStep : null,
      occurrence: input.occurrence,
      referral: input.resolutionStatus === AttendanceResolutionStatus.RESOLVED ? referral : null,
      resolutionStatus: input.resolutionStatus,
      solution: input.resolutionStatus === AttendanceResolutionStatus.RESOLVED ? solution : null,
      unresolvedReason:
        input.resolutionStatus === AttendanceResolutionStatus.UNRESOLVED ? unresolvedReason : null,
    };
  }

  private currentInstitutionDate(): string {
    const parts = new Intl.DateTimeFormat('en-US', {
      day: '2-digit',
      month: '2-digit',
      timeZone: this.institutionDateTime.timeZone,
      year: 'numeric',
    }).formatToParts(new Date());
    const part = (type: Intl.DateTimeFormatPartTypes) =>
      parts.find((candidate) => candidate.type === type)?.value;
    return `${part('year')}-${part('month')}-${part('day')}`;
  }

  private async listHistory(
    attendanceId: number,
    actorId: number,
    scope: AttendanceScope,
  ): Promise<ListAttendanceHistoryResponseDto> {
    const attendance = await this.attendanceModel.findByPk(attendanceId, {
      attributes: ['appointmentId', 'id'],
    });
    if (!attendance) throw new NotFoundException('Atendimento não encontrado.');
    const appointment = await this.appointmentModel.findByPk(attendance.appointmentId, {
      attributes: ['availabilityId'],
    });
    const availability = appointment
      ? await this.availabilityModel.unscoped().findByPk(appointment.availabilityId, {
          attributes: ['professorId'],
          paranoid: false,
        })
      : null;
    if (
      !appointment ||
      !availability ||
      (scope === 'professor' && availability.professorId !== actorId)
    ) {
      throw new NotFoundException('Atendimento não encontrado.');
    }

    const rows = await this.attendanceHistoryModel.findAll({
      order: [
        ['changedAt', 'ASC'],
        ['id', 'ASC'],
      ],
      where: { attendanceId },
    });
    const actors = await this.userModel.unscoped().findAll({
      attributes: ['id', 'name'],
      paranoid: false,
      where: { id: { [Op.in]: [...new Set(rows.map(({ createdBy }) => createdBy))] } },
    });
    const actorsById = new Map(actors.map(({ id, name }) => [id, { id, name }] as const));

    return {
      history: rows.flatMap((row) => {
        const actor = actorsById.get(row.createdBy);
        return actor
          ? [
              {
                actor,
                changedAt: row.changedAt.toISOString(),
                changeReason: row.changeReason,
                id: row.id,
                occurrence: row.occurrence,
                resolutionStatus: row.resolutionStatus,
              },
            ]
          : [];
      }),
    };
  }
}
