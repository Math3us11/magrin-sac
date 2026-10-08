<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { computed, onMounted, ref } from 'vue'

import AppButton from '@/components/basic/AppButton.vue'
import AppCalendar from '@/components/basic/AppCalendar.vue'
import AppModal from '@/components/basic/AppModal.vue'
import AppSelect from '@/components/basic/AppSelect.vue'
import {
  getInstitutionDateTime,
  INSTITUTION_TIME_ZONE,
  INSTITUTION_TIME_ZONE_LABEL,
} from '@/config/date-time'
import { useDocumentTitle } from '@/composables/useDocumentTitle'
import {
  calendarCheckIcon,
  clockIcon,
  historyIcon,
  infoIcon,
  triangleAlertIcon,
  userPlusIcon,
} from '@/icons'
import { ApiError } from '@/services/api'
import { listOwnAppointments } from '@/services/appointments'
import { pinia } from '@/stores'
import { useLoadingStore } from '@/stores/loading'
import type {
  AppointmentStatus,
  OwnAppointmentItem,
  OwnAppointmentsScope,
} from '@/types/appointment'
import type { AvailabilityModality } from '@/types/availability'
import type { AppCalendarEvent } from '@/types/calendar'

type ViewMode = 'calendar' | OwnAppointmentsScope

useDocumentTitle('Meus agendamentos | Sistema de Agendamento')

const loadingStore = useLoadingStore(pinia)
const today = getInstitutionDateTime().date
const activeView = ref<ViewMode>('upcoming')
const visibleMonth = ref(today.slice(0, 7))
const selectedDate = ref(today)
const appointments = ref<OwnAppointmentItem[]>([])
const nextAppointment = ref<OwnAppointmentItem | null>(null)
const selectedAppointment = ref<OwnAppointmentItem | null>(null)
const detailsOpen = ref(false)
const loading = ref(true)
const loadError = ref('')
const page = ref(1)
const pageSize = 8
const total = ref(0)
const statusFilter = ref<AppointmentStatus | ''>('')
const modalityFilter = ref<AvailabilityModality | ''>('')
let requestSequence = 0

const statusLabels: Record<AppointmentStatus, string> = {
  ausencia: 'Ausência',
  cancelado: 'Cancelado',
  concluido: 'Concluído',
  confirmado: 'Confirmado',
}

const statusClasses: Record<AppointmentStatus, string> = {
  ausencia: 'bg-status-warning-soft text-status-warning',
  cancelado: 'bg-surface-subtle text-content-muted',
  concluido: 'bg-brand-secondary-soft text-brand-secondary',
  confirmado: 'bg-status-success-soft text-status-success',
}

const tabs = [
  { icon: clockIcon, id: 'upcoming', label: 'Próximos' },
  { icon: historyIcon, id: 'history', label: 'Histórico' },
  { icon: calendarCheckIcon, id: 'calendar', label: 'Calendário' },
] as const

const historyStatusOptions = [
  { label: 'Todas', value: '' },
  { label: 'Confirmado', value: 'confirmado' },
  { label: 'Concluído', value: 'concluido' },
  { label: 'Cancelado', value: 'cancelado' },
  { label: 'Ausência', value: 'ausencia' },
] as const

const modalityOptions = [
  { label: 'Todas', value: '' },
  { label: 'Presencial', value: 'presencial' },
  { label: 'Online', value: 'online' },
] as const

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize)))

const selectedDateLabel = computed(() =>
  new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'long',
    timeZone: 'UTC',
  }).format(new Date(`${selectedDate.value}T12:00:00.000Z`)),
)

const selectedDateAppointments = computed(() =>
  appointments.value
    .filter(
      (appointment) =>
        getInstitutionDateTime(new Date(appointment.startsAt)).date === selectedDate.value,
    )
    .sort((first, second) => first.startsAt.localeCompare(second.startsAt)),
)

const calendarEvents = computed<AppCalendarEvent[]>(() =>
  appointments.value.map((appointment) => {
    const startsAt = getInstitutionDateTime(new Date(appointment.startsAt))
    const endsAt = getInstitutionDateTime(new Date(appointment.endsAt))
    const tone =
      appointment.status === 'confirmado'
        ? ('success' as const)
        : appointment.status === 'ausencia'
          ? ('warning' as const)
          : appointment.status === 'concluido'
            ? ('brand' as const)
            : ('neutral' as const)

    return {
      actionLabel: 'Ver detalhes',
      date: startsAt.date,
      description: `${appointment.professor.name} · ${modalityLabel(appointment.modality)}`,
      id: appointment.id,
      statusLabel: statusLabels[appointment.status],
      title: `${startsAt.time}–${endsAt.time}`,
      tone,
    }
  }),
)

