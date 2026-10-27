import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'

import { useAuthStore } from '@/stores/auth'
import { useNavigationStore } from '@/stores/navigation'
import HomeView from '@/views/HomeView.vue'

const appointmentMocks = vi.hoisted(() => ({
  listAdminAppointments: vi.fn(),
  listAssignedAppointments: vi.fn(),
  listOwnAppointments: vi.fn(),
}))

vi.mock('@/services/appointments', () => appointmentMocks)

function createHomeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'home', component: HomeView },
      {
        path: '/relatorios/dashboard',
        name: 'reports-dashboard',
        component: { template: '<div />' },
      },
      {
        path: '/agendamentos/novo',
        name: 'appointments-new',
        component: { template: '<div />' },
      },
      {
        path: '/agendamentos/meus',
        name: 'appointments-mine',
        component: { template: '<div />' },
      },
      {
        path: '/professor/agenda',
        name: 'professor-availability',
        component: { template: '<div />' },
      },
      {
        path: '/professor/atendimentos',
        name: 'professor-attendances',
        component: { template: '<div />' },
      },
      {
        path: '/administracao/agenda',
        name: 'administration-schedule',
        component: { template: '<div />' },
      },
      {
        path: '/administracao/atendimentos',
        name: 'administration-attendances',
        component: { template: '<div />' },
      },
      {
        path: '/administracao/usuarios',
        name: 'administration-users',
        component: { template: '<div />' },
      },
    ],
  })
}

