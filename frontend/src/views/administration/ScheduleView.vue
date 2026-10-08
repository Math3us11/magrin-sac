<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { computed, onMounted, ref } from 'vue'

import AppButton from '@/components/basic/AppButton.vue'
import AppCalendar from '@/components/basic/AppCalendar.vue'
import AppSelect from '@/components/basic/AppSelect.vue'
import {
  getInstitutionDateTime,
  INSTITUTION_TIME_ZONE,
  INSTITUTION_TIME_ZONE_LABEL,
} from '@/config/date-time'
import { useDocumentTitle } from '@/composables/useDocumentTitle'
import {
  calendarCheckIcon,
  circleCheckIcon,
  clockIcon,
  triangleAlertIcon,
  usersIcon,
} from '@/icons'
import { ApiError } from '@/services/api'
import { listAdminAppointments } from '@/services/appointments'
import { listAdminAvailabilities } from '@/services/availability'
import { pinia } from '@/stores'
import { useLoadingStore } from '@/stores/loading'
import type { AdminAppointmentItem, AppointmentStatus } from '@/types/appointment'
import type {
  AdminAvailabilityItem,
  AvailabilityModality,
  AvailabilityState,
} from '@/types/availability'
import type { AppCalendarEvent } from '@/types/calendar'

useDocumentTitle('Agenda geral | Sistema de Agendamento')

const loadingStore = useLoadingStore(pinia)
const currentInstitutionDate = getInstitutionDateTime().date
const visibleMonth = ref(currentInstitutionDate.slice(0, 7))
const modalityFilter = ref<AvailabilityModality | ''>('')
const stateFilter = ref<AvailabilityState | ''>('')
const appointmentStatusFilter = ref<AppointmentStatus | ''>('')
const availabilities = ref<AdminAvailabilityItem[]>([])
const appointments = ref<AdminAppointmentItem[]>([])
const summary = ref({ active: 0, blocked: 0, cancelled: 0 })
const loading = ref(true)
const loadError = ref('')
let requestSequence = 0

const availabilityStateLabels: Record<AvailabilityState, string> = {
  ativa: 'Ativa',
  bloqueada: 'Bloqueada',
  cancelada: 'Cancelada',
}
const appointmentStatusLabels: Record<AppointmentStatus, string> = {
  ausencia: 'Ausência',
  cancelado: 'Cancelado',
  concluido: 'Concluído',
  confirmado: 'Confirmado',
}

const modalityOptions = [
  { label: 'Todas', value: '' },
  { label: 'Presencial', value: 'presencial' },
  { label: 'Online', value: 'online' },
] as const
const availabilityStateOptions = [
  { label: 'Todos os estados', value: '' },
  { label: 'Ativa', value: 'ativa' },
  { label: 'Bloqueada', value: 'bloqueada' },
  { label: 'Cancelada', value: 'cancelada' },
] as const
const appointmentStatusOptions = [
  { label: 'Todos os estados', value: '' },
  { label: 'Confirmado', value: 'confirmado' },
  { label: 'Cancelado', value: 'cancelado' },
  { label: 'Concluído', value: 'concluido' },
  { label: 'Ausência', value: 'ausencia' },
] as const

function monthRange(month: string): { from: string; to: string } {
  const first = `${month}-01`
  const date = new Date(`${first}T12:00:00.000Z`)
  date.setUTCMonth(date.getUTCMonth() + 1)
  date.setUTCDate(0)
  return { from: first, to: date.toISOString().slice(0, 10) }
}

function formatModalities(modalities: AvailabilityModality[]): string {
  if (modalities.length === 2) return 'Presencial e online'
  return modalities[0] === 'online' ? 'Online' : 'Presencial'
}

function formatAppointmentDate(value: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'medium',
    timeZone: INSTITUTION_TIME_ZONE,
  }).format(new Date(value))
}

function formatTime(value: string): string {
  return getInstitutionDateTime(new Date(value)).time
}

const calendarEvents = computed<AppCalendarEvent[]>(() =>
  availabilities.value.map((availability) => {
    const startsAt = getInstitutionDateTime(new Date(availability.startsAt))
    const endsAt = getInstitutionDateTime(new Date(availability.endsAt))
    const tone =
      availability.state === 'ativa'
        ? ('success' as const)
        : availability.state === 'bloqueada'
          ? ('warning' as const)
          : ('neutral' as const)

    return {
      date: startsAt.date,
      description: `${availability.professor.name} · ${formatModalities(availability.modalities)}`,
      id: `admin-availability-${availability.id}`,
      statusLabel: availabilityStateLabels[availability.state],
      title: `${startsAt.time}–${endsAt.time}`,
      tone,
    }
  }),
)

