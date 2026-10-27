import { apiRequest } from '@/services/api'
import type { ListAuditLogsParams, ListAuditLogsResponse } from '@/types/audit'

export function listAuditLogs(params: ListAuditLogsParams): Promise<ListAuditLogsResponse> {
  const query = new URLSearchParams({ from: params.from, to: params.to })
  if (params.action) query.set('action', params.action)
  if (params.page) query.set('page', String(params.page))
  if (params.pageSize) query.set('pageSize', String(params.pageSize))

  return apiRequest<ListAuditLogsResponse>(`/admin/audit-logs?${query.toString()}`, {
    notification: { error: false, success: false },
  })
}
