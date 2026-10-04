<script setup lang="ts">
import { Icon } from '@iconify/vue'
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  type CSSProperties,
  useId,
  watch,
} from 'vue'
import { useField } from 'vee-validate'

import { chevronDownIcon } from '@/icons'

interface SelectOption {
  label: string
  value: string
}

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    disabled?: boolean
    emptyText?: string
    helpText?: string
    label: string
    name: string
    options: SelectOption[]
    placeholder?: string
    required?: boolean
    selectionLimit?: number
  }>(),
  {
    disabled: false,
    emptyText: 'Nenhuma opção disponível.',
    helpText: undefined,
    placeholder: 'Selecione uma ou mais opções',
    required: false,
    selectionLimit: undefined,
  },
)

const emit = defineEmits<{
  change: [value: string[]]
}>()

const generatedId = useId()
const triggerId = computed(() => `app-multi-select-${generatedId}-trigger`)
const menuId = computed(() => `app-multi-select-${generatedId}-menu`)
const labelId = computed(() => `app-multi-select-${generatedId}-label`)
const errorId = computed(() => `app-multi-select-${generatedId}-error`)
const helpId = computed(() => `app-multi-select-${generatedId}-help`)
const { errorMessage, handleChange, value } = useField<string[]>(() => props.name)
const isOpen = ref(false)
const triggerElement = ref<HTMLButtonElement | null>(null)
const menuElement = ref<HTMLElement | null>(null)
const menuStyle = ref<CSSProperties>({})

function selectedValues(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : []
}

function summary(value: unknown): string {
  const selected = selectedValues(value)

  if (selected.length === 0) return props.placeholder
  if (selected.length === 1) {
    return props.options.find((option) => option.value === selected[0])?.label ?? props.placeholder
  }

  return `${selected.length} opções selecionadas`
}

function isOptionDisabled(value: unknown, optionValue: string): boolean {
  if (props.disabled) return true
  if (!props.selectionLimit || props.selectionLimit === 1) return false

  const selected = selectedValues(value)
  return !selected.includes(optionValue) && selected.length >= props.selectionLimit
}

function updateMenuPosition() {
  const trigger = triggerElement.value

  if (!trigger || !isOpen.value) return

  const viewportPadding = 12
  const menuGap = 8
  const preferredHeight = 288
  const triggerRect = trigger.getBoundingClientRect()
  const availableBelow = window.innerHeight - triggerRect.bottom - menuGap - viewportPadding
  const availableAbove = triggerRect.top - menuGap - viewportPadding
  const shouldOpenAbove = availableBelow < preferredHeight && availableAbove > availableBelow
  const availableHeight = shouldOpenAbove ? availableAbove : availableBelow
  const maximumWidth = Math.max(0, window.innerWidth - viewportPadding * 2)
  const width = Math.min(triggerRect.width, maximumWidth)
  const left = Math.min(
    Math.max(viewportPadding, triggerRect.left),
    Math.max(viewportPadding, window.innerWidth - width - viewportPadding),
  )

  menuStyle.value = {
    bottom: shouldOpenAbove ? `${window.innerHeight - triggerRect.top + menuGap}px` : 'auto',
    left: `${left}px`,
    maxHeight: `${Math.max(0, Math.min(preferredHeight, availableHeight))}px`,
    top: shouldOpenAbove ? 'auto' : `${triggerRect.bottom + menuGap}px`,
    width: `${width}px`,
  }
}

function closeMenu(restoreFocus = false) {
  if (!isOpen.value) return

  isOpen.value = false

  if (restoreFocus) {
    void nextTick(() => triggerElement.value?.focus())
  }
}

function toggleMenu() {
  if (props.disabled) return
  isOpen.value = !isOpen.value
}

function handleOutsidePointerDown(event: PointerEvent) {
  const target = event.target

  if (!(target instanceof Node)) return
  if (triggerElement.value?.contains(target) || menuElement.value?.contains(target)) return

  closeMenu()
}

function handleDocumentKeydown(event: KeyboardEvent) {
  if (event.key !== 'Escape' || !isOpen.value) return

  event.preventDefault()
  closeMenu(true)
}

function handleViewportChange() {
  updateMenuPosition()
}

