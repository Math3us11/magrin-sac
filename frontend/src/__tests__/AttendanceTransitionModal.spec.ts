import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import AttendanceTransitionModal from '@/components/attendance/AttendanceTransitionModal.vue'
import type { AttendanceDetail } from '@/types/attendance'

const attendance: AttendanceDetail = {
  appointment: {
    details: 'Detalhes autorizados.',
    endsAt: '2099-10-15T15:00:00.000Z',
    id: 30,
    modality: 'online',
    professor: { id: 8, name: 'Professor Teste' },
    protocol: 'AG-20991015-ABCDEF',
    startsAt: '2099-10-15T14:00:00.000Z',
    student: { id: 9, name: 'Aluno Teste' },
    subject: 'Orientação',
  },
  continuityResponsible: 'Coordenação',
  dueDate: '2099-10-20',
  id: 40,
  internalNotes: 'Nota interna.',
  nextStep: 'Aguardar documentos.',
  occurrence: 'realizado',
  recordedAt: '2099-10-15T15:00:00.000Z',
  referral: null,
  resolutionStatus: 'em_tratativa',
  solution: null,
  unresolvedReason: null,
  updatedAt: '2099-10-15T15:00:00.000Z',
  updatedBy: { id: 8, name: 'Professor Teste' },
}

describe('AttendanceTransitionModal', () => {
  it('exige motivo e dados condicionais antes de emitir a evolução', async () => {
    const wrapper = mount(AttendanceTransitionModal, {
      global: { stubs: { teleport: true } },
      props: { attendance, open: true },
    })
    const confirmButton = () =>
      wrapper.findAll('button').find((button) => button.text() === 'Salvar evolução')

    await confirmButton()?.trigger('click')
    expect(wrapper.text()).toContain('Informe o motivo da alteração.')

    await wrapper.get('#transition-reason').setValue('Documentos recebidos e analisados.')
    await wrapper.get('#transition-status').setValue('resolvido')
    await confirmButton()?.trigger('click')
    expect(wrapper.text()).toContain('Informe a solução ou o encaminhamento realizado.')

    await wrapper.get('#transition-solution').setValue('Pendência regularizada.')
    await confirmButton()?.trigger('click')

    expect(wrapper.emitted('confirm')?.[0]?.[0]).toMatchObject({
      changeReason: 'Documentos recebidos e analisados.',
      internalNotes: 'Nota interna.',
      resolutionStatus: 'resolvido',
      solution: 'Pendência regularizada.',
    })
  })
})
