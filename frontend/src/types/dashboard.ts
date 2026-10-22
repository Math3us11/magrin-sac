export type DashboardScope = 'admin' | 'professor'

export type DashboardSummaryParams = {
  from: string
  to: string
}

export type DashboardSummary = {
  filters: DashboardSummaryParams
  inProgress: number
  performed: number
  resolved: number
  unresolved: number
}