function monthRange(month: string): { from: string; to: string } {
  const first = `${month}-01`
  const date = new Date(`${first}T12:00:00.000Z`)
  date.setUTCMonth(date.getUTCMonth() + 1)
  date.setUTCDate(0)
  return { from: first, to: date.toISOString().slice(0, 10) }
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'long',
    timeZone: INSTITUTION_TIME_ZONE,
  }).format(new Date(value))
}

function formatTime(value: string): string {
  return getInstitutionDateTime(new Date(value)).time
}

function modalityLabel(modality: AvailabilityModality): string {
  return modality === 'online' ? 'Online' : 'Presencial'
}

function openDetails(appointment: OwnAppointmentItem) {
  selectedAppointment.value = appointment
  detailsOpen.value = true
}

function handleCalendarEvent(event: AppCalendarEvent) {
  const appointment = appointments.value.find(({ id }) => id === Number(event.id))
  if (appointment) openDetails(appointment)
}

function selectCalendarDate(date: string) {
  selectedDate.value = date
}

async function loadAppointments() {
  const currentRequest = ++requestSequence
  const loadingId = loadingStore.start({ description: 'Carregando seus agendamentos...' })
  loading.value = true
  loadError.value = ''

  try {
    const params =
      activeView.value === 'calendar'
        ? monthRange(visibleMonth.value)
        : {
            modality:
              activeView.value === 'history' ? modalityFilter.value || undefined : undefined,
            page: page.value,
            pageSize,
            scope: activeView.value,
            status: activeView.value === 'history' ? statusFilter.value || undefined : undefined,
          }
    const response = await listOwnAppointments(params)
    if (currentRequest !== requestSequence) return

    appointments.value = response.appointments
    total.value = response.total
    if (activeView.value === 'upcoming' && page.value === 1) {
      nextAppointment.value = response.appointments[0] ?? null
    }
  } catch (error) {
    if (currentRequest !== requestSequence) return
    appointments.value = []
    total.value = 0
    loadError.value =
      error instanceof ApiError
        ? error.message
        : 'Não foi possível carregar seus agendamentos. Tente novamente.'
  } finally {
    loadingStore.stop(loadingId)
    if (currentRequest === requestSequence) loading.value = false
  }
}

function changeView(view: ViewMode) {
  if (view === activeView.value) return
  activeView.value = view
  page.value = 1
  void loadAppointments()
}

function changeMonth(month: string) {
  if (month === visibleMonth.value) return
  visibleMonth.value = month
  void loadAppointments()
}

function applyFilters() {
  page.value = 1
  void loadAppointments()
}

function changePage(nextPage: number) {
  if (nextPage < 1 || nextPage > totalPages.value) return
  page.value = nextPage
  void loadAppointments()
}

