import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getInstitutionDateTime, institutionLocalToUtc } from '@/config/date-time'
import NewAppointmentView from '@/views/appointments/NewAppointmentView.vue'

const availabilityMocks = vi.hoisted(() => ({
  listStudentAvailabilities: vi.fn(),
}))
const appointmentMocks = vi.hoisted(() => ({
  createAppointment: vi.fn(),
}))

vi.mock('@/services/availability', () => availabilityMocks)
vi.mock('@/services/appointments', () => appointmentMocks)

describe('NewAppointmentView', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)
    const date = getInstitutionDateTime(tomorrow).date
    availabilityMocks.listStudentAvailabilities.mockReset().mockResolvedValue({
      availabilities: [
        {
          endsAt: `${date}T16:00:00.000Z`,
          freeIntervals: [
            {
              endsAt: `${date}T16:00:00.000Z`,
              startsAt: `${date}T14:00:00.000Z`,
            },
          ],
          id: 10,
          modalities: ['presencial', 'online'],
          professor: { id: 8, name: 'Professor Teste' },
          startsAt: `${date}T14:00:00.000Z`,
        },
      ],
      range: { from: date.slice(0, 7) + '-01', to: date },
    })
    appointmentMocks.createAppointment.mockReset().mockResolvedValue({
      appointment: {
        details: 'Dúvidas sobre a documentação.',
        endsAt: `${date}T16:00:00.000Z`,
        id: 30,
        modality: 'presencial',
        professor: { id: 8, name: 'Professor Teste' },
        protocol: 'AG-20991003-ABCDEF1234',
        startsAt: `${date}T14:00:00.000Z`,
        status: 'confirmado',
        subject: 'Orientação sobre estágio',
      },
      message: 'Agendamento confirmado com sucesso.',
    })
  })

  it('consulta o mês e mostra o resumo do dia na lateral antes de selecionar uma janela', async () => {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)
    const date = getInstitutionDateTime(tomorrow).date
    const wrapper = mount(NewAppointmentView)

    await expect.poll(() => wrapper.text()).toContain('1 janela(s) livre(s)')
    expect(availabilityMocks.listStudentAvailabilities).toHaveBeenCalledOnce()
    expect(wrapper.get('h1').text()).toBe('Novo agendamento')

    await wrapper.get(`[data-testid="calendar-day-${date}"]`).trigger('click')

    const daySummary = wrapper.get('[data-testid="selected-day-summary"]')
    expect(daySummary.text()).toContain('Professor Teste')
    expect(daySummary.text()).toContain('Presencial ou online')
    expect(wrapper.find('[data-testid="calendar-selected-agenda"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="selected-availability"]').exists()).toBe(false)

    await wrapper.get('[data-testid^="day-interval-"]').trigger('click')
    expect(wrapper.get('[data-testid="selected-availability"]').text()).toContain('Professor Teste')
  })

  it('refaz a consulta quando a modalidade muda', async () => {
    const wrapper = mount(NewAppointmentView)
    await expect.poll(() => availabilityMocks.listStudentAvailabilities).toHaveBeenCalledOnce()

    const onlineButton = wrapper.findAll('button').find((button) => button.text() === 'Online')
    await onlineButton?.trigger('click')

    await expect.poll(() => availabilityMocks.listStudentAvailabilities).toHaveBeenCalledTimes(2)
    expect(availabilityMocks.listStudentAvailabilities.mock.calls[1]?.[0]).toMatchObject({
      modality: 'online',
    })
  })

  it('preenche os dados dentro da janela e abre a revisão sem simular uma reserva', async () => {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)
    const date = getInstitutionDateTime(tomorrow).date
    const wrapper = mount(NewAppointmentView, { attachTo: document.body })

    await expect.poll(() => wrapper.text()).toContain('1 janela(s) livre(s)')
    await wrapper.get(`[data-testid="calendar-day-${date}"]`).trigger('click')
    await wrapper.get('[data-testid^="day-interval-"]').trigger('click')

    expect(wrapper.get('[data-testid="appointment-form"]').text()).toContain('Dados do atendimento')
    await wrapper.get('input[name="subject"]').setValue('Orientação sobre estágio')
    await wrapper.get('textarea[name="details"]').setValue('Dúvidas sobre a documentação.')
    await wrapper.get('[data-testid="appointment-form"]').trigger('submit')

    await expect.poll(() => document.body.textContent).toContain('Revise seu agendamento')
    const review = document.querySelector('[data-testid="appointment-review"]')
    expect(review?.textContent).toContain('Professor Teste')
    expect(review?.textContent).toContain('Presencial')
    expect(review?.textContent).toContain('Orientação sobre estágio')
    expect(review?.textContent).toContain('Nenhum horário foi reservado nesta revisão')

    wrapper.unmount()
  })

  it('mantém o resumo lateral e informa quando a data não possui horários livres', async () => {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)
    const date = getInstitutionDateTime(tomorrow).date
    const emptyDateValue = new Date(`${date}T12:00:00.000Z`)
    emptyDateValue.setUTCDate(emptyDateValue.getUTCDate() + 1)
    const emptyDate = emptyDateValue.toISOString().slice(0, 10)
    const wrapper = mount(NewAppointmentView)

    await expect.poll(() => wrapper.text()).toContain('1 janela(s) livre(s)')
    await wrapper.get(`[data-testid="calendar-day-${emptyDate}"]`).trigger('click')

    const daySummary = wrapper.get('[data-testid="selected-day-summary"]')
    expect(daySummary.get('[data-testid="selected-day-empty"]').text()).toContain(
      'Nenhum horário livre nesta data',
    )
    expect(wrapper.find('[data-testid="appointment-form"]').exists()).toBe(false)
  })

  it('confirma a revisão no servidor, envia instantes UTC e exibe o protocolo', async () => {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)
    const date = getInstitutionDateTime(tomorrow).date
    const wrapper = mount(NewAppointmentView, { attachTo: document.body })

    await expect.poll(() => wrapper.text()).toContain('1 janela(s) livre(s)')
    await wrapper.get(`[data-testid="calendar-day-${date}"]`).trigger('click')
    await wrapper.get('[data-testid^="day-interval-"]').trigger('click')
    await wrapper.get('input[name="subject"]').setValue('Orientação sobre estágio')
    await wrapper.get('textarea[name="details"]').setValue('Dúvidas sobre a documentação.')
    await wrapper.get('[data-testid="appointment-form"]').trigger('submit')
    await expect.poll(() => document.body.textContent).toContain('Revise seu agendamento')

    document.querySelector<HTMLButtonElement>('[data-testid="confirm-appointment"]')?.click()

    await expect.poll(() => appointmentMocks.createAppointment).toHaveBeenCalledOnce()
    expect(appointmentMocks.createAppointment).toHaveBeenCalledWith({
      availabilityId: 10,
      details: 'Dúvidas sobre a documentação.',
      endsAt: institutionLocalToUtc(date, '12:00').toISOString(),
      modality: 'presencial',
      startsAt: institutionLocalToUtc(date, '10:00').toISOString(),
      subject: 'Orientação sobre estágio',
    })
    await expect.poll(() => document.body.textContent).toContain('AG-20991003-ABCDEF1234')
    expect(
      document.querySelector('[data-testid="appointment-confirmation"]')?.textContent,
    ).toContain('Professor Teste')

    wrapper.unmount()
  })
})
