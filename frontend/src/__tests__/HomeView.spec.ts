import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { describe, expect, it } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'

import { useAuthStore } from '@/stores/auth'
import { useNavigationStore } from '@/stores/navigation'
import HomeView from '@/views/HomeView.vue'

describe('HomeView', () => {
  it('apresenta a prévia personalizada com atalhos permitidos e conteúdo ilustrativo', async () => {
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
      'reports.dashboard.view',
      'appointments.create',
      'appointments.read.own',
    ]

    const router = createRouter({
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
      ],
    })
    await router.push('/')
    await router.isReady()

    const wrapper = mount(HomeView, { global: { plugins: [pinia, router] } })

    expect(wrapper.get('h1').text()).toContain('Olá, Matheus')
    expect(wrapper.text()).toContain('Conteúdo ilustrativo')
    expect(wrapper.text()).toContain('Semana de acolhimento Afya')
    expect(wrapper.get('[data-testid="quick-links"]').findAll('a')).toHaveLength(3)
    expect(wrapper.get('[data-testid="upcoming-appointments"]').findAll('li')).toHaveLength(2)
    expect(wrapper.text()).toContain('Avisos importantes')
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

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/', name: 'home', component: HomeView }],
    })
    await router.push('/')
    await router.isReady()

    const wrapper = mount(HomeView, { global: { plugins: [pinia, router] } })

    expect(wrapper.find('[data-testid="quick-links"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('conforme as permissões disponíveis')
  })

  it('oferece a agenda própria quando o professor possui a permissão', async () => {
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
    navigation.permissions = ['availability.manage.own']

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', name: 'home', component: HomeView },
        {
          path: '/professor/agenda',
          name: 'professor-availability',
          component: { template: '<div />' },
        },
      ],
    })
    await router.push('/')
    await router.isReady()

    const wrapper = mount(HomeView, { global: { plugins: [pinia, router] } })

    expect(wrapper.get('[data-testid="quick-links"]').text()).toContain('Minha agenda')
    expect(wrapper.get('[data-testid="quick-links"] a').attributes('href')).toBe(
      '/professor/agenda',
    )
  })
})
