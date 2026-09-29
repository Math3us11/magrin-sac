import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'

import LoginView from '@/views/LoginView.vue'

afterEach(() => {
  vi.unstubAllGlobals()
  document.body.innerHTML = ''
})

async function mountLoginView() {
  const pinia = createPinia()
  setActivePinia(pinia)
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div>Home</div>' } },
      { path: '/login', component: LoginView },
    ],
  })
  await router.push('/login')
  await router.isReady()

  return mount(LoginView, {
    attachTo: document.body,
    global: { plugins: [pinia, router] },
  })
}

describe('LoginView', () => {
  it('apresenta o acesso institucional sem oferecer cadastro público', async () => {
    const wrapper = await mountLoginView()

    expect(wrapper.get('h2').text()).toBe('Bem-vindo de volta.')
    expect(wrapper.get('input[type="email"]').attributes('autocomplete')).toBe('username')
    expect(wrapper.get('input[type="password"]').attributes('autocomplete')).toBe(
      'current-password',
    )
    expect(wrapper.text()).toContain('Experiência universitária')
    expect(wrapper.text()).not.toContain('Ciência da Computação')
    expect(wrapper.text()).toContain('Contas administrativas e docentes são criadas internamente')
    expect(wrapper.text()).not.toContain('Criar conta')
  })

  it('valida os campos antes de chamar a API e foca o primeiro erro', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const wrapper = await mountLoginView()

    await wrapper.get('form').trigger('submit')
    await vi.waitFor(() => expect(wrapper.text()).toContain('Informe seu e-mail.'))

    expect(wrapper.text()).toContain('Informe sua senha.')
    expect(fetchMock).not.toHaveBeenCalled()
    expect(document.activeElement).toBe(wrapper.get('input[name="email"]').element)
    expect(wrapper.get('input[name="email"]').attributes('aria-invalid')).toBe('true')
  })

  it('permite revelar e ocultar a senha sem enviar o formulário', async () => {
    const wrapper = await mountLoginView()
    const password = wrapper.get('input[name="password"]')
    const revealButton = wrapper.get('button[aria-label="Mostrar senha"]')

    await revealButton.trigger('click')

    expect(password.attributes('type')).toBe('text')
    expect(wrapper.get('button[aria-label="Ocultar senha"]').attributes('aria-pressed')).toBe(
      'true',
    )
  })

  it('apresenta a mensagem segura quando as credenciais são inválidas', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ message: 'E-mail ou senha inválidos.' }), {
          headers: { 'Content-Type': 'application/json' },
          status: 401,
        }),
      ),
    )
    const wrapper = await mountLoginView()

    await wrapper.get('input[type="email"]').setValue('admin@example.com')
    await wrapper.get('input[type="password"]').setValue('wrong-password')
    await wrapper.get('form').trigger('submit')
    await vi.waitFor(() =>
      expect(wrapper.get('[data-testid="login-error"]').text()).toContain(
        'E-mail ou senha inválidos.',
      ),
    )

    expect(wrapper.get('[data-testid="login-error"]').text()).toContain(
      'E-mail ou senha inválidos.',
    )
    expect(wrapper.get('input[name="password"]').element).toHaveProperty('value', '')
  })
})
