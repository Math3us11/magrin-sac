import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'

import AppShell from '@/components/layout/AppShell.vue'
import AppSidebar from '@/components/layout/AppSidebar.vue'
import { setTheme } from '@/composables/useTheme'
import { filterRoutableNavigation } from '@/config/navigation'
import { getCurrentNavigation } from '@/services/navigation'
import { useNavigationStore } from '@/stores/navigation'
import type { NavigationItem, NavigationResponse } from '@/types/navigation'

const navigationItems: NavigationItem[] = [
  {
    children: [
      {
        children: [],
        code: 'agenda.availability',
        iconKey: 'clock-3',
        id: 7,
        label: 'Disponibilidades',
        routeName: 'professor-availability',
      },
    ],
    code: 'agenda',
    iconKey: 'calendar-check',
    id: 6,
    label: 'Agenda',
    routeName: null,
  },
  {
    children: [],
    code: 'home',
    iconKey: 'house',
    id: 1,
    label: 'Início',
    routeName: 'home',
  },
  {
    children: [
      {
        children: [],
        code: 'reports.dashboard',
        iconKey: 'chart-no-axes-combined',
        id: 3,
        label: 'Dashboard',
        routeName: 'reports-dashboard',
      },
    ],
    code: 'reports',
    iconKey: 'chart-no-axes-combined',
    id: 2,
    label: 'Relatórios',
    routeName: null,
  },
  {
    children: [
      {
        children: [],
        code: 'administration.users',
        iconKey: 'users',
        id: 5,
        label: 'Usuários',
        routeName: 'administration-users',
      },
    ],
    code: 'administration',
    iconKey: 'shield-check',
    id: 4,
    label: 'Administração',
    routeName: null,
  },
]

