import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const dashboardMocks = vi.hoisted(() => ({
  getDashboardSummary: vi.fn(),
}))

vi.mock('@/services/dashboard', () => dashboardMocks)

import { useAuthStore } from '@/stores/auth'
import DashboardView from '@/views/DashboardView.vue'

function createDashboardRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/relatorios/dashboard', name: 'reports-dashboard', component: DashboardView },
      {
        path: '/administracao/atendimentos',
        name: 'administration-attendances',
        component: { template: '<div />' },
      },
      {
        path: '/professor/atendimentos',
        name: 'professor-attendances',
        component: { template: '<div />' },
      },
    ],
  })
}

describe('DashboardView', () => {
  beforeEach(() => {
    dashboardMocks.getDashboardSummary.mockReset().mockResolvedValue({
      filters: { from: '2026-10-01', to: '2026-10-31' },
      inProgress: 1,
      performed: 8,
      resolved: 5,
      unresolved: 2,
    })
  })

  it('apresenta os quatro indicadores globais e permite rastrear seus registros', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const auth = useAuthStore()
    auth.user = {
      birthDate: null,
      email: 'admin@example.com',
      id: 1,
      mustChangePassword: false,
      name: 'Administrador',
      userType: 'administrador',
    }
    const router = createDashboardRouter()
    await router.push('/relatorios/dashboard')
    await router.isReady()

    const wrapper = mount(DashboardView, { global: { plugins: [pinia, router] } })
    await flushPromises()

    expect(dashboardMocks.getDashboardSummary).toHaveBeenCalledWith(
      'admin',
      expect.objectContaining({ from: expect.any(String), to: expect.any(String) }),
    )
    expect(wrapper.get('[data-testid="indicator-performed"]').text()).toBe('8')
    expect(wrapper.get('[data-testid="indicator-resolved"]').text()).toBe('5')
    expect(wrapper.get('[data-testid="indicator-unresolved"]').text()).toBe('2')
    expect(wrapper.get('[data-testid="indicator-inProgress"]').text()).toBe('1')

    const resolvedLink = wrapper
      .findAll('a')
      .find((link) => link.attributes('href')?.includes('resolutionStatus=resolvido'))
    expect(resolvedLink?.attributes('href')).toContain('/administracao/atendimentos')
    expect(resolvedLink?.attributes('href')).toContain('from=2026-10-01')
  })

  it('consulta somente o escopo atribuído quando o usuário é professor', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const auth = useAuthStore()
    auth.user = {
      birthDate: null,
      email: 'professor@example.com',
      id: 8,
      mustChangePassword: false,
      name: 'Professor',
      userType: 'professor',
    }
    const router = createDashboardRouter()
    await router.push('/relatorios/dashboard')
    await router.isReady()

    mount(DashboardView, { global: { plugins: [pinia, router] } })
    await flushPromises()

    expect(dashboardMocks.getDashboardSummary).toHaveBeenCalledWith(
      'professor',
      expect.objectContaining({ from: expect.any(String), to: expect.any(String) }),
    )
  })
})
