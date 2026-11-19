import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'

import SessionLockOverlay from '@/components/layout/SessionLockOverlay.vue'
import { ApiError, apiRequest, setUnauthorizedHandler } from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import { useNotificationStore } from '@/stores/notification'
import { useSessionLockStore } from '@/stores/session-lock'

const authServices = vi.hoisted(() => ({
  completeFirstAccessPassword: vi.fn(),
  createSession: vi.fn(),
  deleteSession: vi.fn(),
  getCurrentUser: vi.fn(),
  getSessionPolicy: vi.fn(),
}))
vi.mock('@/services/auth', () => authServices)

const user = {
  birthDate: null,
  email: 'coordenacao@demo.test',
  id: 4,
  mustChangePassword: false,
  name: 'Coordenação Demonstração',
  userType: 'administrador' as const,
}

function startWithSession(idleTimeoutMinutes = 30, absoluteMs = 8 * 60 * 60_000) {
  authServices.getSessionPolicy.mockResolvedValue({
    absoluteExpiresAt: new Date(Date.now() + absoluteMs).toISOString(),
    idleTimeoutMinutes,
  })
  const auth = useAuthStore()
  auth.user = { ...user }
  const lock = useSessionLockStore()
  lock.start()
  return { auth, lock }
}

beforeEach(() => {
  vi.useFakeTimers()
  setActivePinia(createPinia())
  for (const mock of Object.values(authServices)) mock.mockReset()
  authServices.deleteSession.mockResolvedValue(undefined)
  authServices.getCurrentUser.mockResolvedValue(user)
})

afterEach(() => {
  useSessionLockStore().stop()
  setUnauthorizedHandler(null)
  vi.useRealTimers()
  vi.unstubAllGlobals()
  document.body.innerHTML = ''
})

describe('bloqueio de sessão', () => {
  it('bloqueia após o tempo de inatividade e encerra a sessão no servidor', async () => {
    const { lock } = startWithSession(30)
    await flushPromises()

    await vi.advanceTimersByTimeAsync(29 * 60_000)
    expect(lock.locked).toBe(false)

    await vi.advanceTimersByTimeAsync(2 * 60_000)
    expect(lock.locked).toBe(true)
    expect(lock.reason).toBe('idle')
    expect(lock.lockedUser?.email).toBe(user.email)
    expect(authServices.deleteSession).toHaveBeenCalledWith({ quiet: true })
  })

  it('interação reinicia a contagem e envia sinal de vida ao servidor', async () => {
    const { lock } = startWithSession(30)
    await flushPromises()

    for (let minute = 0; minute < 40; minute += 1) {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }))
      await vi.advanceTimersByTimeAsync(60_000)
    }

    expect(lock.locked).toBe(false)
    expect(authServices.getCurrentUser).toHaveBeenCalled()
  })

  it('bloqueia quando a duração absoluta da sessão vence', async () => {
    const { lock } = startWithSession(30, 10 * 60_000)
    await flushPromises()

    for (let minute = 0; minute < 11; minute += 1) {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }))
      await vi.advanceTimersByTimeAsync(60_000)
    }

    expect(lock.locked).toBe(true)
    expect(lock.reason).toBe('expired')
  })

  it('desbloqueia somente com a senha da mesma conta', async () => {
    const { lock } = startWithSession()
    await flushPromises()
    await lock.lock('idle')

    authServices.createSession.mockRejectedValueOnce(
      new ApiError(401, 'E-mail ou senha inválidos.', 'warning'),
    )
    await expect(lock.unlock('senha-errada')).rejects.toThrow('E-mail ou senha inválidos.')
    expect(lock.locked).toBe(true)

    authServices.createSession.mockResolvedValueOnce({ user })
    await lock.unlock('senha-certa')

    expect(authServices.createSession).toHaveBeenLastCalledWith(
      { email: user.email, password: 'senha-certa' },
      { quiet: true },
    )
    expect(lock.locked).toBe(false)
  })

  it('401 de uma sessão em uso abre o bloqueio sem aviso genérico', async () => {
    const { lock } = startWithSession()
    await flushPromises()
    setUnauthorizedHandler((path) => lock.handleUnauthorized(path))
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ message: 'Sessão inválida ou expirada.' }), {
          headers: { 'Content-Type': 'application/json' },
          status: 401,
        }),
      ),
    )

    await expect(apiRequest('/admin/users')).rejects.toBeInstanceOf(ApiError)

    expect(lock.locked).toBe(true)
    expect(lock.reason).toBe('expired')
    expect(useNotificationStore().notifications).toHaveLength(0)
  })

  it('não intercepta 401 sem sessão ativa nem nas rotas de autenticação', () => {
    const lock = useSessionLockStore()
    expect(lock.handleUnauthorized('/me')).toBe(false)

    startWithSession()
    expect(lock.handleUnauthorized('/auth/login')).toBe(false)
    expect(lock.locked).toBe(false)
  })

  it('painel mostra a conta bloqueada e desbloqueia pela senha', async () => {
    vi.useRealTimers()
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/', name: 'login', component: { template: '<div />' } }],
    })
    const { lock } = startWithSession()
    await flushPromises()
    await lock.lock('idle')
    authServices.createSession.mockResolvedValueOnce({ user })

    const wrapper = mount(SessionLockOverlay, {
      attachTo: document.body,
      global: { plugins: [router] },
    })
    await flushPromises()

    const panel = document.body.querySelector('[data-testid="session-lock"]')
    expect(panel?.textContent).toContain('Sessão bloqueada')
    expect(panel?.textContent).toContain(user.name)
    expect(panel?.textContent).toContain('30 minutos sem uso')

    const input = document.body.querySelector<HTMLInputElement>('input[name="password"]')
    expect(input).not.toBeNull()
    input!.value = 'senha-certa'
    input!.dispatchEvent(new Event('input'))
    document.body.querySelector('form')?.dispatchEvent(new Event('submit'))
    await vi.waitFor(() => expect(lock.locked).toBe(false))

    expect(document.body.querySelector('[data-testid="session-lock"]')).toBeNull()
    wrapper.unmount()
  })
})
