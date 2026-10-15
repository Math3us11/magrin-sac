import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import AppointmentCancellationModal from '@/components/appointments/AppointmentCancellationModal.vue'

describe('AppointmentCancellationModal', () => {
  it('exige motivo e senha no cancelamento administrativo', async () => {
    const wrapper = mount(AppointmentCancellationModal, {
      global: { stubs: { teleport: true } },
      props: { open: true, requiresPassword: true },
    })
    const confirmButton = wrapper
      .findAll('button')
      .find((button) => button.text() === 'Confirmar cancelamento')

    await confirmButton?.trigger('click')
    expect(wrapper.text()).toContain('Informe o motivo do cancelamento.')
    expect(wrapper.emitted('confirm')).toBeUndefined()

    await wrapper.get('textarea').setValue('Correção administrativa.')
    await confirmButton?.trigger('click')
    expect(wrapper.text()).toContain('Informe sua senha para confirmar o cancelamento.')

    await wrapper.get('input[type="password"]').setValue('senha-teste')
    await confirmButton?.trigger('click')
    expect(wrapper.emitted('confirm')?.[0]).toEqual([
      { password: 'senha-teste', reason: 'Correção administrativa.' },
    ])
  })

  it('não solicita senha no cancelamento do aluno ou professor', async () => {
    const wrapper = mount(AppointmentCancellationModal, {
      global: { stubs: { teleport: true } },
      props: { open: true },
    })

    await wrapper.get('textarea').setValue('Imprevisto acadêmico.')
    const confirmButton = wrapper
      .findAll('button')
      .find((button) => button.text() === 'Confirmar cancelamento')
    await confirmButton?.trigger('click')

    expect(wrapper.find('input[type="password"]').exists()).toBe(false)
    expect(wrapper.emitted('confirm')?.[0]).toEqual([{ reason: 'Imprevisto acadêmico.' }])
  })
})
