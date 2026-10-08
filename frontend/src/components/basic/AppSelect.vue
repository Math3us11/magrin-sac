<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { computed, useId, watch } from 'vue'
import { useField } from 'vee-validate'

import { chevronDownIcon } from '@/icons'

type SelectOption = {
  disabled?: boolean
  label: string
  value: string
}

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    disabled?: boolean
    helpText?: string
    id?: string
    label: string
    name: string
    options: readonly SelectOption[]
    placeholder?: string
    required?: boolean
  }>(),
  {
    disabled: false,
    helpText: undefined,
    id: undefined,
    placeholder: undefined,
    required: false,
  },
)

const model = defineModel<string>()
const emit = defineEmits<{
  change: [value: string]
}>()

const generatedId = useId()
const inputId = computed(() => props.id ?? `app-select-${generatedId}`)
const errorId = computed(() => `${inputId.value}-error`)
const helpId = computed(() => `${inputId.value}-help`)
const { errorMessage, handleBlur, handleChange, setValue, value } = useField<string>(
  () => props.name,
)
const selectedValue = computed(() => model.value ?? value.value ?? '')

function describedBy(): string | undefined {
  return (
    [props.helpText ? helpId.value : undefined, errorMessage.value ? errorId.value : undefined]
      .filter(Boolean)
      .join(' ') || undefined
  )
}

function selectOption(event: Event) {
  const nextValue = (event.currentTarget as HTMLSelectElement).value
  handleChange(nextValue)

  if (model.value !== undefined) model.value = nextValue
  emit('change', nextValue)
}

watch(
  model,
  (nextValue) => {
    if (nextValue !== undefined && nextValue !== value.value) setValue(nextValue)
  },
  { immediate: true },
)
</script>

<template>
  <div>
    <label class="mb-2 block text-sm font-semibold text-content" :for="inputId">
      {{ label }}
      <span v-if="required" class="text-status-danger" aria-hidden="true">*</span>
    </label>

    <div class="group relative">
      <select
        v-bind="$attrs"
        :id="inputId"
        :aria-describedby="describedBy()"
        :aria-invalid="Boolean(errorMessage)"
        :aria-required="required || undefined"
        class="app-input appearance-none pr-11 text-sm font-semibold"
        :class="[
          disabled ? 'cursor-not-allowed' : 'cursor-pointer',
          { 'app-input-error': errorMessage },
        ]"
        :disabled="disabled"
        :name="name"
        :required="required"
        :value="selectedValue"
        @blur="handleBlur"
        @change="selectOption"
      >
        <option v-if="placeholder" disabled value="">{{ placeholder }}</option>
        <option
          v-for="option in options"
          :key="option.value"
          :disabled="option.disabled"
          :value="option.value"
        >
          {{ option.label }}
        </option>
      </select>

      <Icon
        class="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-content-muted transition-colors group-focus-within:text-brand-primary"
        :icon="chevronDownIcon"
        aria-hidden="true"
      />
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
