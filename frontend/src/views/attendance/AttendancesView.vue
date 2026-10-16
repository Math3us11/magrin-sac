<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import AppButton from '@/components/basic/AppButton.vue'
import AppSelect from '@/components/basic/AppSelect.vue'
import AppTable from '@/components/basic/AppTable.vue'
import { useDocumentTitle } from '@/composables/useDocumentTitle'
import { INSTITUTION_TIME_ZONE, getInstitutionDateTime } from '@/config/date-time'
import { eyeIcon } from '@/icons'
import { ApiError } from '@/services/api'
import { listAttendances } from '@/services/attendance'
import { useLoadingStore } from '@/stores/loading'
import type {
  AttendanceListItem,
  AttendanceOccurrence,
  AttendanceResolutionStatus,
} from '@/types/attendance'
import type { AppTableColumn, AppTableRecord } from '@/types/table'

type AttendanceScope = 'admin' | 'professor'

const props = defineProps<{ scope: AttendanceScope }>()
const route = useRoute()
const router = useRouter()
const loadingStore = useLoadingStore()

useDocumentTitle(
  props.scope === 'admin'
    ? 'Atendimentos | Administração | Sistema de Agendamento'
    : 'Atendimentos | Sistema de Agendamento',
)

const today = getInstitutionDateTime().date
const defaultFrom = `${today.slice(0, 8)}01`
const validDateQuery = (value: unknown, fallback: string) =>
  typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : fallback
const validOptionQuery = (value: unknown, options: string[]) =>
  typeof value === 'string' && options.includes(value) ? value : ''
const from = ref(validDateQuery(route.query.from, defaultFrom))
const to = ref(validDateQuery(route.query.to, today))
const occurrence = ref(validOptionQuery(route.query.occurrence, ['realizado', 'ausencia']))
const resolutionStatus = ref(
  validOptionQuery(route.query.resolutionStatus, ['em_tratativa', 'resolvido', 'nao_resolvido']),
)
const attendances = ref<AttendanceListItem[]>([])
const listLoading = ref(true)
const listError = ref('')
let listSequence = 0

const occurrenceOptions = [
  { label: 'Todas as ocorrências', value: '' },
  { label: 'Realizados', value: 'realizado' },
  { label: 'Ausências', value: 'ausencia' },
]
const resolutionOptions = [
  { label: 'Todas as classificações', value: '' },
  { label: 'Em tratativa', value: 'em_tratativa' },
  { label: 'Resolvidos', value: 'resolvido' },
  { label: 'Não resolvidos', value: 'nao_resolvido' },
]

type AttendanceTableRow = AttendanceListItem & {
  dateTime: string
  professorName: string
  protocol: string
  status: string
  studentName: string
  subject: string
}

const attendanceColumns = computed<AppTableColumn[]>(() => [
  { name: 'Ações', size: 120, value: 'actions' },
  { name: 'Data e horário', size: 190, value: 'dateTime' },
  { name: 'Protocolo', size: 175, value: 'protocol' },
  { name: 'Assunto', value: 'subject' },
  { name: 'Aluno', size: 180, value: 'studentName' },
  ...(props.scope === 'admin' ? [{ name: 'Professor', size: 180, value: 'professorName' }] : []),
  { name: 'Situação', size: 150, value: 'status' },
])

const attendanceRows = computed<AttendanceTableRow[]>(() =>
  attendances.value.map((attendance) => ({
    ...attendance,
    dateTime: attendance.appointment.startsAt,
    professorName: attendance.appointment.professor.name,
    protocol: attendance.appointment.protocol,
    status:
      attendance.occurrence === 'ausencia'
        ? 'Ausência'
        : resolutionLabel(attendance.resolutionStatus),
    studentName: attendance.appointment.student.name,
    subject: attendance.appointment.subject,
  })),
)

