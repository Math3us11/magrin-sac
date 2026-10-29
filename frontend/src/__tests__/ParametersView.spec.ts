import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const parameterMocks = vi.hoisted(() => ({
  listSystemParameters: vi.fn(),
  updateSystemParameter: vi.fn(),
}))

vi.mock('@/services/system-parameters', () => parameterMocks)

import { ApiError } from '@/services/api'
import ParametersView from '@/views/administration/ParametersView.vue'

const NAME = 'APPOINTMENT_CANCELLATION_MIN_NOTICE_MINUTES'

function parameter(overrides: Record<string, unknown> = {}) {
  return {
    description: 'Antecedência mínima para aluno e professor cancelarem um agendamento.',
    fallback: 120,
    label: 'Antecedência mínima de cancelamento',
    max: 10080,
    min: 0,
    name: NAME,
    unit: 'minutes',
    updatedAt: '2099-10-01T12:00:00.000Z',
    updatedBy: { id: 3, name: 'Administrador Teste' },
    usingFallback: false,
    value: 120,
    ...overrides,
  }
}

async function submit(wrapper: ReturnType<typeof mount>) {
  expect(wrapper.get(`[data-testid="save-parameter-${NAME}"]`).attributes('type')).toBe('submit')
  await wrapper.get('form').trigger('submit')
}

describe('ParametersView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    parameterMocks.listSystemParameters.mockReset().mockResolvedValue({
      parameters: [parameter()],
    })
    parameterMocks.updateSystemParameter.mockReset().mockResolvedValue({
      message: 'Parâmetro atualizado com sucesso.',
      parameter: parameter({ updatedAt: '2099-10-02T15:30:00.000Z', value: 90 }),
    })
  })

  it('apresenta o valor em uso, os limites e o último responsável', async () => {
    const wrapper = mount(ParametersView)

    await expect.poll(() => wrapper.text()).toContain('Antecedência mínima de cancelamento')
    expect(wrapper.get('h1').text()).toBe('Parâmetros')
    expect(wrapper.get('[data-testid="parameter-current-value"]').text()).toBe(
      '120 minutos (2 horas)',
    )
    expect(wrapper.text()).toContain('por Administrador Teste')
    expect(wrapper.text()).toContain('Entre 0 e 10080 minutos.')
    expect(wrapper.text()).not.toContain('valor aprovado')
  })

  it('exige motivo e valor válido antes de salvar', async () => {
    const wrapper = mount(ParametersView)
    await expect.poll(() => wrapper.find('form').exists()).toBe(true)

    await submit(wrapper)
    await expect.poll(() => wrapper.text()).toContain('O novo valor é igual ao valor atual.')
    expect(wrapper.text()).toContain('Informe o motivo da alteração.')

    await wrapper.get('input[name="value"]').setValue('20000')
    await submit(wrapper)
    await expect.poll(() => wrapper.text()).toContain('Informe um número inteiro entre 0 e 10080.')
    expect(parameterMocks.updateSystemParameter).not.toHaveBeenCalled()
  })

  it('salva com motivo e mostra o novo valor retornado pelo backend', async () => {
    const wrapper = mount(ParametersView)
    await expect.poll(() => wrapper.find('form').exists()).toBe(true)

    await wrapper.get('input[name="value"]').setValue('90')
    await wrapper.get('textarea[name="reason"]').setValue('  Decisão da coordenação.  ')
    await submit(wrapper)

    await expect
      .poll(() => parameterMocks.updateSystemParameter)
      .toHaveBeenCalledWith(NAME, { reason: 'Decisão da coordenação.', value: 90 })
    expect(parameterMocks.updateSystemParameter).toHaveBeenCalledOnce()
    await expect
      .poll(() => wrapper.get('[data-testid="parameter-current-value"]').text())
      .toBe('90 minutos (1 hora e 30 minutos)')
    expect((wrapper.get('textarea[name="reason"]').element as HTMLTextAreaElement).value).toBe('')
  })

  it('mostra o erro do backend e o aviso de valor aprovado em uso', async () => {
    parameterMocks.listSystemParameters.mockResolvedValue({
      parameters: [parameter({ updatedAt: null, updatedBy: null, usingFallback: true })],
    })
    parameterMocks.updateSystemParameter.mockRejectedValueOnce(
      new ApiError(400, 'O valor deve estar entre 0 e 10080.', 'warning'),
    )
    const wrapper = mount(ParametersView)
    await expect
      .poll(() => wrapper.text())
      .toContain('O sistema usa o valor aprovado de 120 minutos')
    expect(wrapper.text()).toContain('Nunca alterado pela interface.')

    await wrapper.get('input[name="value"]').setValue('60')
    await wrapper.get('textarea[name="reason"]').setValue('Ajuste.')
    await submit(wrapper)

    await expect.poll(() => wrapper.text()).toContain('O valor deve estar entre 0 e 10080.')
  })
})
