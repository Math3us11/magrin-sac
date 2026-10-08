import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/sequelize';
import { Op, type Transaction } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import { InstitutionDateTimeService } from '../../helpers/institution-date-time/institution-date-time.service.js';
import { AvailabilityModality } from '../../models/availability-modality.model.js';
import { Availability, AvailabilityState } from '../../models/availability.model.js';
import { SystemOptionItem } from '../../models/system-option-item.model.js';
import { SystemOption } from '../../models/system-option.model.js';
import { User, UserType } from '../../models/user.model.js';
import { AppointmentModality } from '../../types/appointment-modality.type.js';
import type {
  AvailabilityItemResponseDto,
  CreateAvailabilityResponseDto,
  ListOwnAvailabilityResponseDto,
} from './dto/availability-response.dto.js';
import type { CreateAvailabilityBatchDto } from './dto/create-availability.dto.js';
import type { ListAdminAvailabilityQueryDto } from './dto/list-admin-availability.dto.js';
import type { ListAdminAvailabilityResponseDto } from './dto/list-admin-availability-response.dto.js';

const MODALITY_OPTION = 'APPOINTMENT_MODALITY';

type PreparedAvailability = {
  endsAt: Date;
  modalities: AppointmentModality[];
  startsAt: Date;
};

@Injectable()
export class AvailabilityService {
  constructor(
    @InjectModel(Availability) private readonly availabilityModel: typeof Availability,
    @InjectModel(AvailabilityModality)
    private readonly availabilityModalityModel: typeof AvailabilityModality,
    @InjectModel(SystemOption) private readonly systemOptionModel: typeof SystemOption,
    @InjectModel(SystemOptionItem)
    private readonly systemOptionItemModel: typeof SystemOptionItem,
    @InjectModel(User) private readonly userModel: typeof User,
    @InjectConnection() private readonly sequelize: Sequelize,
    private readonly institutionDateTime: InstitutionDateTimeService,
  ) {}

  async createBatch(
    input: CreateAvailabilityBatchDto,
    professorId: number,
  ): Promise<CreateAvailabilityResponseDto> {
    const prepared = this.prepareBatch(input);

    return this.sequelize.transaction(async (transaction) => {
      await this.lockAndValidateProfessor(professorId, transaction);
      const modalityItems = await this.getModalityItems(transaction);
      await this.assertNoPersistedConflicts(prepared, professorId, transaction);

      const created: Availability[] = [];
      for (const { endsAt, startsAt } of prepared) {
        created.push(
          await this.availabilityModel.create(
            {
              createdBy: professorId,
              endsAt,
              professorId,
              startsAt,
              state: AvailabilityState.ACTIVE,
              updatedBy: professorId,
            },
            { transaction },
          ),
        );
      }
      const modalityLinks = created.flatMap((availability, index) => {
        const item = prepared[index];

        if (!item) throw new Error('Disponibilidade criada sem item de origem.');

        return item.modalities.map((modality) => ({
          availabilityId: availability.id,
          createdBy: professorId,
          modalityOptionItemId: modalityItems.get(modality) as number,
          updatedBy: professorId,
        }));
      });

      await this.availabilityModalityModel.bulkCreate(modalityLinks, { transaction });

      return {
        availabilities: created.map((availability, index) =>
          this.toResponse(availability, prepared[index]?.modalities ?? []),
        ),
        message:
          created.length === 1
            ? 'Disponibilidade publicada com sucesso.'
            : `${created.length} disponibilidades publicadas com sucesso.`,
      };
    });
  }

