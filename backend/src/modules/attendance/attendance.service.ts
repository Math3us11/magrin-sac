import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/sequelize';
import { Op, type Transaction, type WhereOptions } from 'sequelize';
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
import { SystemOptionItem } from '../../models/system-option-item.model.js';
import { User } from '../../models/user.model.js';
import type { AppointmentModality } from '../../types/appointment-modality.type.js';
import type { AttendanceDetailResponseDto } from './dto/attendance-detail-response.dto.js';
import type { ListAttendanceHistoryResponseDto } from './dto/list-attendance-history-response.dto.js';
import type { ListAttendancesQueryDto } from './dto/list-attendances.dto.js';
import type {
  AttendanceListItemResponseDto,
  ListAttendancesResponseDto,
} from './dto/list-attendances-response.dto.js';
import type { RegisterAttendanceResponseDto } from './dto/register-attendance-response.dto.js';
import type { RegisterAttendanceDto } from './dto/register-attendance.dto.js';
import type { UpdateAttendanceStatusDto } from './dto/update-attendance-status.dto.js';
import type { UpdateAttendanceStatusResponseDto } from './dto/update-attendance-status-response.dto.js';

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

type PreparedTransition = Omit<PreparedAttendance, 'occurrence' | 'resolutionStatus'> & {
  resolutionStatus: AttendanceResolutionStatus;
};

const MAX_ATTENDANCE_RANGE_DAYS = 366;

