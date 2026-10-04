export type NotificationType = 'error' | 'info' | 'success' | 'warning'

export type AppNotification = {
  duration: number
  id: number
  message: string
  title?: string
  type: NotificationType
}

export type NotifyInput = {
  duration?: number
  message: string
  title?: string
  type?: NotificationType
}
