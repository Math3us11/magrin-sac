<script setup lang="ts">
import { ref, watch } from 'vue'

import AppButton from '@/components/basic/AppButton.vue'
import AppModal from '@/components/basic/AppModal.vue'
import { getInstitutionDateTime } from '@/config/date-time'
import type {
  AttendanceDetail,
  AttendanceResolutionStatus,
  UpdateAttendanceStatusPayload,
} from '@/types/attendance'

const props = withDefaults(
  defineProps<{
    attendance: AttendanceDetail | null
    error?: string
    loading?: boolean
  }>(),
  { error: '', loading: false },
)
const open = defineModel<boolean>('open', { required: true })
const emit = defineEmits<{ confirm: [payload: UpdateAttendanceStatusPayload] }>()

const resolutionStatus = ref<AttendanceResolutionStatus>('em_tratativa')
const internalNotes = ref('')
const solution = ref('')
const referral = ref('')
const unresolvedReason = ref('')
const continuityResponsible = ref('')
const nextStep = ref('')
const dueDate = ref('')
const changeReason = ref('')
const localError = ref('')
const currentInstitutionDate = getInstitutionDateTime().date

watch(
  [open, () => props.attendance],
  ([isOpen, attendance]) => {
    if (!isOpen || !attendance) return
    resolutionStatus.value = attendance.resolutionStatus ?? 'em_tratativa'
    internalNotes.value = attendance.internalNotes ?? ''
    solution.value = attendance.solution ?? ''
    referral.value = attendance.referral ?? ''
    unresolvedReason.value = attendance.unresolvedReason ?? ''
    continuityResponsible.value = attendance.continuityResponsible ?? ''
    nextStep.value = attendance.nextStep ?? ''
    dueDate.value = attendance.dueDate ?? ''
    changeReason.value = ''
    localError.value = ''
  },
  { immediate: true },
)

watch(resolutionStatus, () => {
  localError.value = ''
})

function prepared(value: string): string | undefined {
  return value.trim() || undefined
}

function close() {
  if (!props.loading) open.value = false
}

function confirm() {
  if (!changeReason.value.trim()) {
    localError.value = 'Informe o motivo da alteração.'
    return
  }
  if (resolutionStatus.value === 'resolvido' && !solution.value.trim() && !referral.value.trim()) {
    localError.value = 'Informe a solução ou o encaminhamento realizado.'
    return
  }
  if (resolutionStatus.value === 'nao_resolvido' && !unresolvedReason.value.trim()) {
    localError.value = 'Informe por que a demanda foi encerrada sem solução.'
    return
  }
  if (
    resolutionStatus.value === 'em_tratativa' &&
    (!continuityResponsible.value.trim() || !nextStep.value.trim() || !dueDate.value)
  ) {
    localError.value = 'Informe responsável, próximo passo e prazo da tratativa.'
    return
  }

  localError.value = ''
  emit('confirm', {
    changeReason: changeReason.value.trim(),
    ...(resolutionStatus.value === 'em_tratativa'
      ? {
          continuityResponsible: continuityResponsible.value.trim(),
          dueDate: dueDate.value,
          nextStep: nextStep.value.trim(),
        }
      : {}),
    internalNotes: prepared(internalNotes.value),
    ...(resolutionStatus.value === 'resolvido'
      ? { referral: prepared(referral.value), solution: prepared(solution.value) }
      : {}),
    resolutionStatus: resolutionStatus.value,
    ...(resolutionStatus.value === 'nao_resolvido'
      ? { unresolvedReason: unresolvedReason.value.trim() }
      : {}),
  })
}
</script>