const navigationResponse: NavigationResponse = {
  items: navigationItems,
  permissions: ['availability.manage.own', 'reports.dashboard.view', 'users.manage'],
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('navegação autenticada', () => {
  it('carrega menu e permissões diretamente da API com cookies', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(navigationResponse), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    expect(await getCurrentNavigation()).toEqual(navigationResponse)
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/me/navigation',
      expect.objectContaining({ credentials: 'include' }),
    )
  })

  it('store mantém permissões consultáveis e pode limpar a sessão visual', async () => {
    setActivePinia(createPinia())
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify(navigationResponse), {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        }),
      ),
    )
    const navigation = useNavigationStore()

    await navigation.load()

    expect(navigation.initialized).toBe(true)
    expect(navigation.items).toHaveLength(4)
    expect(navigation.hasPermission('availability.manage.own')).toBe(true)
    expect(navigation.hasPermission('reports.dashboard.view')).toBe(true)
    expect(navigation.hasPermission('users.manage')).toBe(true)

    navigation.reset()

    expect(navigation.initialized).toBe(false)
    expect(navigation.items).toEqual([])
    expect(navigation.permissions).toEqual([])
  })

  it('filtra itens sem rota no frontend e agrupadores que ficam vazios', () => {
    const unknown: string[] = []
    const items: NavigationItem[] = [
      ...navigationItems,
      {
        children: [
          {
            children: [],
            code: 'future.report',
            iconKey: 'settings',
            id: 90,
            label: 'Relatório futuro',
            routeName: 'future-report',
          },
        ],
        code: 'future',
        iconKey: 'settings',
        id: 89,
        label: 'Futuro',
        routeName: null,
      },
    ]
    const knownRoutes = new Set([
      'home',
      'professor-availability',
      'reports-dashboard',
      'administration-users',
    ])

    const visible = filterRoutableNavigation(
      items,
      (routeName) => knownRoutes.has(routeName),
      (routeName) => unknown.push(routeName),
    )

    expect(visible.map(({ code }) => code)).toEqual(navigationItems.map(({ code }) => code))
    expect(unknown).toEqual(['future-report'])

    const withoutUsersRoute = filterRoutableNavigation(
      navigationItems,
      (routeName) => routeName !== 'administration-users',
    )
    expect(withoutUsersRoute.map(({ code }) => code)).not.toContain('administration')
  })

  it('sidebar ignora item com rota inexistente sem quebrar o menu', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', name: 'home', component: { template: '<div />' } },
        {
          path: '/professor/agenda',
          name: 'professor-availability',
          component: { template: '<div />' },
        },
        {
          path: '/relatorios/dashboard',
          name: 'reports-dashboard',
          component: { template: '<div />' },
        },
        {
          path: '/administracao/usuarios',
          name: 'administration-users',
          component: { template: '<div />' },
        },
      ],
    })
    await router.push('/')
    await router.isReady()
    const administration = navigationItems.find(({ code }) => code === 'administration')
    const items: NavigationItem[] = navigationItems.map((item) =>
      item === administration
        ? {
            ...item,
            children: [
              ...item.children,
              {
                children: [],
                code: 'administration.parameters',
                iconKey: 'settings',
                id: 99,
                label: 'Parâmetros',
                routeName: 'administration-parameters',
              },
            ],
          }
        : item,
    )

    const wrapper = mount(AppSidebar, {
      global: { plugins: [router] },
      props: {
        collapsed: false,
        errorMessage: '',
        isLoading: false,
        items,
        mobileOpen: false,
      },
    })

    expect(wrapper.text()).toContain('Usuários')
    expect(wrapper.text()).toContain('Dashboard')
    expect(wrapper.text()).not.toContain('Parâmetros')
    expect(warn).toHaveBeenCalledOnce()
    expect(warn.mock.calls[0]?.[0]).toContain('administration-parameters')
    warn.mockRestore()
  })

  it('chamadas simultâneas aguardam a mesma requisição antes de liberar permissões', async () => {
    setActivePinia(createPinia())
    let resolveFetch: (response: Response) => void = () => {}
    const fetchMock = vi.fn().mockReturnValue(
      new Promise<Response>((resolve) => {
        resolveFetch = resolve
      }),
    )
    vi.stubGlobal('fetch', fetchMock)
    const navigation = useNavigationStore()

    // AppShell dispara a carga ao montar e o guard do router chama load() logo depois.
    const shellLoad = navigation.load(true)
    let guardSettled = false
    const guardLoad = navigation.load().then(() => {
      guardSettled = true
    })
    await Promise.resolve()

    expect(guardSettled).toBe(false)
    expect(fetchMock).toHaveBeenCalledTimes(1)

    resolveFetch(
      new Response(JSON.stringify(navigationResponse), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      }),
    )
    await Promise.all([shellLoad, guardLoad])

    expect(navigation.initialized).toBe(true)
    expect(navigation.hasPermission('users.manage')).toBe(true)
  })

  it('descarta a resposta de uma carga iniciada antes do reset', async () => {
    setActivePinia(createPinia())
    let resolveFetch: (response: Response) => void = () => {}
    vi.stubGlobal(
      'fetch',
      vi.fn().mockReturnValue(
        new Promise<Response>((resolve) => {
          resolveFetch = resolve
        }),
      ),
    )
    const navigation = useNavigationStore()

    const staleLoad = navigation.load()
    navigation.reset()
    resolveFetch(
      new Response(JSON.stringify(navigationResponse), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      }),
    )
    await staleLoad

    expect(navigation.initialized).toBe(false)
    expect(navigation.permissions).toEqual([])
    expect(navigation.isLoading).toBe(false)
  })

  it('sidebar renderiza a árvore e permite expandir o desktop minimizado', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', name: 'home', component: { template: '<div />' } },
        {
          path: '/professor/agenda',
          name: 'professor-availability',
          component: { template: '<div />' },
        },
        {
          path: '/relatorios/dashboard',
          name: 'reports-dashboard',
          component: { template: '<div />' },
        },
        {
          path: '/administracao/usuarios',
          name: 'administration-users',
          component: { template: '<div />' },
        },
      ],
    })
    await router.push('/')
    await router.isReady()

    const wrapper = mount(AppSidebar, {
      global: { plugins: [router] },
      props: {
        collapsed: true,
        errorMessage: '',
        isLoading: false,
        items: navigationItems,
        mobileOpen: false,
      },
    })

    expect(wrapper.text()).toContain('Início')
    expect(wrapper.text()).toContain('Agenda')
    expect(wrapper.text()).toContain('Disponibilidades')
    expect(wrapper.text()).toContain('Dashboard')
    expect(wrapper.text()).toContain('Administração')
    expect(wrapper.text()).toContain('Usuários')
    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.classes()).toContain('lg:sticky')
    expect(wrapper.classes()).toContain('lg:top-18')
    expect(wrapper.classes()).toContain('lg:h-[calc(100dvh-4.5rem)]')
    expect(wrapper.get('[data-testid="sidebar-scroll-area"]').classes()).toContain(
      'overflow-y-auto',
    )

    const reportsButton = wrapper
      .findAll('button')
      .find((button) => button.text().includes('Relatórios'))
    expect(reportsButton).toBeDefined()
    await reportsButton?.trigger('click')

    expect(wrapper.emitted('expandDesktop')).toHaveLength(1)
  })

  it('organiza o header em largura total e divide a região principal', async () => {
    setTheme('light', false)
    const pinia = createPinia()
    setActivePinia(pinia)
    const navigation = useNavigationStore()
    navigation.initialized = true
    navigation.items = navigationItems

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', name: 'home', component: { template: '<div />' } },
        { path: '/login', name: 'login', component: { template: '<div />' } },
        {
          path: '/professor/agenda',
          name: 'professor-availability',
          component: { template: '<div />' },
        },
        {
          path: '/relatorios/dashboard',
          name: 'reports-dashboard',
          component: { template: '<div />' },
        },
        {
          path: '/administracao/usuarios',
          name: 'administration-users',
          component: { template: '<div />' },
        },
      ],
    })
    await router.push('/')
    await router.isReady()

    const wrapper = mount(AppShell, {
      attachTo: document.body,
      global: { plugins: [pinia, router] },
      slots: {
        default: '<section data-testid="page-content">Conteúdo</section>',
      },
    })

    expect(wrapper.classes()).toContain('grid')
    expect(wrapper.get('header').classes()).toContain('lg:col-span-2')
    expect(wrapper.get('aside').classes()).toContain('lg:sticky')
    expect(wrapper.get('aside').classes()).toContain('lg:self-start')
    expect(wrapper.get('aside').classes()).toContain('row-start-2')
    expect(wrapper.get('main').classes()).toContain('lg:col-start-2')
    expect(wrapper.get('main').attributes('tabindex')).toBe('-1')
    expect(wrapper.find('header h1').exists()).toBe(false)
    expect(wrapper.find('footer').exists()).toBe(false)
    expect(wrapper.get('[data-testid="page-content"]').text()).toBe('Conteúdo')

    const headerLogo = wrapper.get('header img')
    expect(headerLogo.attributes('src')).toBe('/logo_vermelha.png')

    const navigationTrigger = wrapper.get<HTMLButtonElement>(
      '[data-testid="mobile-navigation-trigger"]',
    )
    navigationTrigger.element.focus()
    await navigationTrigger.trigger('click')
    await nextTick()

    expect(navigationTrigger.attributes('aria-expanded')).toBe('true')
    expect(navigationTrigger.attributes('aria-label')).toBe('Fechar menu de navegação')
    expect(wrapper.get('aside').attributes('role')).toBe('dialog')
    expect(document.activeElement).toBe(wrapper.get('[data-testid="sidebar-mobile-close"]').element)
    expect(document.body.style.overflow).toBe('hidden')

    window.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Escape' }))
    await nextTick()
    expect(navigationTrigger.attributes('aria-expanded')).toBe('false')
    expect(navigationTrigger.attributes('aria-label')).toBe('Abrir menu de navegação')
    expect(document.activeElement).toBe(navigationTrigger.element)
    expect(document.body.style.overflow).toBe('')

    await wrapper.get('header button[aria-label="Usar tema escuro"]').trigger('click')
    expect(headerLogo.attributes('src')).toBe('/logo_branca.png')

    await wrapper.get('[data-testid="logout-trigger"]').trigger('click')
    expect(document.body.querySelector('[role="dialog"]')?.textContent).toContain(
      'Deseja sair do sistema?',
    )
    expect(router.currentRoute.value.name).toBe('home')

    document.body.querySelector<HTMLButtonElement>('[data-testid="confirm-dialog-cancel"]')?.click()
    await nextTick()
    expect(document.body.querySelector('[role="dialog"]')).toBeNull()

    setTheme('light', false)
    wrapper.unmount()
  })
})
