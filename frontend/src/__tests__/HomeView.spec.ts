import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { describe, expect, it } from 'vitest'

import { useAuthStore } from '@/stores/auth'
import HomeView from '@/views/HomeView.vue'

describe('HomeView', () => {
  it('apresenta a base do sistema e seus módulos planejados', () => {
    setActivePinia(createPinia())
    const auth = useAuthStore()
    auth.user = {
      birthDate: null,
      email: 'admin@example.com',
      id: 1,
      name: 'Matheus Administrador',
      userType: 'administrador',
    }
    const wrapper = mount(HomeView)

    expect(wrapper.get('h1').text()).toContain('Olá, Matheus')
    expect(wrapper.findAll('article')).toHaveLength(4)
    expect(wrapper.text()).toContain('Próxima etapa')
  })
})