function addDateDays(value: string, amount: number): string {
  const date = new Date(`${value}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

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
    @InjectModel(SystemOptionItem)
    private readonly systemOptionItemModel: typeof SystemOptionItem,
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

  listAssigned(
    query: ListAttendancesQueryDto,
    actorId: number,
  ): Promise<ListAttendancesResponseDto> {
    return this.list(query, actorId, 'professor');
  }

  listAny(query: ListAttendancesQueryDto): Promise<ListAttendancesResponseDto> {
    return this.list(query, 0, 'admin');
  }

  getAssigned(attendanceId: number, actorId: number): Promise<AttendanceDetailResponseDto> {
    return this.getDetail(attendanceId, actorId, 'professor');
  }

  getAny(attendanceId: number, actorId: number): Promise<AttendanceDetailResponseDto> {
    return this.getDetail(attendanceId, actorId, 'admin');
  }

  updateAssignedStatus(
    attendanceId: number,
    input: UpdateAttendanceStatusDto,
    actorId: number,
  ): Promise<UpdateAttendanceStatusResponseDto> {
    return this.updateStatus(attendanceId, input, actorId, 'professor');
  }

  updateAnyStatus(
    attendanceId: number,
    input: UpdateAttendanceStatusDto,
    actorId: number,
  ): Promise<UpdateAttendanceStatusResponseDto> {
    return this.updateStatus(attendanceId, input, actorId, 'admin');
  }

  private async list(
    query: ListAttendancesQueryDto,
    actorId: number,
    scope: AttendanceScope,
  ): Promise<ListAttendancesResponseDto> {
    const rangeStart = this.institutionDateTime.localToUtc(query.from, '00:00');
    const rangeEnd = this.institutionDateTime.localToUtc(addDateDays(query.to, 1), '00:00');

    if (rangeEnd <= rangeStart) {
      throw new BadRequestException('A data final deve ser igual ou posterior à data inicial.');
    }
    if ((rangeEnd.getTime() - rangeStart.getTime()) / 86_400_000 > MAX_ATTENDANCE_RANGE_DAYS) {
      throw new BadRequestException('O período da consulta deve ter no máximo 366 dias.');
    }

    let assignedAvailabilityIds: number[] | undefined;
    if (scope === 'professor') {
      const assignedAvailabilities = await this.availabilityModel.unscoped().findAll({
        attributes: ['id'],
        paranoid: false,
        where: { professorId: actorId },
      });
      assignedAvailabilityIds = assignedAvailabilities.map(({ id }) => id);
      if (assignedAvailabilityIds.length === 0) {
        return { attendances: [], range: { from: query.from, to: query.to } };
      }
    }

    const appointments = await this.appointmentModel.findAll({
      attributes: [
        'availabilityId',
        'endsAt',
        'id',
        'modalityOptionItemId',
        'protocol',
        'startsAt',
        'studentId',
        'subject',
      ],
      where: {
        ...(assignedAvailabilityIds
          ? { availabilityId: { [Op.in]: assignedAvailabilityIds } }
          : {}),
        endsAt: { [Op.gt]: rangeStart },
        startsAt: { [Op.lt]: rangeEnd },
      },
    });
    if (appointments.length === 0) {
      return { attendances: [], range: { from: query.from, to: query.to } };
    }

    const attendanceWhere: WhereOptions = {
      appointmentId: { [Op.in]: appointments.map(({ id }) => id) },
      ...(query.occurrence ? { occurrence: query.occurrence } : {}),
      ...(query.resolutionStatus ? { resolutionStatus: query.resolutionStatus } : {}),
    };
    const attendances = await this.attendanceModel.findAll({
      attributes: [
        'appointmentId',
        'continuityResponsible',
        'dueDate',
        'id',
        'occurrence',
        'recordedAt',
        'resolutionStatus',
        'updatedAt',
      ],
      where: attendanceWhere,
    });
    if (attendances.length === 0) {
      return { attendances: [], range: { from: query.from, to: query.to } };
    }

    const attendanceAppointmentIds = new Set(attendances.map(({ appointmentId }) => appointmentId));
    const matchingAppointments = appointments.filter(({ id }) => attendanceAppointmentIds.has(id));
    const availabilities = await this.availabilityModel.unscoped().findAll({
      attributes: ['id', 'professorId'],
      paranoid: false,
      where: {
        id: { [Op.in]: matchingAppointments.map(({ availabilityId }) => availabilityId) },
      },
    });
    const professorIdByAvailability = new Map(
      availabilities.map(({ id, professorId }) => [id, professorId] as const),
    );
    const userIds = [
      ...new Set([
        ...matchingAppointments.map(({ studentId }) => studentId),
        ...availabilities.map(({ professorId }) => professorId),
      ]),
    ];
    const [users, modalityItems] = await Promise.all([
      this.userModel.unscoped().findAll({
        attributes: ['id', 'name'],
        paranoid: false,
        where: { id: { [Op.in]: userIds } },
      }),
      this.systemOptionItemModel.findAll({
        attributes: ['id', 'value'],
        where: {
          id: {
            [Op.in]: matchingAppointments.map(({ modalityOptionItemId }) => modalityOptionItemId),
          },
        },
      }),
    ]);
    const usersById = new Map(users.map(({ id, name }) => [id, { id, name }] as const));
    const modalityById = new Map(
      modalityItems.map(({ id, value }) => [id, value as AppointmentModality] as const),
    );
    const appointmentById = new Map(matchingAppointments.map((row) => [row.id, row] as const));

    const items = attendances.flatMap<AttendanceListItemResponseDto>((attendance) => {
      const appointment = appointmentById.get(attendance.appointmentId);
      if (!appointment) return [];
      const professorId = professorIdByAvailability.get(appointment.availabilityId);
      const professor = professorId ? usersById.get(professorId) : undefined;
      const student = usersById.get(appointment.studentId);
      const modality = modalityById.get(appointment.modalityOptionItemId);
      if (!professor || !student || !modality) return [];

      return [
        {
          appointment: {
            endsAt: appointment.endsAt.toISOString(),
            id: appointment.id,
            modality,
            professor,
            protocol: appointment.protocol,
            startsAt: appointment.startsAt.toISOString(),
            student,
            subject: appointment.subject,
          },
          continuityResponsible: attendance.continuityResponsible,
          dueDate: attendance.dueDate,
          id: attendance.id,
          occurrence: attendance.occurrence,
          recordedAt: attendance.recordedAt.toISOString(),
          resolutionStatus: attendance.resolutionStatus,
          updatedAt: attendance.updatedAt.toISOString(),
        },
      ];
    });
    items.sort(
      (first, second) =>
        new Date(second.appointment.startsAt).getTime() -
          new Date(first.appointment.startsAt).getTime() || second.id - first.id,
    );

    return { attendances: items, range: { from: query.from, to: query.to } };
  }

  private async getDetail(
    attendanceId: number,
    actorId: number,
    scope: AttendanceScope,
  ): Promise<AttendanceDetailResponseDto> {
    const context = await this.loadAuthorizedAttendance(attendanceId, actorId, scope);
    const [student, professor, modality, updatedBy, history] = await Promise.all([
      this.userModel.unscoped().findByPk(context.appointment.studentId, {
        attributes: ['id', 'name'],
        paranoid: false,
      }),
      this.userModel.unscoped().findByPk(context.availability.professorId, {
        attributes: ['id', 'name'],
        paranoid: false,
      }),
      this.systemOptionItemModel.findByPk(context.appointment.modalityOptionItemId, {
        attributes: ['id', 'value'],
      }),
      this.userModel.unscoped().findByPk(context.attendance.updatedBy, {
        attributes: ['id', 'name'],
        paranoid: false,
      }),
      this.listHistory(attendanceId, actorId, scope),
    ]);
    if (!student || !professor || !modality || !updatedBy) {
      throw new NotFoundException('Atendimento não encontrado.');
    }

    return {
      attendance: {
        appointment: {
          details: context.appointment.details,
          endsAt: context.appointment.endsAt.toISOString(),
          id: context.appointment.id,
          modality: modality.value as AppointmentModality,
          professor: { id: professor.id, name: professor.name },
          protocol: context.appointment.protocol,
          startsAt: context.appointment.startsAt.toISOString(),
          student: { id: student.id, name: student.name },
          subject: context.appointment.subject,
        },
        continuityResponsible: context.attendance.continuityResponsible,
        dueDate: context.attendance.dueDate,
        id: context.attendance.id,
        internalNotes: context.attendance.internalNotes,
        nextStep: context.attendance.nextStep,
        occurrence: context.attendance.occurrence,
        recordedAt: context.attendance.recordedAt.toISOString(),
        referral: context.attendance.referral,
        resolutionStatus: context.attendance.resolutionStatus,
        solution: context.attendance.solution,
        unresolvedReason: context.attendance.unresolvedReason,
        updatedAt: context.attendance.updatedAt.toISOString(),
        updatedBy: { id: updatedBy.id, name: updatedBy.name },
      },
      history: history.history,
    };
  }

  private async loadAuthorizedAttendance(
    attendanceId: number,
    actorId: number,
    scope: AttendanceScope,
  ): Promise<{ attendance: Attendance; appointment: Appointment; availability: Availability }> {
    const attendance = await this.attendanceModel.findByPk(attendanceId);
    if (!attendance) throw new NotFoundException('Atendimento não encontrado.');
    const appointment = await this.appointmentModel.findByPk(attendance.appointmentId, {
      attributes: [
        'availabilityId',
        'details',
        'endsAt',
        'id',
        'modalityOptionItemId',
        'protocol',
        'startsAt',
        'studentId',
        'subject',
      ],
    });
    const availability = appointment
      ? await this.availabilityModel.unscoped().findByPk(appointment.availabilityId, {
          attributes: ['id', 'professorId'],
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
    return { attendance, appointment, availability };
  }

  private async updateStatus(
    attendanceId: number,
    input: UpdateAttendanceStatusDto,
    actorId: number,
    scope: AttendanceScope,
  ): Promise<UpdateAttendanceStatusResponseDto> {
    const changeReason = input.changeReason.trim();
    if (!changeReason) throw new BadRequestException('Informe o motivo da alteração.');

    const reference = await this.attendanceModel.findByPk(attendanceId, {
      attributes: ['appointmentId'],
    });
    if (!reference) throw new NotFoundException('Atendimento não encontrado.');
    const appointmentReference = await this.appointmentModel.findByPk(reference.appointmentId, {
      attributes: ['availabilityId'],
    });
    if (!appointmentReference) throw new NotFoundException('Atendimento não encontrado.');

    return this.sequelize.transaction(async (transaction) => {
      const appointment = await this.lockAuthorizedAppointment(
        reference.appointmentId,
        appointmentReference.availabilityId,
        actorId,
        scope,
        transaction,
      );
      if (appointment.status !== AppointmentStatus.COMPLETED) {
        throw new ConflictException('O agendamento não possui um atendimento realizado válido.');
      }
      const attendance = await this.attendanceModel.findByPk(attendanceId, {
        lock: transaction.LOCK.UPDATE,
        transaction,
      });
      if (!attendance || attendance.appointmentId !== reference.appointmentId) {
        throw new NotFoundException('Atendimento não encontrado.');
      }
      if (attendance.occurrence !== AttendanceOccurrence.HELD) {
        throw new ConflictException('Uma ausência não possui tratativa para atualização.');
      }
      if (attendance.resolutionStatus !== AttendanceResolutionStatus.IN_PROGRESS) {
        throw new ConflictException(
          'A classificação final deste atendimento não pode ser reaberta.',
        );
      }

      const prepared = this.prepareTransition(input, attendance.internalNotes);
      const changedAt = new Date();
      await attendance.update(
        { ...prepared, updatedBy: actorId },
        {
          fields: [
            'continuityResponsible',
            'dueDate',
            'internalNotes',
            'nextStep',
            'referral',
            'resolutionStatus',
            'solution',
            'unresolvedReason',
            'updatedBy',
          ],
          transaction,
        },
      );
      await this.attendanceHistoryModel.create(
        {
          attendanceId,
          changedAt,
          changeReason,
          createdBy: actorId,
          occurrence: AttendanceOccurrence.HELD,
          resolutionStatus: prepared.resolutionStatus,
        },
        { transaction },
      );

      return {
        attendance: {
          id: attendance.id,
          resolutionStatus: prepared.resolutionStatus,
          updatedAt: changedAt.toISOString(),
          updatedBy: actorId,
        },
        message:
          prepared.resolutionStatus === AttendanceResolutionStatus.IN_PROGRESS
            ? 'Tratativa atualizada com sucesso.'
            : 'Atendimento finalizado com sucesso.',
      };
    });
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

  private prepareTransition(
    input: UpdateAttendanceStatusDto,
    currentInternalNotes: string | null,
  ): PreparedTransition {
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
      internalNotes:
        input.internalNotes === undefined ? currentInternalNotes : textOrNull(input.internalNotes),
      nextStep: input.resolutionStatus === AttendanceResolutionStatus.IN_PROGRESS ? nextStep : null,
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
