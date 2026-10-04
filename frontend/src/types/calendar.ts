export type AppCalendarEventTone = 'brand' | 'neutral' | 'success' | 'warning'

export type AppCalendarEvent = {
  date: string
  description?: string
  id: number | string
  statusLabel?: string
  title: string
  tone?: AppCalendarEventTone
}
