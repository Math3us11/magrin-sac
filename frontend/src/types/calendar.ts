export type AppCalendarEventTone = 'brand' | 'neutral' | 'success' | 'warning'

export type AppCalendarEvent = {
  actionLabel?: string
  date: string
  description?: string
  id: number | string
  statusLabel?: string
  title: string
  tone?: AppCalendarEventTone
}
