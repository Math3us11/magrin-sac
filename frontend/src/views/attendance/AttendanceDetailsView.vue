<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import AttendanceTransitionModal from '@/components/attendance/AttendanceTransitionModal.vue'
import AppButton from '@/components/basic/AppButton.vue'
import { useDocumentTitle } from '@/composables/useDocumentTitle'
import { INSTITUTION_TIME_ZONE } from '@/config/date-time'
import { arrowLeftIcon, calendarCheckIcon, circleCheckIcon, clockIcon, historyIcon } from '@/icons'
import { ApiError } from '@/services/api'
import { getAttendance, updateAttendanceStatus } from '@/services/attendance'
import { useLoadingStore } from '@/stores/loading'
import type {
  AttendanceDetail,
  AttendanceHistoryItem,
  AttendanceListItem,
  AttendanceResolutionStatus,
  UpdateAttendanceStatusPayload,
} from '@/types/attendance'

type AttendanceScope = 'admin' | 'professor'

const props = defineProps<{ scope: AttendanceScope }>()
const route = useRoute()
const router = useRouter()
const loadingStore = useLoadingStore()

useDocumentTitle('Atendimento | Sistema de Agendamento')

const attendance = ref<AttendanceDetail | null>(null)
const history = ref<AttendanceHistoryItem[]>([])
const loadError = ref('')
const transitionOpen = ref(false)
const transitionLoading = ref(false)
const transitionError = ref('')
let requestSequence = 0

const attendanceId = computed(() => Number(route.params.attendanceId))
const listRouteName = computed(() =>
  props.scope === 'admin' ? 'administration-attendances' : 'professor-attendances',
)
const scopeEyebrow = computed(() =>
  props.scope === 'admin' ? 'Administração · Atendimentos' : 'Minha agenda · Atendimentos',
)
const hasInternalRecord = computed(() => {
  const item = attendance.value
  return Boolean(
    item &&
    (item.internalNotes ||
      item.solution ||
      item.referral ||
      item.unresolvedReason ||
      item.continuityResponsible ||
      item.dueDate ||
      item.nextStep),
  )
})

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback
}

async function loadPage() {
  const id = attendanceId.value
  if (!Number.isSafeInteger(id) || id <= 0) {
    attendance.value = null
    history.value = []
    loadError.value = 'O atendimento informado não é válido.'
    return
  }

  const currentRequest = ++requestSequence
  const loadingId = loadingStore.start({ description: 'Carregando atendimento...' })
  loadError.value = ''

  try {
    const response = await getAttendance(props.scope, id)
    if (currentRequest !== requestSequence) return
    attendance.value = response.attendance
    history.value = response.history
  } catch (error) {
    if (currentRequest !== requestSequence) return
    attendance.value = null
    history.value = []
    loadError.value = errorMessage(error, 'Não foi possível carregar os detalhes do atendimento.')
  } finally {
    loadingStore.stop(loadingId)
  }
}

function returnToAttendances() {
  void router.push({ name: listRouteName.value })
}

function openTransition() {
  transitionError.value = ''
  transitionOpen.value = true
}

async function confirmTransition(payload: UpdateAttendanceStatusPayload) {
  if (!attendance.value || transitionLoading.value) return
  transitionLoading.value = true
  transitionError.value = ''

  try {
    await updateAttendanceStatus(props.scope, attendance.value.id, payload)
    transitionOpen.value = false
    await loadPage()
  } catch (error) {
    transitionError.value = errorMessage(error, 'Não foi possível atualizar a tratativa.')
  } finally {
    transitionLoading.value = false
  }
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'long',
    timeZone: INSTITUTION_TIME_ZONE,
  }).format(new Date(value))
}

function formatTime(value: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: INSTITUTION_TIME_ZONE,
  }).format(new Date(value))
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: INSTITUTION_TIME_ZONE,
  }).format(new Date(value))
}

function formatDueDate(value: string): string {
  const [year, month, day] = value.split('-')
  return year && month && day ? `${day}/${month}/${year}` : value
}

function resolutionLabel(value: AttendanceResolutionStatus | null): string {
  if (value === 'em_tratativa') return 'Em tratativa'
  if (value === 'nao_resolvido') return 'Não resolvido'
  if (value === 'resolvido') return 'Resolvido'
  return 'Sem classificação'
}

function statusLabel(item: Pick<AttendanceListItem, 'occurrence' | 'resolutionStatus'>): string {
  return item.occurrence === 'ausencia' ? 'Ausência' : resolutionLabel(item.resolutionStatus)
}

