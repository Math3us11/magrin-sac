import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import { object, string } from 'yup'

import AppButton from '@/components/basic/AppButton.vue'
import AppCalendar from '@/components/basic/AppCalendar.vue'
import AppConfirmDialog from '@/components/basic/AppConfirmDialog.vue'
import AppForm from '@/components/basic/AppForm.vue'
import AppInput from '@/components/basic/AppInput.vue'
import AppLoading from '@/components/basic/AppLoading.vue'
import AppModal from '@/components/basic/AppModal.vue'
import AppMultiSelect from '@/components/basic/AppMultiSelect.vue'
import AppTable from '@/components/basic/AppTable.vue'
import { infoIcon } from '@/icons'

describe('componentes básicos', () => {
  it('AppForm e AppInput entregam somente valores válidos', async () => {
    const onSubmit = vi.fn()
    const wrapper = mount({
      components: { AppButton, AppForm, AppInput },
      setup() {
        return {
          onSubmit,
          schema: object({
            name: string().required('Informe seu nome.'),
          }),
        }
      },
      template:
        '<AppForm :validation-schema="schema" @submit="onSubmit"><AppInput name="name" label="Nome" required /><AppButton type="submit">Salvar</AppButton></AppForm>',
    })

    await wrapper.get('form').trigger('submit')
    await vi.waitFor(() => expect(wrapper.text()).toContain('Informe seu nome.'))

    expect(onSubmit).not.toHaveBeenCalled()

    await wrapper.get('input[name="name"]').setValue('Ada Lovelace')
    await wrapper.get('form').trigger('submit')
    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalledOnce())

    expect(onSubmit.mock.calls[0]?.[0]).toEqual({ name: 'Ada Lovelace' })
  })

  it('AppInput aplica máscaras simples e dinâmicas sem expor a diretiva ao formulário', async () => {
    const onSubmit = vi.fn()
    const wrapper = mount({
      components: { AppForm, AppInput },
      setup() {
        return {
          onSubmit,
          phoneMasks: ['(##) ####-####', '(##) #####-####'],
        }
      },
      template:
        '<AppForm @submit="onSubmit"><AppInput name="phone" label="Celular" type="tel" inputmode="tel" :mask="phoneMasks" /></AppForm>',
    })

    const input = wrapper.get('input[name="phone"]')
    await input.setValue('65999999999')

    expect((input.element as HTMLInputElement).value).toBe('(65) 99999-9999')

    await wrapper.get('form').trigger('submit')
    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalledOnce())
    expect(onSubmit.mock.calls[0]?.[0]).toEqual({ phone: '(65) 99999-9999' })
  })

  it('AppButton comunica o estado de carregamento e bloqueia novos cliques', () => {
    const wrapper = mount(AppButton, {
      props: {
        loading: true,
        loadingLabel: 'Salvando...',
      },
      slots: {
        default: 'Salvar',
      },
    })

    expect(wrapper.get('button').attributes('aria-busy')).toBe('true')
    expect(wrapper.get('button').attributes()).toHaveProperty('disabled')
    expect(wrapper.text()).toBe('Salvando...')
  })

  it('AppCalendar navega pelo mês e detalha somente o dia selecionado', async () => {
    const wrapper = mount(AppCalendar, {
      props: {
        events: [
          {
            date: '2026-10-04',
            description: 'Online',
            id: 3,
            statusLabel: 'Disponível',
            title: '07:00–08:00',
            tone: 'success',
          },
          {
            date: '2026-10-05',
            description: 'Presencial',
            id: 1,
            statusLabel: 'Disponível',
            title: '08:00–12:00',
            tone: 'success',
          },
          {
            date: '2026-10-07',
            description: 'Online',
            id: 2,
            statusLabel: 'Bloqueada',
            title: '14:00–18:00',
            tone: 'warning',
          },
        ],
        initialDate: '2026-10-05',
        today: '2026-10-04',
      },
    })

    expect(wrapper.text()).toContain('outubro de 2026')
    expect(wrapper.get('[data-testid="calendar-month-label"]').text()).toBe('outubro de 2026')
    expect(wrapper.get('[data-testid="calendar-today"]').text()).toBe('Ir para hoje')
    expect(wrapper.get('[data-testid="calendar-day-2026-10-04"]').text()).toContain('Hoje')
    expect(wrapper.get('[data-testid="calendar-count-2026-10-04"]').classes()).toContain(
      'bg-brand-secondary-soft',
    )
    expect(wrapper.get('[data-testid="calendar-selected-agenda"]').text()).toContain('08:00–12:00')

    await wrapper.get('[data-testid="calendar-day-2026-10-07"]').trigger('click')

    const selectedAgenda = wrapper.get('[data-testid="calendar-selected-agenda"]')
    expect(selectedAgenda.text()).toContain('14:00–18:00')
    expect(selectedAgenda.text()).toContain('Online')
    expect(selectedAgenda.text()).not.toContain('08:00–12:00')

    await wrapper.get('[data-testid="calendar-next-month"]').trigger('click')
    expect(wrapper.text()).toContain('novembro de 2026')
  })

  it('AppLoading controla o overlay e usa a apresentação padrão', async () => {
    const wrapper = mount(AppLoading, {
      attachTo: document.body,
      props: { active: false },
    })

    expect(document.body.querySelector('[data-testid="app-loading"]')).toBeNull()

    await wrapper.setProps({ active: true })

    const loading = document.body.querySelector<HTMLElement>('[data-testid="app-loading"]')
    expect(loading?.getAttribute('role')).toBe('status')
    expect(loading?.getAttribute('aria-busy')).toBe('true')
    expect(loading?.textContent).toContain('Carregando...')
    expect(loading?.querySelector('svg')?.classList.contains('animate-spin')).toBe(true)

    wrapper.unmount()
  })

  it('AppLoading aceita descrição e ícone personalizados', () => {
    const wrapper = mount(AppLoading, {
      attachTo: document.body,
      props: {
        active: true,
        description: 'Preparando sua agenda...',
        icon: infoIcon,
      },
    })

    const loading = document.body.querySelector<HTMLElement>('[data-testid="app-loading"]')
    expect(loading?.textContent).toContain('Preparando sua agenda...')
    expect(loading?.querySelector('svg')?.classList.contains('animate-spin')).toBe(false)

    wrapper.unmount()
  })

  it('AppTable renderiza colunas, registros e tamanhos configurados', () => {
    const wrapper = mount(AppTable, {
      props: {
        bodyMaxHeight: '40rem',
        bodyMinHeight: 320,
        columns: [
          { name: 'Nome', size: '60%', value: 'name' },
          { name: 'Ativo', size: 120, value: 'active' },
        ],
        name: 'Pessoas',
        records: [{ active: true, id: 1, name: 'Ada Lovelace' }],
      },
    })

    expect(wrapper.get('h2').text()).toBe('Pessoas')
    expect(wrapper.findAll('th').map((header) => header.text())).toEqual(['Nome', 'Ativo'])
    expect(wrapper.findAll('td').map((cell) => cell.text())).toEqual(['Ada Lovelace', 'Sim'])
    expect(wrapper.findAll('col')[0]?.attributes('style')).toContain('width: 60%')
    expect(wrapper.findAll('col')[1]?.attributes('style')).toContain('width: 120px')
    expect(wrapper.get('[data-testid="table-scroll-area"]').attributes('style')).toContain(
      'min-height: 320px',
    )
    expect(wrapper.get('[data-testid="table-scroll-area"]').attributes('style')).toContain(
      'max-height: 40rem',
    )
  })

  it('AppTable posiciona a coluna de ações antes das colunas de dados', () => {
    const wrapper = mount(AppTable, {
      props: {
        columns: [
          { name: 'Nome', value: 'name' },
          { name: 'Ações', size: 96, value: 'actions' },
        ],
        name: 'Pessoas',
        records: [{ id: 1, name: 'Ada Lovelace' }],
      },
      slots: {
        'cell-actions': '<button type="button">Abrir</button>',
      },
    })

    expect(wrapper.findAll('th').map((header) => header.text())).toEqual(['Ações', 'Nome'])
    expect(wrapper.findAll('td').map((cell) => cell.text())).toEqual(['Abrir', 'Ada Lovelace'])
    expect(wrapper.findAll('col')[0]?.attributes('style')).toContain('width: 96px')
  })

  it('AppTable diferencia estados vazio, carregando e erro com nova tentativa', async () => {
    const wrapper = mount(AppTable, {
      props: {
        columns: [{ name: 'Nome', value: 'name' }],
        emptyMessage: 'Nada por aqui.',
        name: 'Pessoas',
        records: [],
      },
    })

    expect(wrapper.text()).toContain('Nada por aqui.')

    await wrapper.setProps({ loading: true })
    expect(wrapper.find('[aria-busy="true"]').exists()).toBe(true)
    expect(wrapper.findAll('tbody tr')).toHaveLength(4)

    await wrapper.setProps({ error: 'Servidor indisponível.', loading: false })
    expect(wrapper.text()).toContain('Servidor indisponível.')
    await wrapper.get('button').trigger('click')
    expect(wrapper.emitted('retry')).toHaveLength(1)
  })

  it('AppTable emite busca, filtros e controles de paginação sem assumir regras de domínio', async () => {
    const wrapper = mount(AppTable, {
      props: {
        columns: [{ name: 'Nome', value: 'name' }],
        filters: [
          {
            label: 'Perfil',
            options: [{ label: 'Professor', value: 'professor' }],
            value: 'userType',
          },
        ],
        filterValues: { userType: '' },
        name: 'Pessoas',
        page: 2,
        pageSize: 10,
        pagination: true,
        records: [{ id: 11, name: 'Ada Lovelace' }],
        search: '',
        searchable: true,
        total: 35,
      },
    })

    await wrapper.get('[data-testid="table-search"]').setValue('Ada')
    expect(wrapper.get('[data-testid="table-search"]').attributes('type')).toBe('text')
    expect(wrapper.findAll('[aria-label="Limpar busca"]')).toHaveLength(1)
    expect(wrapper.get('[data-testid="table-search-submit"]').text()).toBe('Filtrar')
    await wrapper.get('form[role="search"]').trigger('submit')
    await wrapper.get('[data-testid="table-filter-userType"]').setValue('professor')
    await wrapper.get('[data-testid="table-page-next"]').trigger('click')
    await wrapper.get('[data-testid="table-page-size"]').setValue('20')

    expect(wrapper.emitted('update:search')).toEqual([['Ada']])
    expect(wrapper.emitted('search')).toEqual([['Ada']])
    expect(wrapper.emitted('update:filter')).toEqual([['userType', 'professor']])
    expect(wrapper.emitted('update:page')).toEqual([[3]])
    expect(wrapper.emitted('update:pageSize')).toEqual([[20]])
    expect(wrapper.get('[data-testid="table-record-count"]').text()).toBe(
      '35 registros encontrados',
    )
    expect(wrapper.text()).toContain('Pesquisar')
    expect(wrapper.text()).toContain('Exibir')
    expect(wrapper.text()).toContain('por página')
  })

  it('AppMultiSelect mantém o painel na janela e fecha por clique externo ou Escape', async () => {
    const wrapper = mount(AppMultiSelect, {
      attachTo: document.body,
      props: {
        label: 'Cursos',
        name: 'courses',
        options: [
          { label: 'Ciência da Computação', value: 'computacao' },
          { label: 'Medicina', value: 'medicina' },
        ],
      },
    })
    const trigger = wrapper.get<HTMLButtonElement>('[aria-haspopup="listbox"]')

    await trigger.trigger('click')

    const menu = document.body.querySelector<HTMLElement>('[role="listbox"]')
    expect(menu).not.toBeNull()
    expect(menu?.classList.contains('fixed')).toBe(true)
    expect(menu?.style.maxHeight).toMatch(/^\d+px$/)

    document.body.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }))
    await nextTick()
    expect(document.body.querySelector('[role="listbox"]')).toBeNull()

    await trigger.trigger('click')
    document.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Escape' }))
    await nextTick()

    expect(document.body.querySelector('[role="listbox"]')).toBeNull()
    expect(document.activeElement).toBe(trigger.element)

    wrapper.unmount()
  })

  it('AppConfirmDialog anuncia a confirmação, controla o foco e emite as ações', async () => {
    const wrapper = mount(AppConfirmDialog, {
      attachTo: document.body,
      props: {
        description: 'Esta ação precisa ser confirmada.',
        open: true,
        title: 'Confirmar ação?',
      },
    })

    await nextTick()

    const dialog = document.body.querySelector<HTMLElement>('[role="dialog"]')
    const cancelButton = document.body.querySelector<HTMLButtonElement>(
      '[data-testid="confirm-dialog-cancel"]',
    )
    const confirmButton = document.body.querySelector<HTMLButtonElement>(
      '[data-testid="confirm-dialog-confirm"]',
    )

    expect(dialog?.getAttribute('aria-modal')).toBe('true')
    expect(document.activeElement).toBe(cancelButton)

    confirmButton?.click()
    await nextTick()
    expect(wrapper.emitted('confirm')).toHaveLength(1)

    cancelButton?.click()
    await nextTick()
    expect(wrapper.emitted('cancel')).toHaveLength(1)
    expect(wrapper.emitted('update:open')).toEqual([[false]])

    wrapper.unmount()
  })

  it('AppModal gerencia foco, fechamento e conteúdo genérico', async () => {
    const wrapper = mount(
      {
        components: { AppModal },
        data: () => ({ open: false }),
        template: `
        <div>
          <button data-testid="modal-opener" type="button" @click="open = true">Abrir</button>
          <AppModal v-model:open="open" title="Editar período" description="Conteúdo reutilizável.">
            <input data-modal-autofocus aria-label="Campo inicial" />
            <template #footer><button type="button">Salvar</button></template>
          </AppModal>
        </div>
      `,
      },
      { attachTo: document.body },
    )

    const opener = wrapper.get<HTMLButtonElement>('[data-testid="modal-opener"]')
    opener.element.focus()
    await opener.trigger('click')
    await nextTick()

    const dialog = document.body.querySelector<HTMLElement>('[role="dialog"]')
    const initialField = document.body.querySelector<HTMLInputElement>('[data-modal-autofocus]')

    expect(dialog?.getAttribute('aria-modal')).toBe('true')
    expect(dialog?.textContent).toContain('Conteúdo reutilizável.')
    expect(document.activeElement).toBe(initialField)
    expect(document.body.style.overflow).toBe('hidden')

    dialog?.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Escape' }))
    await nextTick()

    expect(document.body.querySelector('[role="dialog"]')).toBeNull()
    expect(document.activeElement).toBe(opener.element)

    wrapper.unmount()
  })
})
