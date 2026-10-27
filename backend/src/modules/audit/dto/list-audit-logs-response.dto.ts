import type { AuditAction, AuditEntityType } from '../../../models/audit-log.model.js';

export type AuditValue = boolean | number | string | null;

export type AuditChange = { from: AuditValue; to: AuditValue } | { redacted: true };

export type AuditChanges = Record<string, AuditChange>;

export class AuditLogItemResponseDto {
  declare action: AuditAction;
  declare actor: { id: number; name: string } | null;
  declare changes: AuditChanges;
  declare entityId: number;
  declare entityType: AuditEntityType;
  declare id: number;
  declare occurredAt: string;
  declare reason: string | null;
}

export class ListAuditLogsResponseDto {
  declare entries: AuditLogItemResponseDto[];
  declare page: number;
  declare pageSize: number;
  declare range: { from: string; to: string };
  declare total: number;
}