const statusCards = computed(() => [
  {
    icon: circleCheckIcon,
    label: 'Disponibilidades ativas',
    tone: 'bg-status-success-soft text-status-success',
    value: summary.value.active,
  },
  {
    icon: triangleAlertIcon,
    label: 'Bloqueadas',
    tone: 'bg-status-warning-soft text-status-warning',
    value: summary.value.blocked,
  },
  {
    icon: triangleAlertIcon,
    label: 'Canceladas',
    tone: 'bg-surface-subtle text-content-muted',
    value: summary.value.cancelled,
  },
  {
    icon: calendarCheckIcon,
    label: 'Agendamentos no mês',
    tone: 'bg-brand-secondary-soft text-brand-secondary',
    value: appointments.value.length,
  },
])

async function loadSchedule(month = visibleMonth.value) {
  const currentRequest = ++requestSequence
  const loadingId = loadingStore.start({ description: 'Carregando a agenda geral...' })
  loading.value = true
  loadError.value = ''

  try {
    const range = monthRange(month)
    const [availabilityResponse, appointmentResponse] = await Promise.all([
      listAdminAvailabilities({
        ...range,
        modality: modalityFilter.value || undefined,
        state: stateFilter.value || undefined,
      }),
      listAdminAppointments({
        ...range,
        status: appointmentStatusFilter.value || undefined,
      }),
    ])
    if (currentRequest !== requestSequence) return

    availabilities.value = availabilityResponse.availabilities
    appointments.value = appointmentResponse.appointments
    summary.value = availabilityResponse.summary
  } catch (error) {
    if (currentRequest !== requestSequence) return

    availabilities.value = []
    appointments.value = []
    summary.value = { active: 0, blocked: 0, cancelled: 0 }
    loadError.value =
      error instanceof ApiError
        ? error.message
        : 'Não foi possível carregar a agenda geral. Tente novamente.'
  } finally {
    loadingStore.stop(loadingId)
    if (currentRequest === requestSequence) loading.value = false
  }
}

function changeMonth(month: string) {
  if (month === visibleMonth.value) return
  visibleMonth.value = month
  void loadSchedule(month)
}

function applyFilters() {
  void loadSchedule()
}

onMounted(() => void loadSchedule())
</script>

