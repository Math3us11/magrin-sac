import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op, type Transaction, type WhereOptions } from 'sequelize';
import { InstitutionDateTimeService } from '../../helpers/institution-date-time/institution-date-time.service.js';
import { AuditAction, AuditEntityType, AuditLog } from '../../models/audit-log.model.js';
import { User } from '../../models/user.model.js';
import type { ListAuditLogsQueryDto } from './dto/list-audit-logs.dto.js';
import type {
  AuditChanges,
  AuditValue,
  ListAuditLogsResponseDto,
} from './dto/list-audit-logs-response.dto.js';

const MAX_RANGE_DAYS = 62;

export type AuditEntry = {
  action: AuditAction;
  actorId: number | null;
  changes?: AuditChanges | null;
  entityId: number;
  entityType: AuditEntityType;
  reason?: string | null;
};

type DiffOptions = {
  fields: readonly string[];
  // Campos registrados apenas como alterados, sem valores, para não replicar dados pessoais.
  redacted?: readonly string[];
};

function toAuditValue(value: unknown): AuditValue {
  if (value === undefined || value === null) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'boolean' || typeof value === 'number' || typeof value === 'string') {
    return value;
  }
  return JSON.stringify(value);
}

export function diffAuditFields(
  before: Record<string, unknown> | null,
  after: Record<string, unknown>,
  { fields, redacted = [] }: DiffOptions,
): AuditChanges {
  const changes: AuditChanges = {};

  for (const field of [...fields, ...redacted]) {
    const from = before ? toAuditValue(before[field]) : null;
    const to = toAuditValue(after[field]);
    if (before && from === to) continue;
    if (!before && to === null) continue;

    changes[field] = redacted.includes(field) ? { redacted: true } : { from, to };
  }

  return changes;
}

function addDateDays(value: string, amount: number): string {
  const date = new Date(`${value}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

@Injectable()
export class AuditService {
  constructor(
    @InjectModel(AuditLog) private readonly auditLogModel: typeof AuditLog,
    @InjectModel(User) private readonly userModel: typeof User,
    private readonly institutionDateTime: InstitutionDateTimeService,
  ) {}

  // Sempre recebe a transação da operação auditada: a trilha e a mudança são confirmadas juntas.
  async record(entries: AuditEntry | AuditEntry[], transaction: Transaction): Promise<void> {
    const list = Array.isArray(entries) ? entries : [entries];
    if (list.length === 0) return;

    const occurredAt = new Date();
    await this.auditLogModel.bulkCreate(
      list.map((entry) => ({
        action: entry.action,
        actorId: entry.actorId,
        changes:
          entry.changes && Object.keys(entry.changes).length > 0
            ? JSON.stringify(entry.changes)
            : null,
        entityId: entry.entityId,
        entityType: entry.entityType,
        occurredAt,
        reason: entry.reason?.trim() || null,
      })),
      { transaction },
    );
  }

  async list(query: ListAuditLogsQueryDto): Promise<ListAuditLogsResponseDto> {
    const rangeStart = this.institutionDateTime.localToUtc(query.from, '00:00');
    const rangeEnd = this.institutionDateTime.localToUtc(addDateDays(query.to, 1), '00:00');

    if (rangeEnd <= rangeStart) {
      throw new BadRequestException('A data final deve ser igual ou posterior à data inicial.');
    }
    if ((rangeEnd.getTime() - rangeStart.getTime()) / 86_400_000 > MAX_RANGE_DAYS) {
      throw new BadRequestException(
        `O período da consulta deve ter no máximo ${MAX_RANGE_DAYS} dias.`,
      );
    }

    const where: WhereOptions = {
      occurredAt: { [Op.gte]: rangeStart, [Op.lt]: rangeEnd },
      ...(query.action ? { action: query.action } : {}),
      ...(query.entityType ? { entityType: query.entityType } : {}),
      ...(query.actorId ? { actorId: query.actorId } : {}),
    };
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const result = await this.auditLogModel.findAndCountAll({
      limit: pageSize,
      offset: (page - 1) * pageSize,
      order: [
        ['occurredAt', 'DESC'],
        ['id', 'DESC'],
      ],
      where,
    });
    const actorIds = [
      ...new Set(result.rows.flatMap(({ actorId }) => (actorId === null ? [] : [actorId]))),
    ];
    const actors =
      actorIds.length === 0
        ? []
        : await this.userModel.unscoped().findAll({
            attributes: ['id', 'name'],
            paranoid: false,
            where: { id: { [Op.in]: actorIds } },
          });
    const actorsById = new Map(actors.map(({ id, name }) => [id, { id, name }] as const));

    return {
      entries: result.rows.map((row) => ({
        action: row.action,
        actor: row.actorId === null ? null : (actorsById.get(row.actorId) ?? null),
        changes: row.changes ? (JSON.parse(row.changes) as AuditChanges) : {},
        entityId: row.entityId,
        entityType: row.entityType,
        id: row.id,
        occurredAt: row.occurredAt.toISOString(),
        reason: row.reason,
      })),
      page,
      pageSize,
      range: { from: query.from, to: query.to },
      total: result.count,
    };
  }
}
