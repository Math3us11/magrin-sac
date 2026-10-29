export type AuditAction =
  | 'appointment.cancelled'
  | 'appointment.created'
  | 'availability.blocked'
  | 'availability.created'
  | 'availability.unblocked'
  | 'system_parameter.updated'
  | 'user.created'
  | 'user.deleted'
  | 'user.updated'

export type AuditEntityType = 'appointment' | 'availability' | 'system_parameter' | 'user'

export type AuditValue = boolean | number | string | null

export type AuditChange = { from: AuditValue; to: AuditValue } | { redacted: true }

export type AuditLogEntry = {
  action: AuditAction
  actor: { id: number; name: string } | null
  changes: Record<string, AuditChange>
  entityId: number
  entityType: AuditEntityType
  id: number
  occurredAt: string
  reason: string | null
}

export type ListAuditLogsParams = {
  action?: AuditAction
  from: string
  page?: number
  pageSize?: number
  to: string
}

export type ListAuditLogsResponse = {
  entries: AuditLogEntry[]
  page: number
  pageSize: number
  range: { from: string; to: string }
  total: number
}