const summary = computed(() => ({
  absences: attendances.value.filter(({ occurrence }) => occurrence === 'ausencia').length,
  inProgress: attendances.value.filter(
    ({ resolutionStatus }) => resolutionStatus === 'em_tratativa',
  ).length,
  resolved: attendances.value.filter(({ resolutionStatus }) => resolutionStatus === 'resolvido')
    .length,
  total: attendances.value.length,
}))

const scopeEyebrow = computed(() => (props.scope === 'admin' ? 'Administração' : 'Minha agenda'))
const scopeDescription = computed(() =>
  props.scope === 'admin'
    ? 'Consulte todos os resultados registrados e acompanhe demandas institucionais em andamento.'
    : 'Consulte os resultados vinculados à sua agenda e mantenha as tratativas sob acompanhamento.',
)

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback
}

async function loadList() {
  const currentRequest = ++listSequence
  const loadingId = loadingStore.start({ description: 'Carregando atendimentos...' })
  listLoading.value = true
  listError.value = ''

  try {
    const response = await listAttendances(props.scope, {
      from: from.value,
      occurrence: (occurrence.value || undefined) as AttendanceOccurrence | undefined,
      resolutionStatus: (resolutionStatus.value || undefined) as
        AttendanceResolutionStatus | undefined,
      to: to.value,
    })
    if (currentRequest !== listSequence) return

    attendances.value = response.attendances
  } catch (error) {
    if (currentRequest !== listSequence) return
    attendances.value = []
    listError.value = errorMessage(
      error,
      'Não foi possível carregar os atendimentos. Tente novamente.',
    )
  } finally {
    loadingStore.stop(loadingId)
    if (currentRequest === listSequence) listLoading.value = false
  }
}

function attendanceFromRecord(record: AppTableRecord): AttendanceTableRow {
  return record as AttendanceTableRow
}

function showAttendance(record: AppTableRecord) {
  const attendance = attendanceFromRecord(record)
  void router.push({
    name:
      props.scope === 'admin' ? 'administration-attendances-view' : 'professor-attendances-view',
    params: { attendanceId: attendance.id },
  })
}

