import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import MyAppointmentsView from '@/views/appointments/MyAppointmentsView.vue'

const appointmentMocks = vi.hoisted(() => ({
  listOwnAppointments: vi.fn(),
}))

vi.mock('@/services/appointments', () => appointmentMocks)

const appointment = {
  cancelledAt: null,
  cancellationReason: null,
  details: 'Levar histórico acadêmico.',
  endsAt: '2099-10-03T15:00:00.000Z',
  id: 30,
  modality: 'online',
  professor: { id: 8, name: 'Professor Teste' },
  protocol: 'AG-20991003-ABCDEF1234',
  startsAt: '2099-10-03T14:00:00.000Z',
  status: 'confirmado',
  subject: 'Orientação acadêmica',
}

describe('MyAppointmentsView', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    appointmentMocks.listOwnAppointments.mockReset().mockResolvedValue({
      appointments: [appointment],
      page: 1,
      pageSize: 8,
      total: 1,
    })
  })

  it('destaca o próximo compromisso e abre os detalhes sem expor outro aluno', async () => {
    const wrapper = mount(MyAppointmentsView, {
      attachTo: document.body,
      global: { stubs: { RouterLink: { template: '<a><slot /></a>' } } },
    })

    await expect
      .poll(() => appointmentMocks.listOwnAppointments)
      .toHaveBeenCalledWith({
        modality: undefined,
        page: 1,
        pageSize: 8,
        scope: 'upcoming',
        status: undefined,
      })
    expect(wrapper.get('[data-testid="next-appointment"]').text()).toContain('Professor Teste')

    await wrapper.get('[data-testid="next-appointment"] button').trigger('click')
    expect(document.body.textContent).toContain('AG-20991003-ABCDEF1234')
    expect(document.body.textContent).toContain('Levar histórico acadêmico.')
  })

  it('alterna para histórico e calendário usando consultas próprias', async () => {
    const wrapper = mount(MyAppointmentsView, {
      global: { stubs: { RouterLink: { template: '<a><slot /></a>' } } },
    })
    await expect.poll(() => appointmentMocks.listOwnAppointments).toHaveBeenCalledTimes(1)

    await wrapper.get('button[role="tab"]:nth-child(2)').trigger('click')
    await expect.poll(() => appointmentMocks.listOwnAppointments).toHaveBeenCalledTimes(2)
    expect(appointmentMocks.listOwnAppointments.mock.calls[1]?.[0]).toMatchObject({
      scope: 'history',
    })

    await wrapper.get('button[role="tab"]:nth-child(3)').trigger('click')
    await expect.poll(() => appointmentMocks.listOwnAppointments).toHaveBeenCalledTimes(3)
    expect(appointmentMocks.listOwnAppointments.mock.calls[2]?.[0]).toEqual(
      expect.objectContaining({
        from: expect.stringMatching(/^\d{4}-\d{2}-01$/),
        to: expect.any(String),
      }),
    )
    expect(wrapper.get('[data-testid="calendar-day-summary"]').text()).toContain(
      'Nenhum agendamento nesta data',
    )
    expect(wrapper.find('[data-testid="calendar-selected-agenda"]').exists()).toBe(false)
  })
})