  async listOwn(professorId: number): Promise<ListOwnAvailabilityResponseDto> {
    const availabilities = await this.availabilityModel.findAll({
      order: [
        ['startsAt', 'ASC'],
        ['id', 'ASC'],
      ],
      where: {
        endsAt: { [Op.gt]: new Date() },
        professorId,
        state: { [Op.ne]: AvailabilityState.CANCELLED },
      },
    });
    const modalityMap = await this.getModalitiesByAvailability(availabilities.map(({ id }) => id));
    const available = availabilities.filter(
      ({ state }) => state === AvailabilityState.ACTIVE,
    ).length;
    const blocked = availabilities.filter(
      ({ state }) => state === AvailabilityState.BLOCKED,
    ).length;

    return {
      availabilities: availabilities.map((availability) =>
        this.toResponse(availability, modalityMap.get(availability.id) ?? []),
      ),
      summary: { available, blocked, reserved: 0 },
    };
  }

  async listAll(query: ListAdminAvailabilityQueryDto): Promise<ListAdminAvailabilityResponseDto> {
    const rangeStart = this.institutionDateTime.localToUtc(query.from, '00:00');
    const rangeEnd = this.institutionDateTime.localToUtc(this.addDateDays(query.to, 1), '00:00');

    if (rangeEnd <= rangeStart) {
      throw new BadRequestException('A data final deve ser igual ou posterior à data inicial.');
    }

    const availabilities = await this.availabilityModel.findAll({
      order: [
        ['startsAt', 'ASC'],
        ['id', 'ASC'],
      ],
      where: {
        endsAt: { [Op.gt]: rangeStart },
        startsAt: { [Op.lt]: rangeEnd },
        ...(query.state ? { state: query.state } : {}),
      },
    });
    const modalityMap = await this.getModalitiesByAvailability(availabilities.map(({ id }) => id));
    const filtered = availabilities.filter(
      ({ id }) => !query.modality || (modalityMap.get(id) ?? []).includes(query.modality),
    );
    const professorIds = [...new Set(filtered.map(({ professorId }) => professorId))];
    const professors = await this.userModel.unscoped().findAll({
      attributes: ['id', 'isActive', 'name'],
      paranoid: false,
      where: { id: { [Op.in]: professorIds }, userType: UserType.PROFESSOR },
    });
    const professorsById = new Map(
      professors.map(({ id, isActive, name }) => [id, { id, isActive, name }] as const),
    );
    const items = filtered.flatMap((availability) => {
      const professor = professorsById.get(availability.professorId);
      if (!professor) return [];

      return [
        {
          endsAt: availability.endsAt.toISOString(),
          id: availability.id,
          modalities: modalityMap.get(availability.id) ?? [],
          professor,
          startsAt: availability.startsAt.toISOString(),
          state: availability.state,
        },
      ];
    });

    return {
      availabilities: items,
      range: { from: query.from, to: query.to },
      summary: {
        active: items.filter(({ state }) => state === AvailabilityState.ACTIVE).length,
        blocked: items.filter(({ state }) => state === AvailabilityState.BLOCKED).length,
        cancelled: items.filter(({ state }) => state === AvailabilityState.CANCELLED).length,
      },
    };
  }

  private prepareBatch(input: CreateAvailabilityBatchDto): PreparedAvailability[] {
    const now = Date.now();
    const prepared = input.items
      .map((item) => ({
        endsAt: this.institutionDateTime.localToUtc(item.date, item.endTime),
        modalities: item.modalities,
        startsAt: this.institutionDateTime.localToUtc(item.date, item.startTime),
      }))
      .sort((first, second) => first.startsAt.getTime() - second.startsAt.getTime());

    for (const [index, item] of prepared.entries()) {
      if (item.startsAt.getTime() <= now) {
        throw new BadRequestException('O horário de início deve estar no futuro.');
      }
      if (item.endsAt.getTime() <= item.startsAt.getTime()) {
        throw new BadRequestException('O término deve ser posterior ao início.');
      }

      const previous = prepared[index - 1];
      if (previous && item.startsAt < previous.endsAt) {
        throw new ConflictException('Existem horários conflitantes no lote informado.');
      }
    }

    return prepared;
  }

