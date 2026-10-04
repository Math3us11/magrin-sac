import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import AvailabilityView from '@/views/professor/AvailabilityView.vue'

const availabilityMocks = vi.hoisted(() => ({
  createAvailabilities: vi.fn(),
  listOwnAvailabilities: vi.fn(),
}))

vi.mock('@/services/availability', () => availabilityMocks)

describe('AvailabilityView do professor', () => {
  beforeEach(() => {
    availabilityMocks.createAvailabilities.mockReset().mockResolvedValue({
      availabilities: [],
      message: 'Disponibilidade publicada com sucesso.',
    })
    availabilityMocks.listOwnAvailabilities.mockReset().mockResolvedValue({
      availabilities: [],
      summary: { available: 0, blocked: 0, reserved: 0 },
    })
  })

  it('apresenta a agenda própria em estado inicial sem simular dados publicados', async () => {
    const wrapper = mount(AvailabilityView, {
      global: { stubs: { Teleport: true } },
    })

    await expect.poll(() => wrapper.text()).toContain('Nenhum horário publicado ainda')
    expect(wrapper.get('h1').text()).toBe('Minha agenda')
    expect(wrapper.text()).toContain('Agenda própria')
    expect(wrapper.text()).toContain('Disponíveis')
    expect(wrapper.text()).toContain('Reservados')
    expect(wrapper.text()).toContain('Bloqueados')
    expect(wrapper.get('[data-testid="open-availability-modal"]').attributes()).not.toHaveProperty(
      'disabled',
    )
    expect(availabilityMocks.listOwnAvailabilities).toHaveBeenCalledOnce()
  })

  it('valida o período e publica o lote preparado', async () => {
    const wrapper = mount(AvailabilityView, {
      global: { stubs: { Teleport: true } },
    })

    await wrapper.get('[data-testid="open-availability-modal"]').trigger('click')

    expect(wrapper.get('[role="dialog"]').text()).toContain('America/Porto_Velho')

    await wrapper.get('input[name="date"]').setValue('2099-10-03')
    await wrapper.get('input[name="startTime"]').setValue('14:00')
    await wrapper.get('input[name="endTime"]').setValue('13:00')
    await wrapper.get('input[type="checkbox"][value="presencial"]').setValue(true)
    await wrapper.get('#availability-draft-form').trigger('submit')

    await expect.poll(() => wrapper.text()).toContain('O término deve ser posterior ao início.')

    await wrapper.get('input[name="endTime"]').setValue('14:45')
    await wrapper.get('#availability-draft-form').trigger('submit')

    await expect.poll(() => wrapper.text()).toContain('14:00–14:45')
    expect(wrapper.text()).toContain('1 horário preparado')

    const publishButton = wrapper
      .findAll('button')
      .find((button) => button.text().includes('Publicar 1 horário'))
    expect(publishButton).toBeDefined()
    await publishButton?.trigger('click')

    await expect
      .poll(() => availabilityMocks.createAvailabilities)
      .toHaveBeenCalledWith({
        items: [
          {
            date: '2099-10-03',
            endTime: '14:45',
            modalities: ['presencial'],
            startTime: '14:00',
          },
        ],
      })
    await expect.poll(() => wrapper.find('[role="dialog"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('1 horário preparado')
    expect(availabilityMocks.listOwnAvailabilities).toHaveBeenCalledTimes(2)
  })

  it('renderiza somente disponibilidades retornadas pelo backend', async () => {
    availabilityMocks.listOwnAvailabilities.mockResolvedValue({
      availabilities: [
        {
          endsAt: '2099-10-03T18:45:00.000Z',
          id: 15,
          modalities: ['presencial', 'online'],
          startsAt: '2099-10-03T18:00:00.000Z',
          state: 'ativa',
        },
      ],
      summary: { available: 1, blocked: 0, reserved: 0 },
    })
    const wrapper = mount(AvailabilityView, {
      global: { stubs: { Teleport: true } },
    })

    await expect.poll(() => wrapper.text()).toContain('14:00–14:45')
    expect(wrapper.text()).toContain('Presencial e online')
    expect(wrapper.get('[aria-label="1 Disponíveis"]').text()).toBe('1')
    expect(wrapper.text()).not.toContain('Nenhum horário publicado ainda')
  })

  it('expande dias da semana e múltiplas faixas em disponibilidades concretas', async () => {
    const wrapper = mount(AvailabilityView, {
      global: { stubs: { Teleport: true } },
    })

    await wrapper.get('[data-testid="open-availability-modal"]').trigger('click')
    const weeklyTab = wrapper
      .findAll('button')
      .find((button) => button.text().includes('Dias da semana'))
    await weeklyTab?.trigger('click')

    expect(wrapper.find('input[name="startDate"]').exists()).toBe(false)
    expect(wrapper.find('input[name="endDate"]').exists()).toBe(false)

    const monday = wrapper.get('input[name="weekdays"][value="1"]')
    const friday = wrapper.get('input[name="weekdays"][value="5"]')
    const mondayDate = monday.attributes('data-date')
    const fridayDate = friday.attributes('data-date')

    for (const weekday of [1, 3, 5]) {
      await wrapper.get(`input[name="weekdays"][value="${weekday}"]`).setValue(true)
    }
    expect(monday.element.closest('label')?.classList).toContain('bg-brand-primary-soft')
    expect(
      wrapper.get('input[name="weekdays"][value="2"]').element.closest('label')?.classList,
    ).not.toContain('bg-brand-primary-soft')
    await wrapper.get('input[name="windows[0].startTime"]').setValue('08:00')
    await wrapper.get('input[name="windows[0].endTime"]').setValue('14:00')
    await wrapper.get('[data-testid="add-weekly-window"]').trigger('click')
    await wrapper.get('input[name="windows[1].startTime"]').setValue('14:00')
    await wrapper.get('input[name="windows[1].endTime"]').setValue('18:00')
    await wrapper.get('input[type="checkbox"][value="presencial"]').setValue(true)
    await wrapper.get('#weekly-availability-form').trigger('submit')

    await expect.poll(() => wrapper.text()).toContain('6 horários preparados')
    expect(wrapper.text()).toContain('08:00–14:00')
    expect(wrapper.text()).toContain('14:00–18:00')
    expect(wrapper.text()).not.toContain('terça-feira')

    const publishButton = wrapper
      .findAll('button')
      .find((button) => button.text().includes('Publicar 6 horários'))
    await publishButton?.trigger('click')

    await expect.poll(() => availabilityMocks.createAvailabilities).toHaveBeenCalledOnce()
    const payload = availabilityMocks.createAvailabilities.mock.calls[0]?.[0]
    expect(payload.items).toHaveLength(6)
    expect(payload.items[0]).toEqual({
      date: mondayDate,
      endTime: '14:00',
      modalities: ['presencial'],
      startTime: '08:00',
    })
    expect(payload.items[5]).toEqual({
      date: fridayDate,
      endTime: '18:00',
      modalities: ['presencial'],
      startTime: '14:00',
    })
  })
})
