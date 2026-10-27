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

  it('informa o prazo calculado pelo backend no horário institucional', async () => {
    const withDeadline = mount(AppointmentCancellationModal, {
      global: { stubs: { teleport: true } },
      props: { cancellableUntil: '2099-10-03T12:00:00.000Z', open: true },
    })
    expect(withDeadline.text()).toContain('Cancelamento permitido até 03/10/2099, 08:00.')
    expect(withDeadline.text()).not.toContain('2 horas')

    const withoutDeadline = mount(AppointmentCancellationModal, {
      global: { stubs: { teleport: true } },
      props: { cancellableUntil: null, open: true },
    })
    expect(withoutDeadline.text()).not.toContain('Cancelamento permitido até')
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
