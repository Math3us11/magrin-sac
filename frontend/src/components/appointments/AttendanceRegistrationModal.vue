<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import AppButton from '@/components/basic/AppButton.vue'
import AppModal from '@/components/basic/AppModal.vue'
import { getInstitutionDateTime } from '@/config/date-time'
import type {
  AttendanceOccurrence,
  AttendanceResolutionStatus,
  RegisterAttendancePayload,
} from '@/types/attendance'

const props = withDefaults(
  defineProps<{
    appointmentLabel?: string
    error?: string
    loading?: boolean
  }>(),
  { appointmentLabel: undefined, error: '', loading: false },
)
const open = defineModel<boolean>('open', { required: true })
const emit = defineEmits<{ confirm: [payload: RegisterAttendancePayload] }>()

const occurrence = ref<AttendanceOccurrence>('realizado')
const resolutionStatus = ref<AttendanceResolutionStatus | ''>('')
const internalNotes = ref('')
const solution = ref('')
const referral = ref('')
const unresolvedReason = ref('')
const continuityResponsible = ref('')
const nextStep = ref('')
const dueDate = ref('')
const localError = ref('')
const currentInstitutionDate = computed(() => getInstitutionDateTime().date)

watch(open, (isOpen) => {
  if (isOpen) return
  occurrence.value = 'realizado'
  resolutionStatus.value = ''
  internalNotes.value = ''
  solution.value = ''
  referral.value = ''
  unresolvedReason.value = ''
  continuityResponsible.value = ''
  nextStep.value = ''
  dueDate.value = ''
  localError.value = ''
})

watch(occurrence, () => {
  resolutionStatus.value = ''
  localError.value = ''
})

watch(resolutionStatus, () => {
  localError.value = ''
})

function close() {
  if (!props.loading) open.value = false
}

function prepared(value: string): string | undefined {
  return value.trim() || undefined
}

function confirm() {
  if (occurrence.value === 'ausencia') {
    localError.value = ''
    emit('confirm', {
      internalNotes: prepared(internalNotes.value),
      occurrence: 'ausencia',
    })
    return
  }
  if (!resolutionStatus.value) {
    localError.value = 'Informe a classificação do atendimento.'
    return
  }
  if (resolutionStatus.value === 'resolvido' && !solution.value.trim() && !referral.value.trim()) {
    localError.value = 'Informe a solução ou o encaminhamento realizado.'
    return
  }
  if (resolutionStatus.value === 'nao_resolvido' && !unresolvedReason.value.trim()) {
    localError.value = 'Informe por que a demanda não foi resolvida.'
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
    ...(resolutionStatus.value === 'resolvido'
      ? { referral: prepared(referral.value), solution: prepared(solution.value) }
      : {}),
    ...(resolutionStatus.value === 'nao_resolvido'
      ? { unresolvedReason: prepared(unresolvedReason.value) }
      : {}),
    ...(resolutionStatus.value === 'em_tratativa'
      ? {
          continuityResponsible: continuityResponsible.value.trim(),
          dueDate: dueDate.value,
          nextStep: nextStep.value.trim(),
        }
      : {}),
    internalNotes: prepared(internalNotes.value),
    occurrence: 'realizado',
    resolutionStatus: resolutionStatus.value,
  })
}
</script>