onMounted(() => void loadAppointments())
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
          <p class="text-xs font-bold uppercase tracking-[0.16em] text-brand-primary">
            Agendamentos
          </p>
          <h1 class="mt-3 text-3xl font-bold tracking-tight text-content sm:text-4xl">
            Meus agendamentos
          </h1>
          <p class="mt-4 max-w-2xl text-base leading-7 text-content-muted">
            Acompanhe seus próximos atendimentos e consulte o histórico em
            {{ INSTITUTION_TIME_ZONE_LABEL }}.
          </p>
        </div>
        <RouterLink
          class="inline-flex h-13 items-center justify-center gap-3 rounded-xl bg-brand-primary px-5 text-sm font-bold text-on-primary shadow-lg shadow-brand-primary/20 hover:bg-brand-primary-hover"
          :to="{ name: 'appointments-new' }"
        >
          <Icon class="h-5 w-5" :icon="userPlusIcon" aria-hidden="true" />
          Novo agendamento
        </RouterLink>
      </header>

      <section class="mt-8 rounded-3xl border border-outline bg-surface p-6 sm:p-8">
        <div class="flex items-center gap-3">
          <span
            class="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-brand-primary-soft text-brand-primary"
          >
            <Icon class="h-5 w-5" :icon="calendarCheckIcon" aria-hidden="true" />
          </span>
          <div>
            <p class="text-xs font-bold uppercase tracking-[0.14em] text-brand-primary">
              Próximo compromisso
            </p>
            <h2 class="text-xl font-bold text-content">
              {{ nextAppointment ? nextAppointment.subject : 'Nenhum atendimento futuro' }}
            </h2>
          </div>
        </div>

        <div
          v-if="nextAppointment"
          class="mt-6 grid gap-4 rounded-2xl border border-outline bg-surface-subtle p-5 md:grid-cols-[1.4fr_1fr_auto] md:items-center"
          data-testid="next-appointment"
        >
          <div>
            <p class="font-bold capitalize text-content">
              {{ formatDate(nextAppointment.startsAt) }}
            </p>
            <p class="mt-1 text-sm text-content-muted">
              {{ formatTime(nextAppointment.startsAt) }}–{{ formatTime(nextAppointment.endsAt) }} ·
              {{ modalityLabel(nextAppointment.modality) }}
            </p>
          </div>
          <div>
            <p class="text-xs font-bold uppercase tracking-[0.1em] text-content-muted">Professor</p>
            <p class="mt-1 font-bold text-content">{{ nextAppointment.professor.name }}</p>
          </div>
          <AppButton variant="secondary" @click="openDetails(nextAppointment)"
            >Ver detalhes</AppButton
          >
        </div>
        <p v-else-if="!loading" class="mt-5 text-sm leading-6 text-content-muted">
          Quando um novo atendimento for confirmado, ele aparecerá em destaque aqui.
        </p>
      </section>

      <section class="mt-8 overflow-hidden rounded-3xl border border-outline bg-surface">
        <div class="border-b border-outline p-4 sm:p-5">
          <div class="grid gap-2 rounded-2xl bg-surface-subtle p-1 sm:grid-cols-3" role="tablist">
            <button
              v-for="tab in tabs"
              :key="tab.id"
              class="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold transition"
              :class="
                activeView === tab.id
                  ? 'bg-surface text-brand-primary shadow-sm'
                  : 'text-content-muted hover:text-content'
              "
              type="button"
              role="tab"
              :aria-selected="activeView === tab.id"
              @click="changeView(tab.id)"
            >
              <Icon class="h-4 w-4" :icon="tab.icon" aria-hidden="true" />
              {{ tab.label }}
            </button>
          </div>
        </div>

        <form
          v-if="activeView === 'history'"
          class="grid gap-4 border-b border-outline p-5 sm:grid-cols-[1fr_1fr_auto] sm:items-end sm:px-7"
          @submit.prevent="applyFilters"
        >
          <AppSelect
            v-model="statusFilter"
            label="Situação"
            name="appointmentStatus"
            :options="historyStatusOptions"
          />
          <AppSelect
            v-model="modalityFilter"
            label="Modalidade"
            name="appointmentModality"
            :options="modalityOptions"
          />
          <AppButton type="submit" :loading="loading" loading-label="Filtrando..."
            >Aplicar filtros</AppButton
          >
        </form>

        <div v-if="loadError" class="p-10 text-center" role="alert">
          <Icon
            class="mx-auto h-9 w-9 text-status-danger"
            :icon="triangleAlertIcon"
            aria-hidden="true"
          />
          <h2 class="mt-4 text-xl font-bold text-content">Não foi possível carregar</h2>
          <p class="mt-2 text-sm text-content-muted">{{ loadError }}</p>
          <AppButton class="mt-5" variant="secondary" @click="loadAppointments"
            >Tentar novamente</AppButton
          >
        </div>

        <div
          v-else-if="activeView === 'calendar'"
          class="grid gap-6 p-5 sm:p-7 xl:grid-cols-[minmax(0,1fr)_24rem]"
        >
          <section class="h-fit self-start overflow-hidden rounded-2xl border border-outline">
            <div class="border-b border-outline px-5 py-4 sm:px-6">
              <p class="text-xs font-bold uppercase tracking-[0.14em] text-brand-primary">
                Agenda mensal
              </p>
              <div class="mt-1 flex items-center justify-between gap-4">
                <h2 class="text-lg font-bold text-content">Escolha uma data</h2>
                <span class="text-sm font-semibold text-content-muted">
                  {{ loading ? '—' : appointments.length }} agendamento(s)
                </span>
              </div>
            </div>

            <AppCalendar
              :events="calendarEvents"
              :initial-date="selectedDate"
              :show-selected-agenda="false"
              :today="today"
              @select-date="selectCalendarDate"
              @select-event="handleCalendarEvent"
              @visible-month-change="changeMonth"
            />
          </section>

          <aside
            class="h-fit rounded-2xl border border-outline bg-surface-subtle p-5 xl:sticky xl:top-6"
            data-testid="calendar-day-summary"
          >
            <p class="text-xs font-bold uppercase tracking-[0.14em] text-brand-primary">
              Dia selecionado
            </p>
            <h2 class="mt-1 text-xl font-bold capitalize text-content">
              {{ selectedDateLabel }}
            </h2>

            <div class="mt-6 flex items-center justify-between gap-3">
              <div class="flex items-center gap-3">
                <span
                  class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-primary-soft text-brand-primary"
                  aria-hidden="true"
                >
                  <Icon class="h-5 w-5" :icon="calendarCheckIcon" />
                </span>
                <h3 class="font-bold text-content">Agendamentos</h3>
              </div>
              <span
                class="rounded-full bg-brand-secondary-soft px-3 py-1 text-xs font-bold text-brand-secondary"
              >
                {{ selectedDateAppointments.length }}
              </span>
            </div>

            <div
              v-if="!selectedDateAppointments.length"
              class="mt-4 rounded-2xl border border-dashed border-outline bg-surface p-5 text-center"
              role="status"
            >
              <Icon
                class="mx-auto h-7 w-7 text-content-muted"
                :icon="clockIcon"
                aria-hidden="true"
              />
              <p class="mt-3 font-semibold text-content">Nenhum agendamento nesta data</p>
              <p class="mt-1 text-sm leading-6 text-content-muted">
                Selecione outro dia no calendário para consultar seus compromissos.
              </p>
            </div>

            <ul v-else class="mt-4 space-y-3" aria-label="Agendamentos do dia selecionado">
              <li
                v-for="appointment in selectedDateAppointments"
                :key="appointment.id"
                class="rounded-2xl border border-outline bg-surface p-4"
              >
                <div class="flex items-start justify-between gap-3">
                  <div>
                    <p class="flex items-center gap-2 font-bold text-content">
                      <Icon
                        class="h-4 w-4 text-brand-primary"
                        :icon="clockIcon"
                        aria-hidden="true"
                      />
                      {{ formatTime(appointment.startsAt) }}–{{ formatTime(appointment.endsAt) }}
                    </p>
                    <p class="mt-2 text-sm font-semibold text-content">
                      {{ appointment.subject }}
                    </p>
                  </div>
                  <span
                    class="shrink-0 rounded-full px-2.5 py-1 text-[0.68rem] font-bold"
                    :class="statusClasses[appointment.status]"
                  >
                    {{ statusLabels[appointment.status] }}
                  </span>
                </div>
                <p class="mt-3 text-xs leading-5 text-content-muted">
                  {{ appointment.professor.name }} · {{ modalityLabel(appointment.modality) }}
                </p>
                <AppButton class="mt-3" variant="ghost" @click="openDetails(appointment)">
                  Ver detalhes
                </AppButton>
              </li>
            </ul>
          </aside>
        </div>

        <div v-else class="p-5 sm:p-7">
          <div
            v-if="!loading && !appointments.length"
            class="rounded-2xl border border-dashed border-outline bg-surface-subtle p-10 text-center"
          >
            <Icon class="mx-auto h-9 w-9 text-content-muted" :icon="infoIcon" aria-hidden="true" />
            <h2 class="mt-4 text-lg font-bold text-content">Nenhum agendamento encontrado</h2>
            <p class="mt-2 text-sm text-content-muted">
              {{
                activeView === 'upcoming'
                  ? 'Você não possui compromissos futuros.'
                  : 'Não há registros para os filtros selecionados.'
              }}
            </p>
          </div>

          <ul v-else class="grid gap-4 lg:grid-cols-2" aria-live="polite">
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
                  <h2 class="mt-1 text-lg font-bold text-content">{{ appointment.subject }}</h2>
                </div>
                <span
                  class="rounded-full px-3 py-1 text-xs font-bold"
                  :class="statusClasses[appointment.status]"
                >
                  {{ statusLabels[appointment.status] }}
                </span>
              </div>
              <dl class="mt-5 grid gap-3 text-sm text-content-muted sm:grid-cols-2">
                <div>
                  <dt class="font-bold text-content">Data</dt>
                  <dd class="mt-1 capitalize">{{ formatDate(appointment.startsAt) }}</dd>
                </div>
                <div>
                  <dt class="font-bold text-content">Horário</dt>
                  <dd class="mt-1">
                    {{ formatTime(appointment.startsAt) }}–{{ formatTime(appointment.endsAt) }}
                  </dd>
                </div>
                <div>
                  <dt class="font-bold text-content">Professor</dt>
                  <dd class="mt-1">{{ appointment.professor.name }}</dd>
                </div>
                <div>
                  <dt class="font-bold text-content">Modalidade</dt>
                  <dd class="mt-1">{{ modalityLabel(appointment.modality) }}</dd>
                </div>
              </dl>
              <AppButton class="mt-5" variant="ghost" @click="openDetails(appointment)"
                >Ver detalhes</AppButton
              >
            </li>
          </ul>

          <nav
            v-if="totalPages > 1"
            class="mt-7 flex items-center justify-between gap-4"
            aria-label="Paginação dos agendamentos"
          >
            <AppButton variant="ghost" :disabled="page === 1" @click="changePage(page - 1)"
              >Anterior</AppButton
            >
            <p class="text-sm font-bold text-content-muted">
              Página {{ page }} de {{ totalPages }}
            </p>
            <AppButton variant="ghost" :disabled="page === totalPages" @click="changePage(page + 1)"
              >Próxima</AppButton
            >
          </nav>
        </div>
      </section>
    </div>

    <AppModal
      v-model:open="detailsOpen"
      title="Detalhes do agendamento"
      description="Confira os dados registrados para este atendimento."
      size="md"
    >
      <dl v-if="selectedAppointment" class="grid gap-5 sm:grid-cols-2">
        <div>
          <dt class="text-xs font-bold uppercase tracking-[0.1em] text-content-muted">Protocolo</dt>
          <dd class="mt-1 font-bold text-content">{{ selectedAppointment.protocol }}</dd>
        </div>
        <div>
          <dt class="text-xs font-bold uppercase tracking-[0.1em] text-content-muted">Situação</dt>
          <dd class="mt-1">
            <span
              class="rounded-full px-3 py-1 text-xs font-bold"
              :class="statusClasses[selectedAppointment.status]"
              >{{ statusLabels[selectedAppointment.status] }}</span
            >
          </dd>
        </div>
        <div class="sm:col-span-2">
          <dt class="text-xs font-bold uppercase tracking-[0.1em] text-content-muted">Assunto</dt>
          <dd class="mt-1 font-bold text-content">{{ selectedAppointment.subject }}</dd>
        </div>
        <div>
          <dt class="text-xs font-bold uppercase tracking-[0.1em] text-content-muted">
            Data e horário
          </dt>
          <dd class="mt-1 text-content">
            {{ formatDate(selectedAppointment.startsAt) }},
            {{ formatTime(selectedAppointment.startsAt) }}–{{
              formatTime(selectedAppointment.endsAt)
            }}
          </dd>
        </div>
        <div>
          <dt class="text-xs font-bold uppercase tracking-[0.1em] text-content-muted">Professor</dt>
          <dd class="mt-1 text-content">{{ selectedAppointment.professor.name }}</dd>
        </div>
        <div>
          <dt class="text-xs font-bold uppercase tracking-[0.1em] text-content-muted">
            Modalidade
          </dt>
          <dd class="mt-1 text-content">{{ modalityLabel(selectedAppointment.modality) }}</dd>
        </div>
        <div v-if="selectedAppointment.cancellationReason" class="sm:col-span-2">
          <dt class="text-xs font-bold uppercase tracking-[0.1em] text-content-muted">
            Motivo do cancelamento
          </dt>
          <dd class="mt-1 text-content">{{ selectedAppointment.cancellationReason }}</dd>
        </div>
        <div class="sm:col-span-2">
          <dt class="text-xs font-bold uppercase tracking-[0.1em] text-content-muted">
            Detalhes informados
          </dt>
          <dd class="mt-1 whitespace-pre-wrap text-content">
            {{ selectedAppointment.details || 'Nenhum detalhe adicional informado.' }}
          </dd>
        </div>
      </dl>
      <template #footer>
        <AppButton variant="secondary" @click="detailsOpen = false">Fechar</AppButton>
      </template>
    </AppModal>
  </section>
</template>