function formatShortDate(value: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
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

function resolutionLabel(value: AttendanceResolutionStatus | null): string {
  if (value === 'em_tratativa') return 'Em tratativa'
  if (value === 'nao_resolvido') return 'Não resolvido'
  if (value === 'resolvido') return 'Resolvido'
  return 'Sem classificação'
}

function statusClasses(item: Pick<AttendanceListItem, 'occurrence' | 'resolutionStatus'>): string {
  if (item.occurrence === 'ausencia') return 'bg-surface-subtle text-content-muted'
  if (item.resolutionStatus === 'resolvido') return 'bg-status-success-soft text-status-success'
  if (item.resolutionStatus === 'nao_resolvido') return 'bg-status-danger-soft text-status-danger'
  return 'bg-brand-secondary-soft text-brand-secondary'
}

onMounted(() => void loadList())
onBeforeUnmount(() => {
  listSequence += 1
})
</script>

<template>
  <section class="relative isolate min-h-full overflow-hidden">
    <div
      class="institutional-glow pointer-events-none absolute inset-x-0 top-0 -z-10 h-80"
      aria-hidden="true"
    ></div>

    <div class="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
      <header class="max-w-3xl">
        <p class="text-xs font-bold uppercase tracking-[0.16em] text-brand-primary">
          {{ scopeEyebrow }}
        </p>
        <h1 class="mt-3 text-3xl font-bold tracking-tight text-content sm:text-4xl">
          Atendimentos
        </h1>
        <p class="mt-4 text-base leading-7 text-content-muted">{{ scopeDescription }}</p>
      </header>

      <section class="mt-8 rounded-3xl border border-outline bg-surface p-5 sm:p-6">
        <div
          class="grid gap-4 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1.15fr_1.15fr_auto] xl:items-end"
        >
          <div>
            <label class="mb-2 block text-sm font-semibold text-content" for="attendance-from">
              Data inicial
            </label>
            <input id="attendance-from" v-model="from" class="app-input" type="date" />
          </div>
          <div>
            <label class="mb-2 block text-sm font-semibold text-content" for="attendance-to">
              Data final
            </label>
            <input id="attendance-to" v-model="to" class="app-input" type="date" />
          </div>
          <AppSelect
            v-model="occurrence"
            label="Ocorrência"
            name="attendanceOccurrenceFilter"
            :options="occurrenceOptions"
          />
          <AppSelect
            v-model="resolutionStatus"
            label="Classificação"
            name="attendanceResolutionFilter"
            :options="resolutionOptions"
          />
          <AppButton :loading="listLoading" loading-label="Filtrando..." @click="loadList">
            Filtrar
          </AppButton>
        </div>
      </section>

      <section class="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Resumo do período">
        <article class="rounded-2xl border border-outline bg-surface p-5">
          <p class="text-xs font-bold uppercase tracking-[0.12em] text-content-muted">Registros</p>
          <p class="mt-2 text-3xl font-bold text-content">{{ summary.total }}</p>
        </article>
        <article class="rounded-2xl border border-outline bg-surface p-5">
          <p class="text-xs font-bold uppercase tracking-[0.12em] text-brand-secondary">
            Em tratativa
          </p>
          <p class="mt-2 text-3xl font-bold text-content">{{ summary.inProgress }}</p>
        </article>
        <article class="rounded-2xl border border-outline bg-surface p-5">
          <p class="text-xs font-bold uppercase tracking-[0.12em] text-status-success">
            Resolvidos
          </p>
          <p class="mt-2 text-3xl font-bold text-content">{{ summary.resolved }}</p>
        </article>
        <article class="rounded-2xl border border-outline bg-surface p-5">
          <p class="text-xs font-bold uppercase tracking-[0.12em] text-content-muted">Ausências</p>
          <p class="mt-2 text-3xl font-bold text-content">{{ summary.absences }}</p>
        </article>
      </section>

      <AppTable
        class="mt-6"
        :body-max-height="560"
        :body-min-height="280"
        :columns="attendanceColumns"
        empty-message="Nenhum atendimento foi encontrado para os filtros escolhidos."
        :error="listError"
        :loading="listLoading"
        name="Resultados registrados"
        :records="attendanceRows"
        @retry="loadList"
      >
        <template #cell-actions="{ record }">
          <button
            class="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-outline px-3 text-xs font-bold text-content transition hover:border-brand-primary hover:bg-brand-primary-soft hover:text-brand-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus"
            :data-testid="`show-attendance-${attendanceFromRecord(record).id}`"
            type="button"
            :aria-label="`Exibir atendimento ${attendanceFromRecord(record).protocol}`"
            @click="showAttendance(record)"
          >
            <Icon class="h-4 w-4" :icon="eyeIcon" aria-hidden="true" />
            Exibir
          </button>
        </template>

        <template #cell-dateTime="{ record }">
          <span class="font-semibold text-content">
            {{ formatShortDate(attendanceFromRecord(record).appointment.startsAt) }}
          </span>
          <span class="mt-1 block text-xs text-content-muted">
            {{ formatTime(attendanceFromRecord(record).appointment.startsAt) }}–{{
              formatTime(attendanceFromRecord(record).appointment.endsAt)
            }}
          </span>
        </template>

        <template #cell-protocol="{ value }">
          <span class="whitespace-nowrap text-xs font-bold uppercase tracking-[0.06em]">
            {{ value }}
          </span>
        </template>

        <template #cell-subject="{ value }">
          <span class="font-semibold">{{ value }}</span>
        </template>

        <template #cell-status="{ record }">
          <span
            class="inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold"
            :class="statusClasses(attendanceFromRecord(record))"
          >
            {{ attendanceFromRecord(record).status }}
          </span>
        </template>
      </AppTable>
    </div>
  </section>
</template>