<template>
  <section class="relative isolate min-h-full overflow-hidden">
    <div
      class="institutional-glow pointer-events-none absolute inset-x-0 top-0 -z-10 h-80"
      aria-hidden="true"
    ></div>

    <div class="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
      <header class="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div class="max-w-3xl">
          <div class="flex flex-wrap items-center gap-2">
            <p class="text-xs font-bold uppercase tracking-[0.16em] text-brand-primary">
              Administração
            </p>
            <span
              class="rounded-full border border-outline bg-surface px-2.5 py-1 text-[0.68rem] font-bold uppercase tracking-[0.1em] text-content-muted"
            >
              Somente consulta
            </span>
          </div>
          <h1 class="mt-3 text-3xl font-bold tracking-tight text-content sm:text-4xl">
            Agenda geral
          </h1>
          <p class="mt-4 max-w-2xl text-base leading-7 text-content-muted">
            Consulte disponibilidades e agendamentos de todos os professores em
            {{ INSTITUTION_TIME_ZONE_LABEL }}.
          </p>
        </div>
      </header>

      <section
        class="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4"
        aria-label="Resumo da agenda geral"
      >
        <article
          v-for="card in statusCards"
          :key="card.label"
          class="rounded-2xl border border-outline bg-surface p-5"
        >
          <div class="flex items-center justify-between gap-4">
            <span
              class="inline-flex h-11 w-11 items-center justify-center rounded-xl"
              :class="card.tone"
            >
              <Icon class="h-5 w-5" :icon="card.icon" aria-hidden="true" />
            </span>
            <strong class="text-2xl text-content">{{ loading ? '—' : card.value }}</strong>
          </div>
          <p class="mt-4 font-bold text-content">{{ card.label }}</p>
        </article>
      </section>

      <section class="mt-8 rounded-3xl border border-outline bg-surface p-5 sm:p-6">
        <div class="grid gap-4 md:grid-cols-3 xl:grid-cols-[1fr_1fr_1fr_auto] xl:items-end">
          <AppSelect
            v-model="modalityFilter"
            label="Modalidade"
            name="modality"
            :options="modalityOptions"
          />
          <AppSelect
            v-model="stateFilter"
            label="Disponibilidade"
            name="availabilityState"
            :options="availabilityStateOptions"
          />
          <AppSelect
            v-model="appointmentStatusFilter"
            label="Agendamento"
            name="appointmentStatus"
            :options="appointmentStatusOptions"
          />
          <AppButton :loading="loading" loading-label="Filtrando..." @click="applyFilters">
            Aplicar filtros
          </AppButton>
        </div>
      </section>

      <div
        v-if="loadError"
        class="mt-8 rounded-3xl border border-outline bg-surface p-10 text-center"
        role="alert"
      >
        <Icon
          class="mx-auto h-9 w-9 text-status-danger"
          :icon="triangleAlertIcon"
          aria-hidden="true"
        />
        <h2 class="mt-4 text-xl font-bold text-content">Não foi possível carregar a agenda</h2>
        <p class="mt-2 text-sm text-content-muted">{{ loadError }}</p>
        <AppButton class="mt-5" variant="secondary" @click="loadSchedule()"
          >Tentar novamente</AppButton
        >
      </div>

      <section v-else class="mt-8 overflow-hidden rounded-3xl border border-outline bg-surface">
        <div class="border-b border-outline px-6 py-5 sm:px-8">
          <p class="text-xs font-bold uppercase tracking-[0.14em] text-brand-primary">
            Visão global
          </p>
          <h2 class="mt-1 text-xl font-bold text-content">Disponibilidades por professor</h2>
        </div>
        <AppCalendar
          :events="calendarEvents"
          :initial-date="`${visibleMonth}-01`"
          :today="currentInstitutionDate"
          @visible-month-change="changeMonth"
        />
      </section>

      <section class="mt-8 rounded-3xl border border-outline bg-surface p-6 sm:p-8">
        <div class="flex items-center gap-3">
          <span
            class="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-brand-primary-soft text-brand-primary"
          >
            <Icon class="h-5 w-5" :icon="usersIcon" aria-hidden="true" />
          </span>
          <div>
            <p class="text-xs font-bold uppercase tracking-[0.14em] text-brand-primary">
              Atendimentos
            </p>
            <h2 class="text-xl font-bold text-content">Agendamentos do período</h2>
          </div>
        </div>

        <p
          v-if="!loading && !appointments.length"
          class="mt-6 rounded-2xl border border-dashed border-outline bg-surface-subtle p-6 text-center text-sm text-content-muted"
        >
          Nenhum agendamento encontrado neste período.
        </p>

        <ul v-else class="mt-6 grid gap-4 lg:grid-cols-2">
          <li
            v-for="appointment in appointments"
            :key="appointment.id"
            class="rounded-2xl border border-outline p-5"
          >
            <div class="flex items-start justify-between gap-4">
              <div>
                <p class="text-xs font-bold uppercase tracking-[0.1em] text-content-muted">
                  {{ appointment.protocol }}
                </p>
                <h3 class="mt-1 font-bold text-content">{{ appointment.subject }}</h3>
              </div>
              <span
                class="rounded-full bg-brand-primary-soft px-3 py-1 text-xs font-bold text-brand-primary"
              >
                {{ appointmentStatusLabels[appointment.status] }}
              </span>
            </div>
            <div class="mt-4 grid gap-2 text-sm text-content-muted sm:grid-cols-2">
              <p><strong class="text-content">Aluno:</strong> {{ appointment.student.name }}</p>
              <p>
                <strong class="text-content">Professor:</strong> {{ appointment.professor.name }}
              </p>
              <p class="flex items-center gap-2">
                <Icon class="h-4 w-4" :icon="clockIcon" aria-hidden="true" />
                {{ formatAppointmentDate(appointment.startsAt) }},
                {{ formatTime(appointment.startsAt) }}–{{ formatTime(appointment.endsAt) }}
              </p>
              <p>
                <strong class="text-content">Modalidade:</strong>
                {{ appointment.modality === 'online' ? 'Online' : 'Presencial' }}
              </p>
            </div>
          </li>
        </ul>
      </section>
    </div>
  </section>
</template>
