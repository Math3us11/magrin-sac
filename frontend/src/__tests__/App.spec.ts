import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'

import App from '@/App.vue'

afterEach(() => {
  vi.unstubAllGlobals()
  document.body.innerHTML = ''
})

describe('App', () => {
  it('não monta o shell nem consulta o menu antes de resolver a primeira rota', async () => {
    setActivePinia(createPinia())
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ message: 'Sessão inválida ou expirada.' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 401,
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    let releaseNavigation: () => void = () => {}
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', name: 'home', component: { template: '<p>Início</p>' } },
        {
          path: '/login',
          name: 'login',
          component: { template: '<p>Entrar</p>' },
          meta: { hideShell: true },
        },
      ],
    })
    // Simula o guard real, que aguarda a sessão antes de redirecionar ao login.
    router.beforeEach(async (to) => {
      if (to.name === 'login') return true
      await new Promise<void>((resolve) => {
        releaseNavigation = resolve
      })
      return { name: 'login' }
    })

    void router.push('/')
    const wrapper = mount(App, { attachTo: document.body, global: { plugins: [router] } })
    await flushPromises()

    expect(wrapper.find('header').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('Pular para o conteúdo')

    releaseNavigation()
    await router.isReady()
    await flushPromises()

    expect(wrapper.text()).toContain('Entrar')
    expect(wrapper.find('header').exists()).toBe(false)
    expect(fetchMock).not.toHaveBeenCalled()
    expect(document.body.textContent).not.toContain('Sessão inválida ou expirada')

    wrapper.unmount()
  })
})