<template>
  <AppModal
    v-model:open="open"
    :close-disabled="loading"
    title="Registrar atendimento"
    description="Registre o resultado após o início do horário. As observações desta tela são internas e não ficam visíveis ao aluno."
    size="lg"
  >
    <p
      v-if="appointmentLabel"
      class="mb-6 rounded-xl border border-outline bg-surface-subtle px-4 py-3 text-sm font-semibold text-content"
    >
      {{ appointmentLabel }}
    </p>

    <fieldset>
      <legend class="text-sm font-semibold text-content">
        Ocorrência <span class="text-status-danger" aria-hidden="true">*</span>
      </legend>
      <div class="mt-3 grid gap-3 sm:grid-cols-2">
        <label
          v-for="option in [
            { label: 'Atendimento realizado', value: 'realizado' },
            { label: 'Ausência do aluno', value: 'ausencia' },
          ]"
          :key="option.value"
          class="flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm font-semibold"
          :class="
            occurrence === option.value
              ? 'border-brand-primary bg-brand-primary-soft text-brand-primary'
              : 'border-outline text-content'
          "
        >
          <input
            v-model="occurrence"
            type="radio"
            name="attendanceOccurrence"
            :value="option.value"
          />
          {{ option.label }}
        </label>
      </div>
    </fieldset>

    <div v-if="occurrence === 'realizado'" class="mt-6 space-y-5">
      <div>
        <label class="mb-2 block text-sm font-semibold text-content" for="resolution-status">
          Classificação <span class="text-status-danger" aria-hidden="true">*</span>
        </label>
        <select id="resolution-status" v-model="resolutionStatus" class="app-input" required>
          <option disabled value="">Selecione o resultado</option>
          <option value="resolvido">Resolvido</option>
          <option value="nao_resolvido">Não resolvido</option>
          <option value="em_tratativa">Em tratativa</option>
        </select>
      </div>

      <div v-if="resolutionStatus === 'resolvido'" class="grid gap-5 sm:grid-cols-2">
        <div>
          <label class="mb-2 block text-sm font-semibold text-content" for="attendance-solution">
            Solução
          </label>
          <textarea
            id="attendance-solution"
            v-model="solution"
            class="app-input min-h-28 resize-y py-3"
            maxlength="5000"
            placeholder="Descreva a solução aplicada"
          ></textarea>
        </div>
        <div>
          <label class="mb-2 block text-sm font-semibold text-content" for="attendance-referral">
            Encaminhamento
          </label>
          <textarea
            id="attendance-referral"
            v-model="referral"
            class="app-input min-h-28 resize-y py-3"
            maxlength="5000"
            placeholder="Informe o encaminhamento, se houver"
          ></textarea>
        </div>
        <p class="text-xs text-content-muted sm:col-span-2">
          Preencha pelo menos a solução ou o encaminhamento.
        </p>
      </div>

      <div v-else-if="resolutionStatus === 'nao_resolvido'">
        <label class="mb-2 block text-sm font-semibold text-content" for="unresolved-reason">
          Justificativa <span class="text-status-danger" aria-hidden="true">*</span>
        </label>
        <textarea
          id="unresolved-reason"
          v-model="unresolvedReason"
          class="app-input min-h-28 resize-y py-3"
          maxlength="5000"
          placeholder="Explique por que a demanda foi encerrada sem solução"
        ></textarea>
      </div>

      <div v-else-if="resolutionStatus === 'em_tratativa'" class="space-y-5">
        <div class="grid gap-5 sm:grid-cols-2">
          <div>
            <label
              class="mb-2 block text-sm font-semibold text-content"
              for="continuity-responsible"
            >
              Responsável <span class="text-status-danger" aria-hidden="true">*</span>
            </label>
            <input
              id="continuity-responsible"
              v-model="continuityResponsible"
              class="app-input"
              maxlength="150"
              placeholder="Pessoa ou setor responsável"
            />
          </div>
          <div>
            <label class="mb-2 block text-sm font-semibold text-content" for="attendance-due-date">
              Prazo <span class="text-status-danger" aria-hidden="true">*</span>
            </label>
            <input
              id="attendance-due-date"
              v-model="dueDate"
              class="app-input"
              type="date"
              :min="currentInstitutionDate"
            />
          </div>
        </div>
        <div>
          <label class="mb-2 block text-sm font-semibold text-content" for="attendance-next-step">
            Próximo passo <span class="text-status-danger" aria-hidden="true">*</span>
          </label>
          <textarea
            id="attendance-next-step"
            v-model="nextStep"
            class="app-input min-h-28 resize-y py-3"
            maxlength="5000"
            placeholder="Descreva a ação necessária para dar continuidade"
          ></textarea>
        </div>
      </div>
    </div>

    <div class="mt-6">
      <label class="mb-2 block text-sm font-semibold text-content" for="attendance-internal-notes">
        Observações internas
      </label>
      <textarea
        id="attendance-internal-notes"
        v-model="internalNotes"
        class="app-input min-h-28 resize-y py-3"
        maxlength="5000"
        placeholder="Informações úteis apenas para a equipe"
      ></textarea>
    </div>

    <p v-if="localError || error" class="mt-4 text-sm font-medium text-status-danger" role="alert">
      {{ localError || error }}
    </p>

    <template #footer>
      <AppButton variant="ghost" :disabled="loading" @click="close">Voltar</AppButton>
      <AppButton :loading="loading" loading-label="Registrando..." @click="confirm">
        Registrar resultado
      </AppButton>
    </template>
  </AppModal>
</template>
