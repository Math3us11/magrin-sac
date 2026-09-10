import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import HomeView from '@/views/HomeView.vue'

describe('HomeView', () => {
  it('apresenta a base do sistema e seus módulos planejados', () => {
    const wrapper = mount(HomeView)

    expect(wrapper.get('h1').text()).toContain('Agendamentos claros')
    expect(wrapper.findAll('article')).toHaveLength(4)
    expect(wrapper.text()).toContain('Próxima etapa')
  })
})
