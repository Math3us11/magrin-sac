import { ref } from 'vue'
import { defineStore } from 'pinia'

import { deleteSession, getCurrentUser, getSessionPolicy } from '@/services/auth'
import { useAuthStore } from '@/stores/auth'
import { useNavigationStore } from '@/stores/navigation'
import type { AuthenticatedUser } from '@/types/auth'

export type SessionLockReason = 'expired' | 'idle'

type LockedUser = Pick<AuthenticatedUser, 'email' | 'id' | 'name'>

const ACTIVITY_EVENTS = ['keydown', 'pointerdown', 'touchstart', 'wheel'] as const
const CHECK_INTERVAL_MS = 15_000
// Enquanto há interação sem requisições (ex.: preenchendo um formulário longo), um sinal de
// vida mantém a sessão do servidor ativa, que só conta a inatividade pelas chamadas à API.
const HEARTBEAT_INTERVAL_MS = 5 * 60_000
const DEFAULT_IDLE_MINUTES = 30

/**
 * Bloqueia a tela em vez de desconectar: ao ficar ociosa ou vencer, a sessão é encerrada no
 * servidor, o conteúdo fica oculto e a mesma pessoa continua de onde parou confirmando a senha.
 */
export const useSessionLockStore = defineStore('session-lock', () => {
  const locked = ref(false)
  const reason = ref<SessionLockReason>('idle')
  const lockedUser = ref<LockedUser | null>(null)
  const idleTimeoutMinutes = ref(DEFAULT_IDLE_MINUTES)

  let active = false
  let absoluteExpiresAt = Number.POSITIVE_INFINITY
  let lastInteraction = Date.now()
  let lastHeartbeat = Date.now()
  let timer: ReturnType<typeof setInterval> | null = null

  function recordActivity() {
    if (!locked.value) lastInteraction = Date.now()
  }

  function handleVisibilityChange() {
    if (document.visibilityState === 'visible') tick()
  }

  async function refreshPolicy() {
    try {
      const policy = await getSessionPolicy()
      idleTimeoutMinutes.value = policy.idleTimeoutMinutes
      absoluteExpiresAt = Date.parse(policy.absoluteExpiresAt)
    } catch {
      // Um 401 aqui já aciona o bloqueio pelo handler do cliente HTTP.
    }
  }

  function tick() {
    if (!active || locked.value) return

    const now = Date.now()
    if (now >= absoluteExpiresAt) {
      void lock('expired')
      return
    }
    if (now - lastInteraction >= idleTimeoutMinutes.value * 60_000) {
      void lock('idle')
      return
    }
    if (lastInteraction > lastHeartbeat && now - lastHeartbeat >= HEARTBEAT_INTERVAL_MS) {
      lastHeartbeat = now
      void getCurrentUser().catch(() => {})
    }
  }

  function start() {
    if (active) return

    active = true
    lastInteraction = Date.now()
    lastHeartbeat = lastInteraction
    absoluteExpiresAt = Number.POSITIVE_INFINITY
    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, recordActivity, { capture: true, passive: true })
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    timer = setInterval(tick, CHECK_INTERVAL_MS)
    void refreshPolicy()
  }

  function stop() {
    active = false
    locked.value = false
    lockedUser.value = null
    for (const event of ACTIVITY_EVENTS) {
      window.removeEventListener(event, recordActivity, { capture: true })
    }
    document.removeEventListener('visibilitychange', handleVisibilityChange)
    if (timer) clearInterval(timer)
    timer = null
  }

  async function lock(lockReason: SessionLockReason) {
    const auth = useAuthStore()
    if (!active || locked.value || !auth.user) return

    lockedUser.value = { email: auth.user.email, id: auth.user.id, name: auth.user.name }
    reason.value = lockReason
    locked.value = true

    try {
      // Encerra a sessão no servidor: recarregar a página bloqueada leva ao login.
      await deleteSession({ quiet: true })
    } catch {
      // Sessão já inválida no servidor; a tela continua bloqueada.
    }
  }

  async function unlock(password: string) {
    const user = lockedUser.value
    if (!user) return

    const auth = useAuthStore()
    // O e-mail é o da pessoa bloqueada: o desbloqueio nunca troca a conta em uso.
    // Erros aparecem no próprio painel, sem aviso duplicado.
    await auth.login({ email: user.email, password }, { quiet: true })

    locked.value = false
    lockedUser.value = null
    lastInteraction = Date.now()
    lastHeartbeat = lastInteraction
    await refreshPolicy()
    void useNavigationStore()
      .load(true)
      .catch(() => {})
  }

  async function signOut() {
    const auth = useAuthStore()
    stop()
    useNavigationStore().reset()
    await auth.logout().catch(() => {})
  }

  function handleUnauthorized(path: string): boolean {
    if (!active || path.startsWith('/auth/')) return false

    void lock('expired')
    return true
  }

  return {
    handleUnauthorized,
    idleTimeoutMinutes,
    lock,
    locked,
    lockedUser,
    reason,
    signOut,
    start,
    stop,
    tick,
    unlock,
  }
})
