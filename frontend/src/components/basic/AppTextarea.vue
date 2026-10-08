<script setup lang="ts">
import { computed, useId } from 'vue'
import { Field } from 'vee-validate'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    disabled?: boolean
    helpText?: string
    id?: string
    label: string
    maxlength?: number
    name: string
    placeholder?: string
    readonly?: boolean
    required?: boolean
    rows?: number
  }>(),
  {
    disabled: false,
    helpText: undefined,
    id: undefined,
    maxlength: undefined,
    placeholder: undefined,
    readonly: false,
    required: false,
    rows: 4,
  },
)

const generatedId = useId()
const inputId = computed(() => props.id ?? `app-textarea-${generatedId}`)
const errorId = computed(() => `${inputId.value}-error`)
const helpId = computed(() => `${inputId.value}-help`)

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

      <textarea
        v-bind="{ ...$attrs, ...field }"
        :id="inputId"
        :aria-describedby="describedBy(errorMessage)"
        :aria-invalid="Boolean(errorMessage)"
        :aria-required="required || undefined"
        class="app-input h-auto min-h-28 resize-y py-3"
        :class="{ 'app-input-error': errorMessage }"
        :disabled="disabled"
        :maxlength="maxlength"
        :placeholder="placeholder"
        :readonly="readonly"
        :required="required"
        :rows="rows"
      ></textarea>

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
