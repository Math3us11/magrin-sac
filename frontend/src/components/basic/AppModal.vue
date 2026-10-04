<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { computed, nextTick, onUnmounted, ref, useId, watch } from 'vue'

import { xIcon } from '@/icons'

const props = withDefaults(
  defineProps<{
    closeDisabled?: boolean
    description?: string
    open: boolean
    showCloseButton?: boolean
    size?: 'sm' | 'md' | 'lg' | 'xl'
    title: string
  }>(),
  {
    closeDisabled: false,
    description: undefined,
    showCloseButton: true,
    size: 'md',
  },
)

const emit = defineEmits<{
  close: []
  'update:open': [value: boolean]
}>()

const dialog = ref<HTMLElement | null>(null)
const titleId = `app-modal-title-${useId()}`
const descriptionId = `app-modal-description-${useId()}`
let previouslyFocusedElement: HTMLElement | null = null
let previousBodyOverflow = ''
let isPageStateLocked = false

const sizeClasses = computed(() => ({
  lg: 'max-w-3xl',
  md: 'max-w-2xl',
  sm: 'max-w-md',
  xl: 'max-w-5xl',
}))

function requestClose() {
  if (props.closeDisabled) return

  emit('close')
  emit('update:open', false)
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
    requestClose()
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
      dialog.value?.querySelector<HTMLElement>('[data-modal-autofocus]') ??
      dialog.value?.querySelector<HTMLElement>('button:not([disabled]), input:not([disabled])')
    ;(initialFocus ?? dialog.value)?.focus()
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
        data-testid="app-modal-backdrop"
        @mousedown.self="requestClose"
      >
        <section
          ref="dialog"
          class="surface-card flex max-h-[calc(100dvh-2rem)] w-full flex-col overflow-hidden rounded-3xl border border-outline bg-surface"
          :class="sizeClasses[size]"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="titleId"
          :aria-describedby="description ? descriptionId : undefined"
          tabindex="-1"
          @keydown="handleKeydown"
        >
          <header
            class="flex items-start justify-between gap-5 border-b border-outline px-6 py-5 sm:px-7"
          >
            <div class="min-w-0">
              <h2 :id="titleId" class="text-xl font-bold text-content">{{ title }}</h2>
              <p
                v-if="description"
                :id="descriptionId"
                class="mt-2 text-sm leading-6 text-content-muted"
              >
                {{ description }}
              </p>
            </div>

            <button
              v-if="showCloseButton"
              class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-content-muted hover:bg-surface-subtle hover:text-content disabled:cursor-not-allowed disabled:opacity-60"
              type="button"
              aria-label="Fechar modal"
              title="Fechar"
              :disabled="closeDisabled"
              data-testid="app-modal-close"
              @click="requestClose"
            >
              <Icon class="h-5 w-5" :icon="xIcon" aria-hidden="true" />
            </button>
          </header>

          <div class="min-h-0 flex-1 overflow-y-auto px-6 py-6 sm:px-7">
            <slot></slot>
          </div>

          <footer
            v-if="$slots.footer"
            class="flex flex-col-reverse gap-3 border-t border-outline px-6 py-5 sm:flex-row sm:justify-end sm:px-7"
          >
            <slot name="footer"></slot>
          </footer>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>
