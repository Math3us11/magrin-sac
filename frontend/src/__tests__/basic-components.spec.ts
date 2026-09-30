import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import { object, string } from 'yup'

import AppButton from '@/components/basic/AppButton.vue'
import AppConfirmDialog from '@/components/basic/AppConfirmDialog.vue'
import AppForm from '@/components/basic/AppForm.vue'
import AppInput from '@/components/basic/AppInput.vue'

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
})
