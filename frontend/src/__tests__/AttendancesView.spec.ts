import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const attendanceMocks = vi.hoisted(() => ({
  getAttendance: vi.fn(),
  listAttendances: vi.fn(),
  updateAttendanceStatus: vi.fn(),
}))

vi.mock('@/services/attendance', () => attendanceMocks)

import AttendanceDetailsView from '@/views/attendance/AttendanceDetailsView.vue'
import AttendancesView from '@/views/attendance/AttendancesView.vue'

function createAttendanceRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/administracao/atendimentos',
        name: 'administration-attendances',
        component: AttendancesView,
        props: { scope: 'admin' },
      },
      {
        path: '/administracao/atendimentos/:attendanceId',
        name: 'administration-attendances-view',
        component: AttendanceDetailsView,
        props: { scope: 'admin' },
      },
      {
        path: '/professor/atendimentos',
        name: 'professor-attendances',
        component: AttendancesView,
        props: { scope: 'professor' },
      },
      {
        path: '/professor/atendimentos/:attendanceId',
        name: 'professor-attendances-view',
        component: AttendanceDetailsView,
        props: { scope: 'professor' },
      },
    ],
  })
}

const listItem = {
  appointment: {
    endsAt: '2099-10-15T15:00:00.000Z',
    id: 30,
    modality: 'online' as const,
    professor: { id: 8, name: 'Professor Teste' },
    protocol: 'AG-20991015-ABCDEF',
    startsAt: '2099-10-15T14:00:00.000Z',
    student: { id: 9, name: 'Aluno Teste' },
    subject: 'Orientação acadêmica',
  },
  continuityResponsible: 'Coordenação',
  dueDate: '2099-10-20',
  id: 40,
  occurrence: 'realizado' as const,
  recordedAt: '2099-10-15T15:00:00.000Z',
  resolutionStatus: 'em_tratativa' as const,
  updatedAt: '2099-10-15T15:00:00.000Z',
}

describe('AttendancesView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    attendanceMocks.listAttendances.mockReset().mockResolvedValue({
      attendances: [listItem],
      range: { from: '2099-10-01', to: '2099-10-31' },
    })
    attendanceMocks.getAttendance.mockReset().mockResolvedValue({
      attendance: {
        ...listItem,
        appointment: { ...listItem.appointment, details: 'Levar documentos.' },
        internalNotes: 'Aguardar análise do setor.',
        nextStep: 'Validar documentos.',
        referral: null,
        solution: null,
        unresolvedReason: null,
        updatedBy: { id: 8, name: 'Professor Teste' },
      },
      history: [
        {
          actor: { id: 8, name: 'Professor Teste' },
          changedAt: '2099-10-15T15:00:00.000Z',
          changeReason: 'Registro inicial do atendimento.',
          id: 50,
          occurrence: 'realizado',
          resolutionStatus: 'em_tratativa',
        },
      ],
    })
  })

  it('lista os atendimentos em tabela e navega para a exibição específica', async () => {
    const router = createAttendanceRouter()
    await router.push('/administracao/atendimentos')
    await router.isReady()

    const wrapper = mount(AttendancesView, {
      global: { plugins: [router], stubs: { teleport: true } },
      props: { scope: 'admin' },
    })
    await flushPromises()

    expect(attendanceMocks.listAttendances).toHaveBeenCalledWith(
      'admin',
      expect.objectContaining({ from: expect.any(String), to: expect.any(String) }),
    )
    expect(attendanceMocks.getAttendance).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('Resultados registrados')
    expect(wrapper.text()).toContain('AG-20991015-ABCDEF')
    expect(wrapper.text()).not.toContain('Aguardar análise do setor.')

    await wrapper.get('[data-testid="show-attendance-40"]').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.name).toBe('administration-attendances-view')
    expect(router.currentRoute.value.params.attendanceId).toBe('40')
    expect(attendanceMocks.getAttendance).not.toHaveBeenCalled()
  })

  it('carrega os dados internos e o histórico na página de exibição', async () => {
    const router = createAttendanceRouter()
    await router.push('/administracao/atendimentos/40')
    await router.isReady()

    const wrapper = mount(AttendanceDetailsView, {
      global: { plugins: [router], stubs: { teleport: true } },
      props: { scope: 'admin' },
    })
    await flushPromises()

    expect(attendanceMocks.getAttendance).toHaveBeenCalledWith('admin', 40)
    expect(wrapper.text()).toContain('Aguardar análise do setor.')
    expect(wrapper.text()).toContain('Registro inicial do atendimento.')
    expect(wrapper.text()).toContain('Atualizar tratativa')
  })
})