describe('HomeView', () => {
  beforeEach(() => {
    appointmentMocks.listAdminAppointments.mockReset()
    appointmentMocks.listAssignedAppointments.mockReset()
    appointmentMocks.listOwnAppointments.mockReset()
  })

  it('apresenta ao administrador a agenda real e os atalhos do perfil', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)

    const auth = useAuthStore()
    auth.user = {
      birthDate: null,
      email: 'admin@example.com',
      id: 1,
      mustChangePassword: false,
      name: 'Matheus Administrador',
      userType: 'administrador',
    }

    const navigation = useNavigationStore()
    navigation.permissions = [
      'appointments.read.any',
      'attendance.manage.any',
      'availability.read.any',
      'reports.dashboard.view',
      'users.manage',
    ]

    appointmentMocks.listAdminAppointments.mockResolvedValue({
      appointments: [
        {
          cancelledAt: null,
          cancellationReason: null,
          endsAt: '2026-10-26T14:00:00.000Z',
          id: 10,
          modality: 'presencial',
          professor: { id: 2, name: 'Docente Exemplo' },
          protocol: 'AG-2026-0010',
          startsAt: '2026-10-26T13:00:00.000Z',
          status: 'confirmado',
          student: { id: 3, name: 'Aluno Exemplo' },
          subject: 'Orientação de estágio',
        },
      ],
      range: { from: '2026-10-24', to: '2026-11-23' },
    })

    const router = createHomeRouter()
    await router.push('/')
    await router.isReady()

    const wrapper = mount(HomeView, { global: { plugins: [pinia, router] } })
    await flushPromises()

    expect(wrapper.get('h1').text()).toContain('Olá, Matheus')
    expect(wrapper.text()).not.toContain('Conteúdo ilustrativo')
    expect(wrapper.get('[data-testid="home-agenda"]').text()).toContain('Orientação de estágio')
    expect(wrapper.get('[data-testid="home-agenda"]').text()).toContain('Aluno Exemplo')
    expect(wrapper.get('[data-testid="home-agenda"]').text()).toContain('Docente Exemplo')
    expect(wrapper.get('[data-testid="quick-links"]').findAll('a')).toHaveLength(4)
    expect(appointmentMocks.listAdminAppointments).toHaveBeenCalledOnce()
  })

  it('não oferece atalhos sem permissão', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)

    const auth = useAuthStore()
    auth.user = {
      birthDate: null,
      email: 'professor@example.com',
      id: 2,
      mustChangePassword: false,
      name: 'Docente Exemplo',
      userType: 'professor',
    }

    const router = createHomeRouter()
    await router.push('/')
    await router.isReady()

    const wrapper = mount(HomeView, { global: { plugins: [pinia, router] } })
    await flushPromises()

    expect(wrapper.find('[data-testid="quick-links"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('conforme as permissões disponíveis')
    expect(wrapper.text()).toContain('permissão necessária')
    expect(appointmentMocks.listAssignedAppointments).not.toHaveBeenCalled()
  })

  it('oferece ao professor sua agenda, atendimentos e resumo atribuído', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)

    const auth = useAuthStore()
    auth.user = {
      birthDate: null,
      email: 'professor@example.com',
      id: 2,
      mustChangePassword: false,
      name: 'Docente Exemplo',
      userType: 'professor',
    }
    const navigation = useNavigationStore()
    navigation.permissions = [
      'appointments.read.assigned',
      'attendance.manage.assigned',
      'availability.manage.own',
      'reports.dashboard.view',
    ]

    appointmentMocks.listAssignedAppointments.mockResolvedValue({
      appointments: [
        {
          cancelledAt: null,
          cancellationReason: null,
          endsAt: '2026-10-27T16:00:00.000Z',
          id: 11,
          modality: 'online',
          professor: { id: 2, name: 'Docente Exemplo' },
          protocol: 'AG-2026-0011',
          startsAt: '2026-10-27T15:00:00.000Z',
          status: 'confirmado',
          student: { id: 4, name: 'Estudante Teste' },
          subject: 'Projeto final',
        },
      ],
      range: { from: '2026-10-24', to: '2026-11-23' },
    })

    const router = createHomeRouter()
    await router.push('/')
    await router.isReady()

    const wrapper = mount(HomeView, { global: { plugins: [pinia, router] } })
    await flushPromises()

    expect(wrapper.get('[data-testid="quick-links"]').text()).toContain('Minha agenda')
    expect(wrapper.get('[data-testid="quick-links"]').text()).toContain('Meus atendimentos')
    expect(wrapper.get('[data-testid="home-agenda"]').text()).toContain('Projeto final')
    expect(wrapper.get('[data-testid="home-agenda"]').text()).toContain('Estudante Teste')
    expect(appointmentMocks.listAssignedAppointments).toHaveBeenCalledOnce()
  })

  it('mostra ao aluno seus próximos agendamentos e ações próprias', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)

    const auth = useAuthStore()
    auth.user = {
      birthDate: null,
      email: 'aluno@example.com',
      id: 3,
      mustChangePassword: false,
      name: 'Aluno Exemplo',
      userType: 'aluno',
    }
    const navigation = useNavigationStore()
    navigation.permissions = ['appointments.create', 'appointments.read.own']
    appointmentMocks.listOwnAppointments.mockResolvedValue({
      appointments: [
        {
          cancelledAt: null,
          cancellationReason: null,
          details: null,
          endsAt: '2026-10-28T14:00:00.000Z',
          id: 12,
          modality: 'presencial',
          professor: { id: 2, name: 'Docente Exemplo' },
          protocol: 'AG-2026-0012',
          startsAt: '2026-10-28T13:00:00.000Z',
          status: 'confirmado',
          subject: 'Dúvida acadêmica',
        },
      ],
      page: 1,
      pageSize: 4,
      total: 1,
    })

    const router = createHomeRouter()
    await router.push('/')
    await router.isReady()

    const wrapper = mount(HomeView, { global: { plugins: [pinia, router] } })
    await flushPromises()

    expect(wrapper.get('[data-testid="quick-links"]').findAll('a')).toHaveLength(2)
    expect(wrapper.get('[data-testid="home-agenda"]').text()).toContain('Dúvida acadêmica')
    expect(wrapper.get('[data-testid="home-agenda"]').text()).toContain('Docente Exemplo')
    expect(appointmentMocks.listOwnAppointments).toHaveBeenCalledWith({
      from: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      status: 'confirmado',
      to: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
    })
  })
})
