import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const auditMocks = vi.hoisted(() => ({
  listAuditLogs: vi.fn(),
}))

vi.mock('@/services/audit', () => auditMocks)

import { ApiError } from '@/services/api'
import AuditView from '@/views/administration/AuditView.vue'

const entries = [
  {
    action: 'user.updated',
    actor: { id: 3, name: 'Administrador Teste' },
    changes: {
      cpf: { redacted: true },
      isActive: { from: true, to: false },
      name: { from: 'Aluno Antigo', to: 'Aluno Novo' },
    },
    entityId: 10,
    entityType: 'user',
    id: 2,
    occurredAt: '2099-10-05T15:30:00.000Z',
    reason: null,
  },
  {
    action: 'appointment.cancelled',
    actor: null,
    changes: { status: { from: 'confirmado', to: 'cancelado' } },
    entityId: 30,
    entityType: 'appointment',
    id: 1,
    occurredAt: '2099-10-05T14:00:00.000Z',
    reason: 'Correção administrativa.',
  },
]

describe('AuditView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    auditMocks.listAuditLogs.mockReset().mockResolvedValue({
      entries,
      page: 1,
      pageSize: 20,
      range: { from: '2099-10-01', to: '2099-10-31' },
      total: 2,
    })
  })

  it('lista operações com responsável, alterações legíveis e dados sensíveis protegidos', async () => {
    const wrapper = mount(AuditView)

    await expect.poll(() => wrapper.text()).toContain('Administrador Teste')
    expect(wrapper.get('h1').text()).toBe('Auditoria')
    expect(wrapper.find('tbody').text()).toContain('Usuário alterado')
    expect(wrapper.text()).toContain('Usuário #10')
    expect(wrapper.text()).toContain('Nome: Aluno Antigo → Aluno Novo')
    expect(wrapper.text()).toContain('Ativo: Sim → Não')
    expect(wrapper.text()).toContain('CPF: alterado (valor protegido)')
    expect(wrapper.find('tbody').text()).toContain('Agendamento cancelado')
    expect(wrapper.text()).toContain('Correção administrativa.')
    expect(wrapper.text()).toContain('Sistema')
    expect(wrapper.get('label[for="audit-from"]').text()).toBe('Data inicial')

    const [params] = auditMocks.listAuditLogs.mock.calls[0] ?? []
    expect(params).toMatchObject({ page: 1, pageSize: 20 })
    expect(params.from).toMatch(/^\d{4}-\d{2}-01$/)
  })

  it('aplica o filtro de ação a partir da primeira página', async () => {
    const wrapper = mount(AuditView)
    await expect.poll(() => auditMocks.listAuditLogs).toHaveBeenCalledOnce()

    await wrapper.get('#audit-from').setValue('2099-10-01')
    await wrapper.get('#audit-to').setValue('2099-10-31')
    await wrapper.get('select[name="auditActionFilter"]').setValue('user.deleted')
    const filterButton = wrapper.findAll('button').find((button) => button.text() === 'Filtrar')
    await filterButton?.trigger('click')

    await expect
      .poll(() => auditMocks.listAuditLogs)
      .toHaveBeenLastCalledWith({
        action: 'user.deleted',
        from: '2099-10-01',
        page: 1,
        pageSize: 20,
        to: '2099-10-31',
      })
  })

  it('apresenta o erro do backend sem exibir registros', async () => {
    auditMocks.listAuditLogs.mockRejectedValueOnce(
      new ApiError(400, 'O período da consulta deve ter no máximo 62 dias.', 'warning'),
    )
    const wrapper = mount(AuditView)

    await expect.poll(() => wrapper.text()).toContain('no máximo 62 dias')
    expect(wrapper.text()).not.toContain('Administrador Teste')
  })
})
