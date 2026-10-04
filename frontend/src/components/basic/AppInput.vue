<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { vMaska } from 'maska/vue'
import { computed, ref, useId, useSlots } from 'vue'
import { Field } from 'vee-validate'

import { eyeIcon, eyeOffIcon } from '@/icons'

defineOptions({ inheritAttrs: false })

type InputType =
  'date' | 'email' | 'number' | 'password' | 'search' | 'tel' | 'text' | 'time' | 'url'
type InputMask = string | string[] | ((input: string) => string)

const props = withDefaults(
  defineProps<{
    autocomplete?: string
    disabled?: boolean
    helpText?: string
    id?: string
    inputmode?: 'decimal' | 'email' | 'none' | 'numeric' | 'search' | 'tel' | 'text' | 'url'
    label: string
    mask?: InputMask
    maxlength?: number
    name: string
    placeholder?: string
    readonly?: boolean
    required?: boolean
    revealable?: boolean
    type?: InputType
  }>(),
  {
    autocomplete: undefined,
    disabled: false,
    helpText: undefined,
    id: undefined,
    inputmode: undefined,
    mask: undefined,
    maxlength: undefined,
    placeholder: undefined,
    readonly: false,
    required: false,
    revealable: false,
    type: 'text',
  },
)

const slots = useSlots()
const generatedId = useId()
const inputId = computed(() => props.id ?? `app-input-${generatedId}`)
const errorId = computed(() => `${inputId.value}-error`)
const helpId = computed(() => `${inputId.value}-help`)
const showPassword = ref(false)

const hasPrefix = computed(() => Boolean(slots.prefix))
const hasSuffix = computed(() => props.revealable || Boolean(slots.suffix))
const inputType = computed(() =>
  props.type === 'password' && showPassword.value ? 'text' : props.type,
)

function describedBy(errorMessage?: string): string | undefined {
  return (
    [props.helpText ? helpId.value : undefined, errorMessage ? errorId.value : undefined]
      .filter(Boolean)
      .join(' ') || undefined
  )
}
</script>

<template>
  <Field v-slot="{ field, errorMessage }" :name="name">
    <div>
      <label class="mb-2 block text-sm font-semibold text-content" :for="inputId">
        {{ label }}
        <span v-if="required" class="text-status-danger" aria-hidden="true">*</span>
      </label>

      <div class="group relative">
        <span
          v-if="hasPrefix"
          class="pointer-events-none absolute left-4 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center text-content-muted group-focus-within:text-brand-primary"
          aria-hidden="true"
        >
          <slot name="prefix"></slot>
        </span>

        <input
          v-if="mask"
          v-maska="{ mask }"
          v-bind="{ ...$attrs, ...field }"
          :id="inputId"
          :aria-describedby="describedBy(errorMessage)"
          :aria-invalid="Boolean(errorMessage)"
          :aria-required="required || undefined"
          :autocomplete="autocomplete"
          class="app-input"
          :class="{ 'pl-12': hasPrefix, 'pr-24': hasSuffix, 'app-input-error': errorMessage }"
          :disabled="disabled"
          :inputmode="inputmode"
          :maxlength="maxlength"
          :placeholder="placeholder"
          :readonly="readonly"
          :required="required"
          :type="inputType"
        />
        <input
          v-else
          v-bind="{ ...$attrs, ...field }"
          :id="inputId"
          :aria-describedby="describedBy(errorMessage)"
          :aria-invalid="Boolean(errorMessage)"
          :aria-required="required || undefined"
          :autocomplete="autocomplete"
          class="app-input"
          :class="{ 'pl-12': hasPrefix, 'pr-24': hasSuffix, 'app-input-error': errorMessage }"
          :disabled="disabled"
          :inputmode="inputmode"
          :maxlength="maxlength"
          :placeholder="placeholder"
          :readonly="readonly"
          :required="required"
          :type="inputType"
        />

        <button
          v-if="revealable"
          class="absolute right-3 top-1/2 inline-flex h-9 min-w-9 -translate-y-1/2 items-center justify-center rounded-lg px-2 text-xs font-semibold text-content-muted hover:bg-surface-subtle hover:text-content"
          type="button"
          :aria-label="showPassword ? 'Ocultar senha' : 'Mostrar senha'"
          :aria-pressed="showPassword"
          :disabled="disabled"
          @click="showPassword = !showPassword"
        >
          <Icon class="h-5 w-5" :icon="showPassword ? eyeOffIcon : eyeIcon" aria-hidden="true" />
        </button>

        <span
          v-else-if="hasSuffix"
          class="absolute right-4 top-1/2 flex -translate-y-1/2 items-center justify-center"
        >
          <slot name="suffix"></slot>
        </span>
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
  </Field>
</template>
