import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/sequelize';
import { randomBytes } from 'node:crypto';
import { Op, type Transaction, type WhereOptions } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import { InstitutionDateTimeService } from '../../helpers/institution-date-time/institution-date-time.service.js';
import { Appointment, AppointmentStatus } from '../../models/appointment.model.js';
import { AvailabilityModality } from '../../models/availability-modality.model.js';
import { Availability, AvailabilityState } from '../../models/availability.model.js';
import { SystemOptionItem } from '../../models/system-option-item.model.js';
import { User, UserType } from '../../models/user.model.js';
import type { AppointmentModality } from '../../types/appointment-modality.type.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import type { CreateAppointmentDto } from './dto/create-appointment.dto.js';
import type { CreateAppointmentResponseDto } from './dto/create-appointment-response.dto.js';
import type { ListAdminAppointmentsQueryDto } from './dto/list-admin-appointments.dto.js';
import type { ListAdminAppointmentsResponseDto } from './dto/list-admin-appointments-response.dto.js';
import type { ListAvailabilityQueryDto } from './dto/list-availability-query.dto.js';
import type {
  AvailableAppointmentWindowResponseDto,
  FreeIntervalResponseDto,
  ListAvailabilityResponseDto,
} from './dto/list-availability-response.dto.js';
import {
  OwnAppointmentsScope,
  type ListOwnAppointmentsQueryDto,
} from './dto/list-own-appointments.dto.js';
import type {
  ListOwnAppointmentsResponseDto,
  OwnAppointmentItemResponseDto,
} from './dto/list-own-appointments-response.dto.js';

type Interval = {
  endsAt: Date;
  startsAt: Date;
};

type PreparedAppointment = {
  details: string | null;
  endsAt: Date;
  startsAt: Date;
  subject: string;
};

type CommittedAppointment = {
  notification: {
    actorId: number;
    appointmentId: number;
    endsAt: Date;
    phone: string | null;
    professorName: string;
    protocol: string;
    startsAt: Date;
  } | null;
  response: CreateAppointmentResponseDto;
};

