import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import AppNotify from '@/components/basic/AppNotify.vue'
import { notifyApiFeedback } from '@/services/api'
import { pinia } from '@/stores'
import { useNotificationStore } from '@/stores/notification'

describe('notificações globais', () => {
  const notificationStore = useNotificationStore(pinia)

  beforeEach(() => {
    notificationStore.clear()
  })

  afterEach(() => {
    notificationStore.clear()
    vi.useRealTimers()
    document.body.innerHTML = ''
  })

  it('exibe e fecha manualmente um feedback acessível', async () => {
    const wrapper = mount(AppNotify, {
      attachTo: document.body,
      global: { plugins: [pinia] },
    })

    notificationStore.notify({
      duration: 0,
      message: 'Cadastro concluído.',
      type: 'success',
    })
    await nextTick()

    const notification = document.body.querySelector<HTMLElement>(
      '[data-notification-type="success"]',
    )
    expect(notification?.getAttribute('role')).toBe('status')
    expect(notification?.textContent).toContain('Cadastro concluído.')

    document.body
      .querySelector<HTMLButtonElement>('button[aria-label^="Fechar notificação"]')
      ?.click()
    await nextTick()

    expect(document.body.querySelector('[data-notification-type]')).toBeNull()
    wrapper.unmount()
  })

  it('remove automaticamente a notificação após sua duração', async () => {
    vi.useFakeTimers()
    const wrapper = mount(AppNotify, {
      attachTo: document.body,
      global: { plugins: [pinia] },
    })

    notificationStore.notify({ duration: 1_000, message: 'Aviso temporário.', type: 'info' })
    await nextTick()
    expect(document.body.querySelector('[data-notification-type="info"]')).not.toBeNull()

    vi.advanceTimersByTime(1_000)
    await nextTick()
    expect(document.body.querySelector('[data-notification-type]')).toBeNull()
    wrapper.unmount()
  })

  it('classifica respostas da API e respeita o tipo explícito', () => {
    notifyApiFeedback({ message: 'Usuário criado.' }, { ok: true, status: 201 })
    notifyApiFeedback({ message: 'Cadastro duplicado.' }, { ok: false, status: 409 })
    notifyApiFeedback(
      { message: 'Processamento iniciado.', type: 'info' },
      { ok: true, status: 202 },
    )

    expect(notificationStore.notifications.map(({ type }) => type)).toEqual([
      'success',
      'warning',
      'info',
    ])
  })
})
