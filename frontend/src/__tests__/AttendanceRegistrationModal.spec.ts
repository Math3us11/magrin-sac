import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import AttendanceRegistrationModal from '@/components/appointments/AttendanceRegistrationModal.vue'

function confirmButton(wrapper: ReturnType<typeof mount>) {
  return wrapper.findAll('button').find((button) => button.text() === 'Registrar resultado')
}

describe('AttendanceRegistrationModal', () => {
  it('exige classificação e os dados mínimos do resultado realizado', async () => {
    const wrapper = mount(AttendanceRegistrationModal, {
      global: { stubs: { teleport: true } },
      props: { open: true },
    })

    await confirmButton(wrapper)?.trigger('click')
    expect(wrapper.text()).toContain('Informe a classificação do atendimento.')

    await wrapper.get('#resolution-status').setValue('resolvido')
    await confirmButton(wrapper)?.trigger('click')
    expect(wrapper.text()).toContain('Informe a solução ou o encaminhamento realizado.')

    await wrapper.get('#attendance-solution').setValue('Orientação concluída.')
    await confirmButton(wrapper)?.trigger('click')
    expect(wrapper.emitted('confirm')?.[0]).toEqual([
      {
        internalNotes: undefined,
        occurrence: 'realizado',
        referral: undefined,
        resolutionStatus: 'resolvido',
        solution: 'Orientação concluída.',
      },
    ])
  })

  it('registra ausência sem solicitar classificação de resolução', async () => {
    const wrapper = mount(AttendanceRegistrationModal, {
      global: { stubs: { teleport: true } },
      props: { open: true },
    })

    await wrapper.get('input[value="ausencia"]').setValue(true)
    expect(wrapper.find('#resolution-status').exists()).toBe(false)
    await wrapper.get('#attendance-internal-notes').setValue('Aluno não compareceu.')
    await confirmButton(wrapper)?.trigger('click')
    expect(wrapper.emitted('confirm')?.[0]).toEqual([
      { internalNotes: 'Aluno não compareceu.', occurrence: 'ausencia' },
    ])
  })

  it('exige continuidade completa para atendimento em tratativa', async () => {
    const wrapper = mount(AttendanceRegistrationModal, {
      global: { stubs: { teleport: true } },
      props: { open: true },
    })

    await wrapper.get('#resolution-status').setValue('em_tratativa')
    await confirmButton(wrapper)?.trigger('click')
    expect(wrapper.text()).toContain('Informe responsável, próximo passo e prazo da tratativa.')
    expect(wrapper.emitted('confirm')).toBeUndefined()
  })
})