<template>
  <AppModal
    v-model:open="open"
    :close-disabled="loading"
    title="Atualizar tratativa"
    description="Registre a evolução da demanda. Toda mudança guarda responsável, data e motivo no histórico."
    size="lg"
  >
    <p
      v-if="attendance"
      class="mb-6 rounded-xl border border-outline bg-surface-subtle px-4 py-3 text-sm font-semibold text-content"
    >
      {{ attendance.appointment.protocol }} · {{ attendance.appointment.subject }}
    </p>

    <div>
      <label class="mb-2 block text-sm font-semibold text-content" for="transition-status">
        Nova classificação <span class="text-status-danger" aria-hidden="true">*</span>
      </label>
      <select id="transition-status" v-model="resolutionStatus" class="app-input" required>
        <option value="em_tratativa">Manter em tratativa</option>
        <option value="resolvido">Marcar como resolvido</option>
        <option value="nao_resolvido">Encerrar como não resolvido</option>
      </select>
    </div>

    <div v-if="resolutionStatus === 'em_tratativa'" class="mt-5 space-y-5">
      <div class="grid gap-5 sm:grid-cols-2">
        <div>
          <label class="mb-2 block text-sm font-semibold text-content" for="transition-responsible">
            Responsável <span class="text-status-danger" aria-hidden="true">*</span>
          </label>
          <input
            id="transition-responsible"
            v-model="continuityResponsible"
            class="app-input"
            maxlength="150"
          />
        </div>
        <div>
          <label class="mb-2 block text-sm font-semibold text-content" for="transition-due-date">
            Prazo <span class="text-status-danger" aria-hidden="true">*</span>
          </label>
          <input
            id="transition-due-date"
            v-model="dueDate"
            class="app-input"
            type="date"
            :min="currentInstitutionDate"
          />
        </div>
      </div>
      <div>
        <label class="mb-2 block text-sm font-semibold text-content" for="transition-next-step">
          Próximo passo <span class="text-status-danger" aria-hidden="true">*</span>
        </label>
        <textarea
          id="transition-next-step"
          v-model="nextStep"
          class="app-input min-h-28 resize-y py-3"
          maxlength="5000"
        ></textarea>
      </div>
    </div>

    <div v-else-if="resolutionStatus === 'resolvido'" class="mt-5 grid gap-5 sm:grid-cols-2">
      <div>
        <label class="mb-2 block text-sm font-semibold text-content" for="transition-solution">
          Solução
        </label>
        <textarea
          id="transition-solution"
          v-model="solution"
          class="app-input min-h-28 resize-y py-3"
          maxlength="5000"
        ></textarea>
      </div>
      <div>
        <label class="mb-2 block text-sm font-semibold text-content" for="transition-referral">
          Encaminhamento
        </label>
        <textarea
          id="transition-referral"
          v-model="referral"
          class="app-input min-h-28 resize-y py-3"
          maxlength="5000"
        ></textarea>
      </div>
      <p class="text-xs text-content-muted sm:col-span-2">
        Preencha pelo menos a solução ou o encaminhamento.
      </p>
    </div>

    <div v-else class="mt-5">
      <label class="mb-2 block text-sm font-semibold text-content" for="transition-unresolved">
        Justificativa <span class="text-status-danger" aria-hidden="true">*</span>
      </label>
      <textarea
        id="transition-unresolved"
        v-model="unresolvedReason"
        class="app-input min-h-28 resize-y py-3"
        maxlength="5000"
      ></textarea>
    </div>

    <div class="mt-5">
      <label class="mb-2 block text-sm font-semibold text-content" for="transition-notes">
        Observações internas
      </label>
      <textarea
        id="transition-notes"
        v-model="internalNotes"
        class="app-input min-h-28 resize-y py-3"
        maxlength="5000"
      ></textarea>
    </div>

    <div class="mt-5">
      <label class="mb-2 block text-sm font-semibold text-content" for="transition-reason">
        Motivo da alteração <span class="text-status-danger" aria-hidden="true">*</span>
      </label>
      <textarea
        id="transition-reason"
        v-model="changeReason"
        class="app-input min-h-24 resize-y py-3"
        maxlength="500"
        placeholder="Explique o avanço ou encerramento desta tratativa"
        data-modal-autofocus
      ></textarea>
    </div>

    <p v-if="localError || error" class="mt-4 text-sm font-medium text-status-danger" role="alert">
      {{ localError || error }}
    </p>

    <template #footer>
      <AppButton variant="ghost" :disabled="loading" @click="close">Voltar</AppButton>
      <AppButton :loading="loading" loading-label="Salvando..." @click="confirm">
        Salvar evolução
      </AppButton>
    </template>
  </AppModal>
</template>
