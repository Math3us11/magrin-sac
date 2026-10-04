import { ref } from 'vue'
import { defineStore } from 'pinia'

import type { AppNotification, NotifyInput } from '@/types/notification'

const DEFAULT_DURATION = 5_000
const MAX_VISIBLE_NOTIFICATIONS = 4
let nextNotificationId = 1

export const useNotificationStore = defineStore('notification', () => {
  const notifications = ref<AppNotification[]>([])
  const timers = new Map<number, ReturnType<typeof setTimeout>>()

  function dismiss(id: number) {
    const timer = timers.get(id)
    if (timer) clearTimeout(timer)
    timers.delete(id)
    notifications.value = notifications.value.filter((notification) => notification.id !== id)
  }

  function notify(input: NotifyInput): number {
    const message = input.message.trim()
    if (!message) return 0

    const type = input.type ?? 'info'
    const duplicate = notifications.value.find(
      (notification) => notification.message === message && notification.type === type,
    )
    if (duplicate) return duplicate.id

    const notification: AppNotification = {
      duration: input.duration ?? DEFAULT_DURATION,
      id: nextNotificationId++,
      message,
      title: input.title,
      type,
    }

    notifications.value.push(notification)

    while (notifications.value.length > MAX_VISIBLE_NOTIFICATIONS) {
      const oldest = notifications.value[0]
      if (oldest) dismiss(oldest.id)
    }

    if (notification.duration > 0) {
      timers.set(
        notification.id,
        setTimeout(() => dismiss(notification.id), notification.duration),
      )
    }

    return notification.id
  }

  function clear() {
    for (const timer of timers.values()) clearTimeout(timer)
    timers.clear()
    notifications.value = []
  }

  return { clear, dismiss, notifications, notify }
})