function addDateDays(value: string, amount: number): string {
  const date = new Date(`${value}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

@Injectable()
export class AppointmentsService {
  constructor(
    @InjectModel(Appointment) private readonly appointmentModel: typeof Appointment,
    @InjectModel(Availability) private readonly availabilityModel: typeof Availability,
    @InjectModel(AvailabilityModality)
    private readonly availabilityModalityModel: typeof AvailabilityModality,
    @InjectModel(SystemOptionItem)
    private readonly systemOptionItemModel: typeof SystemOptionItem,
    @InjectModel(User) private readonly userModel: typeof User,
    @InjectConnection() private readonly sequelize: Sequelize,
    private readonly institutionDateTime: InstitutionDateTimeService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(
    input: CreateAppointmentDto,
    requesterId: number,
  ): Promise<CreateAppointmentResponseDto> {
    const prepared = this.prepareAppointment(input);
    const committed = await this.sequelize.transaction((transaction) =>
      this.createInTransaction(input, prepared, requesterId, transaction),
    );

    if (committed.notification) {
      try {
        await this.notificationsService.attemptAppointmentConfirmation(committed.notification);
      } catch {
        // A tentativa já foi registrada pelo módulo de notificações. A reserva está confirmada.
      }
    }

    return committed.response;
  }

  async listAvailability(query: ListAvailabilityQueryDto): Promise<ListAvailabilityResponseDto> {
    const rangeStart = this.institutionDateTime.localToUtc(query.from, '00:00');
    const rangeEnd = this.institutionDateTime.localToUtc(addDateDays(query.to, 1), '00:00');

    if (rangeEnd <= rangeStart) {
      throw new BadRequestException('A data final deve ser igual ou posterior à data inicial.');
    }

    const now = new Date();
    const searchStart = rangeStart > now ? rangeStart : now;
    const availabilities = await this.availabilityModel.findAll({
      order: [
        ['startsAt', 'ASC'],
        ['id', 'ASC'],
      ],
      where: {
        endsAt: { [Op.gt]: searchStart },
        startsAt: { [Op.lt]: rangeEnd },
        state: AvailabilityState.ACTIVE,
      },
    });
    const availabilityIds = availabilities.map(({ id }) => id);

    if (availabilityIds.length === 0) {
      return { availabilities: [], range: { from: query.from, to: query.to } };
    }

    const [links, appointments] = await Promise.all([
      this.availabilityModalityModel.findAll({
        attributes: ['availabilityId', 'modalityOptionItemId'],
        where: { availabilityId: { [Op.in]: availabilityIds } },
      }),
      this.appointmentModel.findAll({
        attributes: ['availabilityId', 'endsAt', 'startsAt'],
        order: [['startsAt', 'ASC']],
        where: {
          availabilityId: { [Op.in]: availabilityIds },
          endsAt: { [Op.gt]: searchStart },
          startsAt: { [Op.lt]: rangeEnd },
          status: AppointmentStatus.CONFIRMED,
        },
      }),
    ]);
    const optionItems = await this.systemOptionItemModel.findAll({
      attributes: ['id', 'value'],
      where: { id: { [Op.in]: links.map(({ modalityOptionItemId }) => modalityOptionItemId) } },
    });
    const modalityByItemId = new Map(
      optionItems.map(({ id, value }) => [id, value as AppointmentModality] as const),
    );
    const modalitiesByAvailability = new Map<number, AppointmentModality[]>();

    for (const link of links) {
      const modality = modalityByItemId.get(link.modalityOptionItemId);
      if (!modality) continue;

      const current = modalitiesByAvailability.get(link.availabilityId) ?? [];
      current.push(modality);
      modalitiesByAvailability.set(link.availabilityId, current);
    }

    const matchingAvailabilities = availabilities.filter((availability) => {
      const modalities = modalitiesByAvailability.get(availability.id) ?? [];
      return !query.modality || modalities.includes(query.modality);
    });
    const professorIds = [...new Set(matchingAvailabilities.map(({ professorId }) => professorId))];
    const professors = await this.userModel.findAll({
      attributes: ['id', 'name'],
      where: {
        id: { [Op.in]: professorIds },
        isActive: true,
        userType: UserType.PROFESSOR,
      },
    });
    const professorsById = new Map(professors.map(({ id, name }) => [id, { id, name }] as const));
    const appointmentsByAvailability = new Map<number, Interval[]>();

    for (const appointment of appointments) {
      const current = appointmentsByAvailability.get(appointment.availabilityId) ?? [];
      current.push({ endsAt: appointment.endsAt, startsAt: appointment.startsAt });
      appointmentsByAvailability.set(appointment.availabilityId, current);
    }

    const response: AvailableAppointmentWindowResponseDto[] = [];
    for (const availability of matchingAvailabilities) {
      const professor = professorsById.get(availability.professorId);
      if (!professor) continue;

      const freeIntervals = this.subtractOccupiedIntervals(
        {
          endsAt: availability.endsAt < rangeEnd ? availability.endsAt : rangeEnd,
          startsAt: availability.startsAt > searchStart ? availability.startsAt : searchStart,
        },
        appointmentsByAvailability.get(availability.id) ?? [],
      );
      if (freeIntervals.length === 0) continue;

      response.push({
        endsAt: availability.endsAt.toISOString(),
        freeIntervals,
        id: availability.id,
        modalities: modalitiesByAvailability.get(availability.id) ?? [],
        professor,
        startsAt: availability.startsAt.toISOString(),
      });
    }

    return { availabilities: response, range: { from: query.from, to: query.to } };
  }

  async listMine(
    query: ListOwnAppointmentsQueryDto,
    requesterId: number,
  ): Promise<ListOwnAppointmentsResponseDto> {
    const hasRange = Boolean(query.from || query.to);
    if (hasRange && (!query.from || !query.to)) {
      throw new BadRequestException('Informe as datas inicial e final da consulta.');
    }
    if (hasRange && query.scope) {
      throw new BadRequestException('Use o período ou o escopo, não ambos.');
    }

    const conditions: WhereOptions[] = [{ studentId: requesterId }];
    let range: { from: string; to: string } | undefined;

    if (query.from && query.to) {
      const rangeStart = this.institutionDateTime.localToUtc(query.from, '00:00');
      const rangeEnd = this.institutionDateTime.localToUtc(addDateDays(query.to, 1), '00:00');
      const rangeDays = (rangeEnd.getTime() - rangeStart.getTime()) / 86_400_000;
      if (rangeEnd <= rangeStart) {
        throw new BadRequestException('A data final deve ser igual ou posterior à data inicial.');
      }
      if (rangeDays > 62) {
        throw new BadRequestException('O período da consulta deve ter no máximo 62 dias.');
      }
      conditions.push({ endsAt: { [Op.gt]: rangeStart }, startsAt: { [Op.lt]: rangeEnd } });
      range = { from: query.from, to: query.to };
    } else {
      const scope = query.scope ?? OwnAppointmentsScope.UPCOMING;
      const now = new Date();
      conditions.push(
        scope === OwnAppointmentsScope.UPCOMING
          ? { startsAt: { [Op.gte]: now }, status: AppointmentStatus.CONFIRMED }
          : {
              [Op.or]: [
                { startsAt: { [Op.lt]: now } },
                { status: { [Op.ne]: AppointmentStatus.CONFIRMED } },
              ],
            },
      );
    }

    if (query.status) conditions.push({ status: query.status });
    if (query.modality) {
      const modalityItems = await this.systemOptionItemModel.findAll({
        attributes: ['id'],
        where: { value: query.modality },
      });
      conditions.push({
        modalityOptionItemId: { [Op.in]: modalityItems.map(({ id }) => id) },
      });
    }

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const orderDirection =
      query.from || (query.scope ?? OwnAppointmentsScope.UPCOMING) === OwnAppointmentsScope.UPCOMING
        ? 'ASC'
        : 'DESC';
    const result = await this.appointmentModel.findAndCountAll({
      attributes: [
        'availabilityId',
        'cancelledAt',
        'cancellationReason',
        'details',
        'endsAt',
        'id',
        'modalityOptionItemId',
        'protocol',
        'startsAt',
        'status',
        'subject',
      ],
      ...(range ? {} : { limit: pageSize, offset: (page - 1) * pageSize }),
      order: [
        ['startsAt', orderDirection],
        ['id', orderDirection],
      ],
      where: { [Op.and]: conditions },
    });
    const appointments = await this.mapOwnAppointments(result.rows);

    return {
      appointments,
      ...(range ? { range } : { page, pageSize }),
      total: result.count,
    };
  }

  private async mapOwnAppointments(
    appointments: Appointment[],
  ): Promise<OwnAppointmentItemResponseDto[]> {
    if (appointments.length === 0) return [];

    const availabilities = await this.availabilityModel.unscoped().findAll({
      attributes: ['id', 'professorId'],
      paranoid: false,
      where: { id: { [Op.in]: appointments.map(({ availabilityId }) => availabilityId) } },
    });
    const professorIdByAvailability = new Map(
      availabilities.map(({ id, professorId }) => [id, professorId] as const),
    );
    const [professors, modalityItems] = await Promise.all([
      this.userModel.unscoped().findAll({
        attributes: ['id', 'name'],
        paranoid: false,
        where: { id: { [Op.in]: availabilities.map(({ professorId }) => professorId) } },
      }),
      this.systemOptionItemModel.findAll({
        attributes: ['id', 'value'],
        where: {
          id: { [Op.in]: appointments.map(({ modalityOptionItemId }) => modalityOptionItemId) },
        },
      }),
    ]);
    const professorsById = new Map(professors.map(({ id, name }) => [id, { id, name }] as const));
    const modalityById = new Map(
      modalityItems.map(({ id, value }) => [id, value as AppointmentModality] as const),
    );

    return appointments.flatMap((appointment) => {
      const professorId = professorIdByAvailability.get(appointment.availabilityId);
      const professor = professorId ? professorsById.get(professorId) : undefined;
      const modality = modalityById.get(appointment.modalityOptionItemId);
      if (!professor || !modality) return [];

      return [
        {
          cancelledAt: appointment.cancelledAt?.toISOString() ?? null,
          cancellationReason: appointment.cancellationReason,
          details: appointment.details,
          endsAt: appointment.endsAt.toISOString(),
          id: appointment.id,
          modality,
          professor,
          protocol: appointment.protocol,
          startsAt: appointment.startsAt.toISOString(),
          status: appointment.status,
          subject: appointment.subject,
        },
      ];
    });
  }

  private prepareAppointment(input: CreateAppointmentDto): PreparedAppointment {
    const startsAt = new Date(input.startsAt);
    const endsAt = new Date(input.endsAt);

    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
      throw new BadRequestException('Informe um intervalo de atendimento válido.');
    }
    if (startsAt.getTime() <= Date.now()) {
      throw new BadRequestException('O horário de início deve estar no futuro.');
    }
    if (endsAt <= startsAt) {
      throw new BadRequestException('O término deve ser posterior ao início.');
    }

    return {
      details: input.details?.trim() || null,
      endsAt,
      startsAt,
      subject: input.subject.trim(),
    };
  }

  private async createInTransaction(
    input: CreateAppointmentDto,
    prepared: PreparedAppointment,
    requesterId: number,
    transaction: Transaction,
  ): Promise<CommittedAppointment> {
    const requester = await this.userModel.unscoped().findByPk(requesterId, {
      attributes: ['id', 'isActive', 'phone'],
      lock: transaction.LOCK.UPDATE,
      transaction,
    });

    if (!requester?.isActive) {
      throw new BadRequestException('Usuário inválido ou inativo.');
    }

    const availability = await this.availabilityModel.findByPk(input.availabilityId, {
      attributes: ['endsAt', 'id', 'professorId', 'startsAt', 'state'],
      lock: transaction.LOCK.UPDATE,
      transaction,
    });

    if (!availability || availability.state !== AvailabilityState.ACTIVE) {
      throw new ConflictException('A disponibilidade selecionada não está mais ativa.');
    }
    if (prepared.startsAt < availability.startsAt || prepared.endsAt > availability.endsAt) {
      throw new BadRequestException(
        'O atendimento deve estar integralmente dentro da disponibilidade selecionada.',
      );
    }

    const professor = await this.userModel.unscoped().findByPk(availability.professorId, {
      attributes: ['id', 'isActive', 'name', 'userType'],
      transaction,
    });
    if (!professor?.isActive || professor.userType !== UserType.PROFESSOR) {
      throw new ConflictException('O professor desta disponibilidade não está mais ativo.');
    }

    const modalityLinks = await this.availabilityModalityModel.findAll({
      attributes: ['modalityOptionItemId'],
      transaction,
      where: { availabilityId: availability.id },
    });
    const modalityItem = await this.systemOptionItemModel.findOne({
      attributes: ['id', 'value'],
      transaction,
      where: {
        id: { [Op.in]: modalityLinks.map(({ modalityOptionItemId }) => modalityOptionItemId) },
        value: input.modality,
      },
    });

    if (!modalityItem) {
      throw new BadRequestException(
        'A modalidade informada não é permitida nesta disponibilidade.',
      );
    }

    const availabilityConflict = await this.appointmentModel.findOne({
      attributes: ['id'],
      lock: transaction.LOCK.UPDATE,
      transaction,
      where: {
        availabilityId: availability.id,
        endsAt: { [Op.gt]: prepared.startsAt },
        startsAt: { [Op.lt]: prepared.endsAt },
        status: AppointmentStatus.CONFIRMED,
      },
    });
    if (availabilityConflict) {
      throw new ConflictException('Este horário acabou de ser reservado por outra pessoa.');
    }

    const requesterConflict = await this.appointmentModel.findOne({
      attributes: ['id'],
      lock: transaction.LOCK.UPDATE,
      transaction,
      where: {
        endsAt: { [Op.gt]: prepared.startsAt },
        startsAt: { [Op.lt]: prepared.endsAt },
        status: AppointmentStatus.CONFIRMED,
        studentId: requesterId,
      },
    });
    if (requesterConflict) {
      throw new ConflictException('Você já possui um agendamento nesse intervalo.');
    }

    const protocol = this.createProtocol();
    const appointment = await this.appointmentModel.create(
      {
        availabilityId: availability.id,
        createdBy: requesterId,
        details: prepared.details,
        endsAt: prepared.endsAt,
        modalityOptionItemId: modalityItem.id,
        protocol,
        startsAt: prepared.startsAt,
        status: AppointmentStatus.CONFIRMED,
        studentId: requesterId,
        subject: prepared.subject,
        updatedBy: requesterId,
      },
      { transaction },
    );

    return {
      notification: {
        actorId: requesterId,
        appointmentId: appointment.id,
        endsAt: prepared.endsAt,
        phone: requester.phone,
        professorName: professor.name,
        protocol,
        startsAt: prepared.startsAt,
      },
      response: {
        appointment: {
          details: prepared.details,
          endsAt: prepared.endsAt.toISOString(),
          id: appointment.id,
          modality: input.modality,
          professor: { id: professor.id, name: professor.name },
          protocol,
          startsAt: prepared.startsAt.toISOString(),
          status: AppointmentStatus.CONFIRMED,
          subject: prepared.subject,
        },
        message: 'Agendamento confirmado com sucesso.',
      },
    };
  }

  private createProtocol(): string {
    const date = new Date().toISOString().slice(0, 10).replaceAll('-', '');
    return `AG-${date}-${randomBytes(5).toString('hex').toUpperCase()}`;
  }

  async listAll(query: ListAdminAppointmentsQueryDto): Promise<ListAdminAppointmentsResponseDto> {
    const rangeStart = this.institutionDateTime.localToUtc(query.from, '00:00');
    const rangeEnd = this.institutionDateTime.localToUtc(addDateDays(query.to, 1), '00:00');

    if (rangeEnd <= rangeStart) {
      throw new BadRequestException('A data final deve ser igual ou posterior à data inicial.');
    }

    const appointments = await this.appointmentModel.findAll({
      attributes: [
        'availabilityId',
        'endsAt',
        'id',
        'modalityOptionItemId',
        'protocol',
        'startsAt',
        'status',
        'studentId',
        'subject',
      ],
      order: [
        ['startsAt', 'ASC'],
        ['id', 'ASC'],
      ],
      where: {
        endsAt: { [Op.gt]: rangeStart },
        startsAt: { [Op.lt]: rangeEnd },
        ...(query.status ? { status: query.status } : {}),
      },
    });

    if (appointments.length === 0) {
      return { appointments: [], range: { from: query.from, to: query.to } };
    }

    const availabilities = await this.availabilityModel.unscoped().findAll({
      attributes: ['id', 'professorId'],
      paranoid: false,
      where: {
        id: { [Op.in]: appointments.map(({ availabilityId }) => availabilityId) },
      },
    });
    const professorIdByAvailability = new Map(
      availabilities.map(({ id, professorId }) => [id, professorId] as const),
    );
    const userIds = [
      ...new Set([
        ...appointments.map(({ studentId }) => studentId),
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
          id: { [Op.in]: appointments.map(({ modalityOptionItemId }) => modalityOptionItemId) },
        },
      }),
    ]);
    const usersById = new Map(users.map(({ id, name }) => [id, { id, name }] as const));
    const modalityById = new Map(
      modalityItems.map(({ id, value }) => [id, value as AppointmentModality] as const),
    );
    const items = appointments.flatMap((appointment) => {
      const professorId = professorIdByAvailability.get(appointment.availabilityId);
      const professor = professorId ? usersById.get(professorId) : undefined;
      const student = usersById.get(appointment.studentId);
      const modality = modalityById.get(appointment.modalityOptionItemId);
      if (!professor || !student || !modality) return [];

      return [
        {
          endsAt: appointment.endsAt.toISOString(),
          id: appointment.id,
          modality,
          professor,
          protocol: appointment.protocol,
          startsAt: appointment.startsAt.toISOString(),
          status: appointment.status,
          student,
          subject: appointment.subject,
        },
      ];
    });

    return { appointments: items, range: { from: query.from, to: query.to } };
  }

  private subtractOccupiedIntervals(
    window: Interval,
    occupied: Interval[],
  ): FreeIntervalResponseDto[] {
    const result: FreeIntervalResponseDto[] = [];
    let cursor = window.startsAt.getTime();
    const windowEnd = window.endsAt.getTime();

    for (const interval of [...occupied].sort(
      (first, second) => first.startsAt.getTime() - second.startsAt.getTime(),
    )) {
      const occupiedStart = Math.max(interval.startsAt.getTime(), cursor);
      const occupiedEnd = Math.min(interval.endsAt.getTime(), windowEnd);

      if (occupiedEnd <= cursor || occupiedStart >= windowEnd) continue;
      if (occupiedStart > cursor) {
        result.push({
          endsAt: new Date(occupiedStart).toISOString(),
          startsAt: new Date(cursor).toISOString(),
        });
      }
      cursor = Math.max(cursor, occupiedEnd);
      if (cursor >= windowEnd) break;
    }

    if (cursor < windowEnd) {
      result.push({
        endsAt: new Date(windowEnd).toISOString(),
        startsAt: new Date(cursor).toISOString(),
      });
    }

    return result;
  }
}
