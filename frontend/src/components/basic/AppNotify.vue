<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { storeToRefs } from 'pinia'

import { circleCheckIcon, circleXIcon, infoIcon, triangleAlertIcon, xIcon } from '@/icons'
import { useNotificationStore } from '@/stores/notification'
import type { NotificationType } from '@/types/notification'

const notificationStore = useNotificationStore()
const { notifications } = storeToRefs(notificationStore)

const presentation: Record<
  NotificationType,
  { classes: string; icon: typeof infoIcon; title: string }
> = {
  error: {
    classes: 'border-status-danger bg-status-danger-soft text-status-danger',
    icon: circleXIcon,
    title: 'Não foi possível concluir',
  },
  info: {
    classes: 'border-status-info bg-status-info-soft text-status-info',
    icon: infoIcon,
    title: 'Informação',
  },
  success: {
    classes: 'border-status-success bg-status-success-soft text-status-success',
    icon: circleCheckIcon,
    title: 'Sucesso',
  },
  warning: {
    classes: 'border-status-warning bg-status-warning-soft text-status-warning',
    icon: triangleAlertIcon,
    title: 'Atenção',
  },
}
</script>

<template>
  <Teleport to="body">
    <div
      class="pointer-events-none fixed inset-x-4 top-4 z-[100] sm:left-auto sm:w-full sm:max-w-sm"
      aria-label="Notificações do sistema"
      aria-live="polite"
    >
      <TransitionGroup name="app-notify" tag="div" class="flex flex-col gap-3">
        <article
          v-for="notification in notifications"
          :key="notification.id"
          class="pointer-events-auto flex items-start gap-3 rounded-2xl border p-4 shadow-xl shadow-black/10 backdrop-blur-sm"
          :class="presentation[notification.type].classes"
          :data-notification-type="notification.type"
          :role="notification.type === 'error' ? 'alert' : 'status'"
        >
          <Icon
            class="mt-0.5 h-5 w-5 shrink-0"
            :icon="presentation[notification.type].icon"
            aria-hidden="true"
          />
          <div class="min-w-0 flex-1 text-content">
            <h2 class="text-sm font-bold">
              {{ notification.title ?? presentation[notification.type].title }}
            </h2>
            <p class="mt-1 break-words text-sm leading-5 text-content-muted">
              {{ notification.message }}
            </p>
          </div>
          <button
            class="-mr-1 -mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-current transition hover:bg-black/5 dark:hover:bg-white/10"
            type="button"
            :aria-label="`Fechar notificação: ${notification.message}`"
            @click="notificationStore.dismiss(notification.id)"
          >
            <Icon class="h-4 w-4" :icon="xIcon" aria-hidden="true" />
          </button>
        </article>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.app-notify-enter-active,
.app-notify-leave-active,
.app-notify-move {
  transition:
    opacity 180ms ease,
    transform 180ms ease;
}

.app-notify-enter-from,
.app-notify-leave-to {
  opacity: 0;
  transform: translateY(-0.75rem);
}

@media (prefers-reduced-motion: reduce) {
  .app-notify-enter-active,
  .app-notify-leave-active,
  .app-notify-move {
    transition: none;
  }
}
</style>
