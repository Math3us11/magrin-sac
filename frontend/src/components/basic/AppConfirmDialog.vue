<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { computed, nextTick, onUnmounted, ref, useId, watch } from 'vue'

import AppButton from '@/components/basic/AppButton.vue'
import { circleAlertIcon } from '@/icons'

const props = withDefaults(
  defineProps<{
    cancelLabel?: string
    confirmDisabled?: boolean
    confirmLabel?: string
    description: string
    loading?: boolean
    loadingLabel?: string
    open: boolean
    title: string
    tone?: 'danger' | 'primary'
  }>(),
  {
    cancelLabel: 'Voltar',
    confirmDisabled: false,
    confirmLabel: 'Confirmar',
    loading: false,
    loadingLabel: 'Confirmando...',
    tone: 'primary',
  },
)

const emit = defineEmits<{
  cancel: []
  confirm: []
  'update:open': [value: boolean]
}>()

const dialog = ref<HTMLElement | null>(null)
const titleId = `confirm-dialog-title-${useId()}`
const descriptionId = `confirm-dialog-description-${useId()}`
let previouslyFocusedElement: HTMLElement | null = null
let previousBodyOverflow = ''
let isPageStateLocked = false

const iconClasses = computed(() =>
  props.tone === 'danger'
    ? 'bg-status-danger-soft text-status-danger'
    : 'bg-brand-primary-soft text-brand-primary',
)
const confirmVariant = computed(() => (props.tone === 'danger' ? 'danger' : 'primary'))

function closeDialog() {
  if (props.loading) return

  emit('cancel')
  emit('update:open', false)
}

function confirmAction() {
  if (!props.loading && !props.confirmDisabled) emit('confirm')
}

function getFocusableElements(): HTMLElement[] {
  if (!dialog.value) return []

  return Array.from(
    dialog.value.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  )
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.preventDefault()
    closeDialog()
    return
  }

  if (event.key !== 'Tab') return

  const focusableElements = getFocusableElements()
  const firstElement = focusableElements[0]
  const lastElement = focusableElements[focusableElements.length - 1]

  if (!firstElement || !lastElement) {
    event.preventDefault()
    dialog.value?.focus()
    return
  }

  if (event.shiftKey && document.activeElement === firstElement) {
    event.preventDefault()
    lastElement.focus()
  } else if (!event.shiftKey && document.activeElement === lastElement) {
    event.preventDefault()
    firstElement.focus()
  }
}

function restorePageState() {
  if (typeof document === 'undefined' || !isPageStateLocked) return

  document.body.style.overflow = previousBodyOverflow
  previouslyFocusedElement?.focus()
  previouslyFocusedElement = null
  isPageStateLocked = false
}

watch(
  () => props.open,
  async (isOpen) => {
    if (!isOpen) {
      restorePageState()
      return
    }

    previouslyFocusedElement =
      document.activeElement instanceof HTMLElement ? document.activeElement : null
    previousBodyOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    isPageStateLocked = true

    await nextTick()
    const initialFocus =
      dialog.value?.querySelector<HTMLElement>('[data-confirm-dialog-autofocus]') ??
      dialog.value?.querySelector<HTMLElement>('[data-testid="confirm-dialog-cancel"]')
    initialFocus?.focus()
  },
  { immediate: true },
)

onUnmounted(restorePageState)
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0"
      leave-active-class="transition duration-100 ease-in"
      leave-to-class="opacity-0"
    >
      <div
        v-if="open"
        class="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 p-4 backdrop-blur-[2px]"
        @mousedown.self="closeDialog"
      >
        <section
          ref="dialog"
          class="surface-card w-full max-w-md rounded-3xl border border-outline bg-surface p-6 sm:p-7"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="titleId"
          :aria-describedby="descriptionId"
          tabindex="-1"
          @keydown="handleKeydown"
        >
          <div class="flex items-start gap-4">
            <span
              class="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
              :class="iconClasses"
            >
              <Icon class="h-6 w-6" :icon="circleAlertIcon" aria-hidden="true" />
            </span>

            <div class="min-w-0">
              <h2 :id="titleId" class="text-xl font-bold text-content">{{ title }}</h2>
              <p :id="descriptionId" class="mt-2 text-sm leading-6 text-content-muted">
                {{ description }}
              </p>
            </div>
          </div>

          <div v-if="$slots.default" class="mt-6">
            <slot></slot>
          </div>

          <div class="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <AppButton
              variant="ghost"
              :disabled="loading"
              data-testid="confirm-dialog-cancel"
              @click="closeDialog"
            >
              {{ cancelLabel }}
            </AppButton>
            <AppButton
              :variant="confirmVariant"
              :disabled="confirmDisabled"
              :loading="loading"
              :loading-label="loadingLabel"
              data-testid="confirm-dialog-confirm"
              @click="confirmAction"
            >
              {{ confirmLabel }}
            </AppButton>
          </div>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>
