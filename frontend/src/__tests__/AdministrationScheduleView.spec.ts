import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getInstitutionDateTime } from '@/config/date-time'
import ScheduleView from '@/views/administration/ScheduleView.vue'

const appointmentMocks = vi.hoisted(() => ({
  listAdminAppointments: vi.fn(),
}))
const availabilityMocks = vi.hoisted(() => ({
  listAdminAvailabilities: vi.fn(),
}))

vi.mock('@/services/appointments', () => appointmentMocks)
vi.mock('@/services/availability', () => availabilityMocks)

describe('Agenda geral administrativa', () => {
  beforeEach(() => {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)
    const date = getInstitutionDateTime(tomorrow).date
    availabilityMocks.listAdminAvailabilities.mockReset().mockResolvedValue({
      availabilities: [
        {
          endsAt: `${date}T16:00:00.000Z`,
          id: 15,
          modalities: ['presencial', 'online'],
          professor: { id: 8, isActive: true, name: 'Professor Teste' },
          startsAt: `${date}T14:00:00.000Z`,
          state: 'ativa',
        },
      ],
      range: { from: `${date.slice(0, 7)}-01`, to: date },
      summary: { active: 1, blocked: 0, cancelled: 0 },
    })
    appointmentMocks.listAdminAppointments.mockReset().mockResolvedValue({
      appointments: [
        {
          endsAt: `${date}T15:00:00.000Z`,
          id: 30,
          modality: 'online',
          professor: { id: 8, name: 'Professor Teste' },
          protocol: 'AG-2026-0001',
          startsAt: `${date}T14:00:00.000Z`,
          status: 'confirmado',
          student: { id: 4, name: 'Aluno Teste' },
          subject: 'Orientação acadêmica',
        },
      ],
      range: { from: `${date.slice(0, 7)}-01`, to: date },
    })
  })

  it('apresenta disponibilidades e agendamentos globais sem ações de alteração', async () => {
    const wrapper = mount(ScheduleView)

    await expect.poll(() => wrapper.text()).toContain('AG-2026-0001')
    expect(wrapper.get('h1').text()).toBe('Agenda geral')
    expect(wrapper.text()).toContain('Somente consulta')
    expect(wrapper.text()).toContain('Aluno Teste')
    expect(wrapper.text()).toContain('Professor Teste')
    expect(availabilityMocks.listAdminAvailabilities).toHaveBeenCalledOnce()
    expect(appointmentMocks.listAdminAppointments).toHaveBeenCalledOnce()
    expect(wrapper.text()).not.toContain('Cancelar agendamento')
  })

  it('aplica filtros separadamente nas duas consultas administrativas', async () => {
    const wrapper = mount(ScheduleView)
    await expect.poll(() => appointmentMocks.listAdminAppointments).toHaveBeenCalledOnce()

    const selects = wrapper.findAll('select')
    await selects[0]?.setValue('online')
    await selects[1]?.setValue('ativa')
    await selects[2]?.setValue('confirmado')
    const filterButton = wrapper
      .findAll('button')
      .find((button) => button.text() === 'Aplicar filtros')
    await filterButton?.trigger('click')

    await expect.poll(() => availabilityMocks.listAdminAvailabilities).toHaveBeenCalledTimes(2)
    expect(availabilityMocks.listAdminAvailabilities.mock.calls[1]?.[0]).toMatchObject({
      modality: 'online',
      state: 'ativa',
    })
    expect(appointmentMocks.listAdminAppointments.mock.calls[1]?.[0]).toMatchObject({
      status: 'confirmado',
    })
  })
})