  private addDateDays(value: string, amount: number): string {
    const date = new Date(`${value}T12:00:00.000Z`);
    date.setUTCDate(date.getUTCDate() + amount);
    return date.toISOString().slice(0, 10);
  }

  private async lockAndValidateProfessor(
    professorId: number,
    transaction: Transaction,
  ): Promise<void> {
    const professor = await this.userModel.unscoped().findByPk(professorId, {
      attributes: ['id', 'isActive', 'userType'],
      lock: transaction.LOCK.UPDATE,
      transaction,
    });

    if (!professor?.isActive || professor.userType !== UserType.PROFESSOR) {
      throw new BadRequestException('Professor inválido ou inativo.');
    }
  }

  private async getModalityItems(
    transaction?: Transaction,
  ): Promise<Map<AppointmentModality, number>> {
    const option = await this.systemOptionModel.findOne({
      attributes: ['id'],
      transaction,
      where: { name: MODALITY_OPTION },
    });

    if (!option) throw new Error('Opção de modalidades não configurada.');

    const items = await this.systemOptionItemModel.findAll({
      attributes: ['id', 'value'],
      transaction,
      where: {
        optionId: option.id,
        value: { [Op.in]: Object.values(AppointmentModality) },
      },
    });
    const result = new Map(
      items.map(({ id, value }) => [value as AppointmentModality, id] as const),
    );

    if (result.size !== Object.values(AppointmentModality).length) {
      throw new Error('Catálogo de modalidades incompleto.');
    }

    return result;
  }

  private async assertNoPersistedConflicts(
    prepared: PreparedAvailability[],
    professorId: number,
    transaction: Transaction,
  ): Promise<void> {
    const first = prepared[0];
    const last = prepared[prepared.length - 1];

    if (!first || !last) throw new BadRequestException('Informe pelo menos uma disponibilidade.');

    const existing = await this.availabilityModel.findAll({
      attributes: ['endsAt', 'id', 'startsAt'],
      transaction,
      where: {
        endsAt: { [Op.gt]: first.startsAt },
        professorId,
        startsAt: { [Op.lt]: last.endsAt },
        state: { [Op.ne]: AvailabilityState.CANCELLED },
      },
    });
    const hasConflict = prepared.some((candidate) =>
      existing.some(
        (availability) =>
          candidate.startsAt < availability.endsAt && candidate.endsAt > availability.startsAt,
      ),
    );

    if (hasConflict) {
      throw new ConflictException('Um ou mais horários conflitam com disponibilidades publicadas.');
    }
  }

  private async getModalitiesByAvailability(
    availabilityIds: number[],
  ): Promise<Map<number, AppointmentModality[]>> {
    const result = new Map<number, AppointmentModality[]>();
    if (availabilityIds.length === 0) return result;

    const links = await this.availabilityModalityModel.findAll({
      attributes: ['availabilityId', 'modalityOptionItemId'],
      where: { availabilityId: { [Op.in]: availabilityIds } },
    });
    const optionItems = await this.systemOptionItemModel.findAll({
      attributes: ['id', 'value'],
      where: {
        id: { [Op.in]: links.map(({ modalityOptionItemId }) => modalityOptionItemId) },
      },
    });
    const valuesById = new Map(
      optionItems.map(({ id, value }) => [id, value as AppointmentModality] as const),
    );

    for (const link of links) {
      const value = valuesById.get(link.modalityOptionItemId);
      if (!value) continue;

      const modalities = result.get(link.availabilityId) ?? [];
      modalities.push(value);
      result.set(link.availabilityId, modalities);
    }

    return result;
  }

  private toResponse(
    availability: Availability,
    modalities: AppointmentModality[],
  ): AvailabilityItemResponseDto {
    return {
      endsAt: availability.endsAt.toISOString(),
      id: availability.id,
      modalities,
      startsAt: availability.startsAt.toISOString(),
      state: availability.state,
    };
  }
}