function statusClasses(item: Pick<AttendanceListItem, 'occurrence' | 'resolutionStatus'>): string {
  if (item.occurrence === 'ausencia') return 'bg-surface-subtle text-content-muted'
  if (item.resolutionStatus === 'resolvido') return 'bg-status-success-soft text-status-success'
  if (item.resolutionStatus === 'nao_resolvido') return 'bg-status-danger-soft text-status-danger'
  return 'bg-brand-secondary-soft text-brand-secondary'
}

onMounted(() => void loadPage())
onBeforeUnmount(() => {
  requestSequence += 1
})
</script>

<template>
  <section class="relative isolate min-h-full overflow-hidden">
    <div
      class="institutional-glow pointer-events-none absolute inset-x-0 top-0 -z-10 h-80"
      aria-hidden="true"
    ></div>

    <div class="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
      <button
        class="inline-flex items-center gap-2 text-sm font-semibold text-content-muted transition hover:text-brand-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus"
        type="button"
        @click="returnToAttendances"
      >
        <Icon class="h-4 w-4" :icon="arrowLeftIcon" aria-hidden="true" />
        Voltar para atendimentos
      </button>

      <div
        v-if="loadError"
        class="surface-card mt-7 rounded-3xl border border-status-danger bg-surface p-6 sm:p-8"
        role="alert"
      >
        <h1 class="text-2xl font-bold text-content">Não foi possível abrir o atendimento</h1>
        <p class="mt-3 text-sm leading-6 text-content-muted">{{ loadError }}</p>
        <AppButton class="mt-6" variant="secondary" @click="loadPage">Tentar novamente</AppButton>
      </div>

      <template v-else-if="attendance">
        <header class="mt-7 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p class="text-xs font-bold uppercase tracking-[0.16em] text-brand-primary">
              {{ scopeEyebrow }}
            </p>
            <h1 class="mt-3 text-3xl font-bold tracking-tight text-content sm:text-4xl">
              Visualizar atendimento
            </h1>
            <p class="mt-3 text-sm leading-6 text-content-muted">
              Consulte o registro, acompanhe a demanda e revise o histórico de alterações.
            </p>
          </div>

          <AppButton
            v-if="attendance.resolutionStatus === 'em_tratativa'"
            data-testid="update-attendance"
            @click="openTransition"
          >
            Atualizar tratativa
          </AppButton>
        </header>

        <section class="surface-card mt-8 rounded-3xl border border-outline bg-surface p-6 sm:p-8">
          <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p class="text-xs font-bold uppercase tracking-[0.1em] text-content-muted">
                {{ attendance.appointment.protocol }}
              </p>
              <h2 class="mt-2 text-2xl font-bold text-content">
                {{ attendance.appointment.subject }}
              </h2>
            </div>
            <span
              class="inline-flex w-fit rounded-full px-3 py-1 text-xs font-bold"
              :class="statusClasses(attendance)"
            >
              {{ statusLabel(attendance) }}
            </span>
          </div>

          <dl class="mt-7 grid gap-5 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <dt class="font-semibold text-content-muted">Data e horário</dt>
              <dd class="mt-1 capitalize text-content">
                {{ formatDate(attendance.appointment.startsAt) }},
                {{ formatTime(attendance.appointment.startsAt) }}–{{
                  formatTime(attendance.appointment.endsAt)
                }}
              </dd>
            </div>
            <div>
              <dt class="font-semibold text-content-muted">Modalidade</dt>
              <dd class="mt-1 capitalize text-content">{{ attendance.appointment.modality }}</dd>
            </div>
            <div>
              <dt class="font-semibold text-content-muted">Aluno</dt>
              <dd class="mt-1 text-content">{{ attendance.appointment.student.name }}</dd>
            </div>
            <div>
              <dt class="font-semibold text-content-muted">Professor</dt>
              <dd class="mt-1 text-content">{{ attendance.appointment.professor.name }}</dd>
            </div>
          </dl>

          <div v-if="attendance.appointment.details" class="mt-7 border-t border-outline pt-6">
            <h3 class="text-sm font-semibold text-content-muted">Informações do agendamento</h3>
            <p class="mt-2 whitespace-pre-wrap text-sm leading-6 text-content">
              {{ attendance.appointment.details }}
            </p>
          </div>
        </section>

        <div
          class="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(20rem,0.85fr)]"
        >
          <section class="surface-card rounded-3xl border border-outline bg-surface p-6 sm:p-8">
            <div class="flex items-center gap-3">
              <span
                class="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-primary-soft text-brand-primary"
              >
                <Icon class="h-5 w-5" :icon="calendarCheckIcon" aria-hidden="true" />
              </span>
              <div>
                <p class="text-xs font-bold uppercase tracking-[0.12em] text-brand-primary">
                  Acompanhamento
                </p>
                <h2 class="mt-1 text-xl font-bold text-content">Registro interno</h2>
              </div>
            </div>

            <dl v-if="hasInternalRecord" class="mt-7 grid gap-6 text-sm sm:grid-cols-2">
              <div v-if="attendance.internalNotes" class="sm:col-span-2">
                <dt class="font-semibold text-content-muted">Observações internas</dt>
                <dd class="mt-2 whitespace-pre-wrap leading-6 text-content">
                  {{ attendance.internalNotes }}
                </dd>
              </div>
              <div v-if="attendance.solution" class="sm:col-span-2">
                <dt class="font-semibold text-content-muted">Solução</dt>
                <dd class="mt-2 whitespace-pre-wrap leading-6 text-content">
                  {{ attendance.solution }}
                </dd>
              </div>
              <div v-if="attendance.referral" class="sm:col-span-2">
                <dt class="font-semibold text-content-muted">Encaminhamento</dt>
                <dd class="mt-2 whitespace-pre-wrap leading-6 text-content">
                  {{ attendance.referral }}
                </dd>
              </div>
              <div v-if="attendance.unresolvedReason" class="sm:col-span-2">
                <dt class="font-semibold text-content-muted">Justificativa</dt>
                <dd class="mt-2 whitespace-pre-wrap leading-6 text-content">
                  {{ attendance.unresolvedReason }}
                </dd>
              </div>
              <div v-if="attendance.continuityResponsible">
                <dt class="font-semibold text-content-muted">Responsável</dt>
                <dd class="mt-2 text-content">{{ attendance.continuityResponsible }}</dd>
              </div>
              <div v-if="attendance.dueDate">
                <dt class="font-semibold text-content-muted">Prazo</dt>
                <dd class="mt-2 text-content">{{ formatDueDate(attendance.dueDate) }}</dd>
              </div>
              <div v-if="attendance.nextStep" class="sm:col-span-2">
                <dt class="font-semibold text-content-muted">Próximo passo</dt>
                <dd class="mt-2 whitespace-pre-wrap leading-6 text-content">
                  {{ attendance.nextStep }}
                </dd>
              </div>
            </dl>
            <p v-else class="mt-7 rounded-2xl bg-surface-subtle p-5 text-sm text-content-muted">
              Nenhuma informação interna complementar foi registrada.
            </p>

            <p
              v-if="attendance.resolutionStatus !== 'em_tratativa'"
              class="mt-7 border-t border-outline pt-5 text-xs leading-5 text-content-muted"
            >
              Ausências e classificações finais não podem ser reabertas neste primeiro fluxo.
            </p>
          </section>

          <section class="surface-card rounded-3xl border border-outline bg-surface p-6 sm:p-8">
            <div class="flex items-center gap-3">
              <span
                class="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-secondary-soft text-brand-secondary"
              >
                <Icon class="h-5 w-5" :icon="historyIcon" aria-hidden="true" />
              </span>
              <div>
                <p class="text-xs font-bold uppercase tracking-[0.12em] text-brand-secondary">
                  Auditoria
                </p>
                <h2 class="mt-1 text-xl font-bold text-content">Histórico</h2>
              </div>
            </div>

            <ol v-if="history.length" class="mt-7 space-y-5">
              <li v-for="item in history" :key="item.id" class="relative pl-8 text-sm">
                <span
                  class="absolute left-0 top-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand-secondary-soft text-brand-secondary"
                >
                  <Icon
                    class="h-3 w-3"
                    :icon="item.resolutionStatus === 'resolvido' ? circleCheckIcon : clockIcon"
                    aria-hidden="true"
                  />
                </span>
                <p class="font-semibold text-content">{{ statusLabel(item) }}</p>
                <p class="mt-1 text-content-muted">
                  {{ item.actor.name }} · {{ formatDateTime(item.changedAt) }}
                </p>
                <p v-if="item.changeReason" class="mt-2 leading-6 text-content-muted">
                  {{ item.changeReason }}
                </p>
              </li>
            </ol>
            <p v-else class="mt-7 text-sm text-content-muted">
              Nenhuma alteração foi registrada para este atendimento.
            </p>
          </section>
        </div>
      </template>
    </div>

    <AttendanceTransitionModal
      v-model:open="transitionOpen"
      :attendance="attendance"
      :error="transitionError"
      :loading="transitionLoading"
      @confirm="confirmTransition"
    />
  </section>
</template>
