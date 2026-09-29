<script setup lang="ts">
import { ref, toRef } from 'vue'
import {
  useForm,
  type FormActions,
  type GenericObject,
  type InvalidSubmissionContext,
} from 'vee-validate'
import type { AnyObjectSchema } from 'yup'

defineOptions({ inheritAttrs: false })

const props = defineProps<{
  initialValues?: GenericObject
  validationSchema: AnyObjectSchema
}>()

const emit = defineEmits<{
  submit: [values: GenericObject, actions: FormActions<GenericObject>]
}>()

const formElement = ref<HTMLFormElement | null>(null)
const form = useForm<GenericObject>({
  initialValues: props.initialValues,
  validationSchema: toRef(props, 'validationSchema'),
})

function emitSubmit(values: GenericObject, actions: FormActions<GenericObject>) {
  emit('submit', values, actions)
}

function focusFirstInvalidField({ errors }: InvalidSubmissionContext<GenericObject>) {
  const firstInvalidField = Object.keys(errors)[0]

  if (!firstInvalidField) return

  const element = Array.from(formElement.value?.elements ?? []).find(
    (candidate) => candidate.getAttribute('name') === firstInvalidField,
  )

  if (element instanceof HTMLElement) {
    element.focus()
  }
}

const handleSubmit = form.handleSubmit(emitSubmit, focusFirstInvalidField)
</script>

<template>
  <form ref="formElement" v-bind="$attrs" novalidate @submit="handleSubmit">
    <slot
      :errors="form.errors.value"
      :is-submitting="form.isSubmitting.value"
      :meta="form.meta.value"
    ></slot>
  </form>
</template>