async function toggleOption(currentValue: unknown, optionValue: string, event: Event) {
  const selected = selectedValues(currentValue)
  const checked = (event.currentTarget as HTMLInputElement).checked
  const nextValue =
    checked && props.selectionLimit === 1
      ? [optionValue]
      : checked
        ? [...new Set([...selected, optionValue])]
        : selected.filter((value) => value !== optionValue)

  handleChange(nextValue)
  emit('change', nextValue)

  if (props.selectionLimit === 1) {
    await nextTick()
    closeMenu(true)
  }
}

onMounted(() => {
  document.addEventListener('pointerdown', handleOutsidePointerDown)
  document.addEventListener('keydown', handleDocumentKeydown)
  window.addEventListener('resize', handleViewportChange)
  window.addEventListener('scroll', handleViewportChange, true)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', handleOutsidePointerDown)
  document.removeEventListener('keydown', handleDocumentKeydown)
  window.removeEventListener('resize', handleViewportChange)
  window.removeEventListener('scroll', handleViewportChange, true)
})

watch(isOpen, async (open) => {
  if (!open) return

  await nextTick()
  updateMenuPosition()
})

watch(
  () => props.disabled,
  (disabled) => {
    if (disabled) closeMenu()
  },
)

watch(
  () => props.options.map((option) => option.value),
  (availableValues) => {
    const available = new Set(availableValues)
    const selected = selectedValues(value.value)
    const validSelection = selected.filter((selectedValue) => available.has(selectedValue))

    if (validSelection.length !== selected.length) {
      handleChange(validSelection)
      emit('change', validSelection)
    }
  },
)
</script>

<template>
  <div>
    <p :id="labelId" class="mb-2 text-sm font-semibold text-content">
      {{ label }}
      <span v-if="required" class="text-status-danger" aria-hidden="true">*</span>
    </p>

    <div :class="{ 'opacity-65': disabled }">
      <button
        :id="triggerId"
        ref="triggerElement"
        v-bind="$attrs"
        class="app-input flex w-full items-center justify-between gap-3 text-left"
        :class="[
          disabled ? 'cursor-not-allowed' : 'cursor-pointer',
          { 'app-input-error': errorMessage },
        ]"
        type="button"
        :aria-controls="isOpen ? menuId : undefined"
        :aria-describedby="
          [helpText ? helpId : undefined, errorMessage ? errorId : undefined]
            .filter(Boolean)
            .join(' ') || undefined
        "
        :aria-expanded="isOpen"
        aria-haspopup="listbox"
        :aria-invalid="Boolean(errorMessage)"
        :aria-labelledby="labelId"
        :aria-required="required"
        :disabled="disabled"
        @click="toggleMenu"
      >
        <span
          class="truncate"
          :class="selectedValues(value).length ? 'text-content' : 'text-content-muted'"
        >
          {{ summary(value) }}
        </span>
        <Icon
          class="h-4 w-4 shrink-0 text-content-muted transition-transform"
          :class="{ 'rotate-180': isOpen }"
          :icon="chevronDownIcon"
          aria-hidden="true"
        />
      </button>

      <Teleport to="body">
        <div
          v-if="isOpen"
          :id="menuId"
          ref="menuElement"
          class="fixed z-[100] overflow-y-auto overscroll-contain rounded-xl border border-outline bg-surface p-2 shadow-xl"
          :style="menuStyle"
          role="listbox"
          :aria-labelledby="labelId"
          :aria-multiselectable="selectionLimit !== 1"
        >
          <p v-if="options.length === 0" class="px-3 py-2.5 text-sm text-content-muted">
            {{ emptyText }}
          </p>
          <label
            v-for="option in options"
            :key="option.value"
            class="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-content hover:bg-surface-subtle has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50"
            role="option"
            :aria-selected="selectedValues(value).includes(option.value)"
          >
            <input
              class="h-4 w-4 accent-brand-primary"
              type="checkbox"
              :checked="selectedValues(value).includes(option.value)"
              :disabled="isOptionDisabled(value, option.value)"
              :name="name"
              :value="option.value"
              @change="toggleOption(value, option.value, $event)"
            />
            {{ option.label }}
          </label>
        </div>
      </Teleport>
    </div>

    <p v-if="helpText" :id="helpId" class="mt-2 text-xs leading-5 text-content-muted">
      {{ helpText }}
    </p>
    <p
      v-if="errorMessage"
      :id="errorId"
      class="mt-2 text-sm font-medium text-status-danger"
      role="alert"
    >
      {{ errorMessage }}
    </p>
  </div>
</template>
