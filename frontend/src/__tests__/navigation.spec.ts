import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'

import AppShell from '@/components/layout/AppShell.vue'
import AppSidebar from '@/components/layout/AppSidebar.vue'
import { setTheme } from '@/composables/useTheme'
import { getCurrentNavigation } from '@/services/navigation'
import { useNavigationStore } from '@/stores/navigation'
import type { NavigationItem, NavigationResponse } from '@/types/navigation'

const navigationItems: NavigationItem[] = [
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
]

const navigationResponse: NavigationResponse = {
  items: navigationItems,
  permissions: ['reports.dashboard.view'],
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
    expect(navigation.items).toHaveLength(2)
    expect(navigation.hasPermission('reports.dashboard.view')).toBe(true)

    navigation.reset()

    expect(navigation.initialized).toBe(false)
    expect(navigation.items).toEqual([])
    expect(navigation.permissions).toEqual([])
  })

  it('sidebar renderiza a árvore e permite expandir o desktop minimizado', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', name: 'home', component: { template: '<div />' } },
        {
          path: '/relatorios/dashboard',
          name: 'reports-dashboard',
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
    expect(wrapper.text()).toContain('Dashboard')
    expect(wrapper.find('img').exists()).toBe(false)

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
          path: '/relatorios/dashboard',
          name: 'reports-dashboard',
          component: { template: '<div />' },
        },
      ],
    })
    await router.push('/')
    await router.isReady()

    const wrapper = mount(AppShell, {
      global: { plugins: [pinia, router] },
      slots: { default: '<section data-testid="page-content">Conteúdo</section>' },
    })

    expect(wrapper.classes()).toContain('grid')
    expect(wrapper.get('header').classes()).toContain('lg:col-span-2')
    expect(wrapper.get('aside').classes()).toContain('lg:static')
    expect(wrapper.get('aside').classes()).toContain('row-start-2')
    expect(wrapper.get('main').classes()).toContain('lg:col-start-2')
    expect(wrapper.find('footer').exists()).toBe(false)
    expect(wrapper.get('[data-testid="page-content"]').text()).toBe('Conteúdo')

    const headerLogo = wrapper.get('header img')
    expect(headerLogo.attributes('src')).toBe('/logo_vermelha.png')

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
