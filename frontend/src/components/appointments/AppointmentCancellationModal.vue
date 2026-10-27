<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import AppButton from '@/components/basic/AppButton.vue'
import AppModal from '@/components/basic/AppModal.vue'
import { INSTITUTION_TIME_ZONE } from '@/config/date-time'

const props = withDefaults(
  defineProps<{
    appointmentLabel?: string
    // Prazo calculado pelo backend a partir do parâmetro de antecedência mínima.
    cancellableUntil?: string | null
    error?: string
    loading?: boolean
    requiresPassword?: boolean
  }>(),
  {
    appointmentLabel: undefined,
    cancellableUntil: null,
    error: '',
    loading: false,
    requiresPassword: false,
  },
)

const deadlineLabel = computed(() =>
  props.cancellableUntil
    ? new Intl.DateTimeFormat('pt-BR', {
        dateStyle: 'short',
        timeStyle: 'short',
        timeZone: INSTITUTION_TIME_ZONE,
      }).format(new Date(props.cancellableUntil))
    : '',
)

const open = defineModel<boolean>('open', { required: true })
const emit = defineEmits<{
  confirm: [payload: { password?: string; reason: string }]
}>()

const reason = ref('')
const password = ref('')
const localError = ref('')

watch(open, (isOpen) => {
  if (isOpen) return
  reason.value = ''
  password.value = ''
  localError.value = ''
})

watch(
  () => props.error,
  (error) => {
    if (error && props.requiresPassword) password.value = ''
  },
)

function close() {
  if (!props.loading) open.value = false
}

function confirm() {
  const preparedReason = reason.value.trim()
  if (!preparedReason) {
    localError.value = 'Informe o motivo do cancelamento.'
    return
  }
  if (props.requiresPassword && !password.value) {
    localError.value = 'Informe sua senha para confirmar o cancelamento.'
    return
  }

  localError.value = ''
  emit('confirm', {
    ...(props.requiresPassword ? { password: password.value } : {}),
    reason: preparedReason,
  })
}
</script>

<template>
  <AppModal
    v-model:open="open"
    :close-disabled="loading"
    title="Cancelar agendamento?"
    description="O horário voltará a ficar disponível para outro aluno. Esta ação ficará registrada no histórico."
    size="sm"
  >
    <p
      v-if="appointmentLabel"
      class="mb-5 rounded-xl border border-outline bg-surface-subtle px-4 py-3 text-sm font-semibold text-content"
    >
      {{ appointmentLabel }}
    </p>

    <label class="mb-2 block text-sm font-semibold text-content" for="cancellation-reason">
      Motivo <span class="text-status-danger" aria-hidden="true">*</span>
    </label>
    <textarea
      id="cancellation-reason"
      v-model="reason"
      class="app-input min-h-28 resize-y py-3"
      :class="{ 'app-input-error': localError || error }"
      maxlength="500"
      placeholder="Explique brevemente o motivo do cancelamento"
      :disabled="loading"
      required
      data-modal-autofocus
      @input="localError = ''"
    ></textarea>

    <template v-if="requiresPassword">
      <label class="mb-2 mt-5 block text-sm font-semibold text-content" for="cancellation-password">
        Sua senha administrativa <span class="text-status-danger" aria-hidden="true">*</span>
      </label>
      <input
        id="cancellation-password"
        v-model="password"
        class="app-input"
        :class="{ 'app-input-error': localError || error }"
        type="password"
        name="cancellationPassword"
        autocomplete="current-password"
        maxlength="128"
        placeholder="Digite sua senha"
        :disabled="loading"
        required
        @input="localError = ''"
        @keydown.enter.prevent="confirm"
      />
    </template>

    <p v-if="localError || error" class="mt-3 text-sm font-medium text-status-danger" role="alert">
      {{ localError || error }}
    </p>
    <p v-if="deadlineLabel" class="mt-3 text-xs leading-5 text-content-muted">
      Cancelamento permitido até {{ deadlineLabel }}.
    </p>

    <template #footer>
      <AppButton variant="ghost" :disabled="loading" @click="close">Voltar</AppButton>
      <AppButton variant="danger" :loading="loading" loading-label="Cancelando..." @click="confirm">
        Confirmar cancelamento
      </AppButton>
    </template>
  </AppModal>
</template>
