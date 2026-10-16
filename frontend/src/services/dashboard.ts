import { apiRequest } from '@/services/api'
import type { DashboardScope, DashboardSummary, DashboardSummaryParams } from '@/types/dashboard'

function scopePath(scope: DashboardScope): string {
  return scope === 'admin' ? '/admin' : '/professor'
}

export function getDashboardSummary(
  scope: DashboardScope,
  params: DashboardSummaryParams,
): Promise<DashboardSummary> {
  const query = new URLSearchParams(params)
  return apiRequest<DashboardSummary>(`${scopePath(scope)}/dashboard?${query.toString()}`, {
    notification: { error: false, success: false },
  })
}
