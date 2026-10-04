<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { ErrorMessage, Field, FieldArray, type FormActions, type GenericObject } from 'vee-validate'
import { computed, onMounted, ref } from 'vue'

import AppButton from '@/components/basic/AppButton.vue'
import AppCalendar from '@/components/basic/AppCalendar.vue'
import AppForm from '@/components/basic/AppForm.vue'
import AppInput from '@/components/basic/AppInput.vue'
import AppModal from '@/components/basic/AppModal.vue'
import {
  getInstitutionDateTime,
  INSTITUTION_TIME_ZONE,
  INSTITUTION_TIME_ZONE_LABEL,
} from '@/config/date-time'
import { useDocumentTitle } from '@/composables/useDocumentTitle'
import {
  calendarCheckIcon,
  chevronLeftIcon,
  chevronRightIcon,
  circleCheckIcon,
  clockIcon,
  trash2Icon,
  triangleAlertIcon,
} from '@/icons'
import { ApiError } from '@/services/api'
import { createAvailabilities, listOwnAvailabilities } from '@/services/availability'
import { pinia } from '@/stores'
import { useLoadingStore } from '@/stores/loading'
import type { AppCalendarEvent } from '@/types/calendar'
import type {
  AvailabilityDraft,
  AvailabilityItem,
  AvailabilityModality,
  AvailabilitySummary,
} from '@/types/availability'
import {
  createAvailabilityValidationSchema,
  createWeeklyAvailabilityValidationSchema,
  type AvailabilityFormValues,
  type WeeklyAvailabilityFormValues,
} from '@/validations/availability.schema'

useDocumentTitle('Minha agenda | Sistema de Agendamento')

const loadingStore = useLoadingStore(pinia)
const isModalOpen = ref(false)
const creationMode = ref<'specific' | 'weekly'>('specific')
const drafts = ref<AvailabilityDraft[]>([])
const draftError = ref('')
const availabilities = ref<AvailabilityItem[]>([])
const summary = ref<AvailabilitySummary>({ available: 0, blocked: 0, reserved: 0 })
const loadingAvailabilities = ref(true)
const publishing = ref(false)
const loadError = ref('')
let nextDraftId = 1

const currentInstitutionDate = getInstitutionDateTime().date
const validationSchema = createAvailabilityValidationSchema()
const weeklyValidationSchema = createWeeklyAvailabilityValidationSchema()
const initialValues: AvailabilityFormValues = {
  date: '',
  endTime: '',
  modalities: [],
  startTime: '',
}
const weeklyInitialValues: WeeklyAvailabilityFormValues = {
  modalities: [],
  weekdays: [],
  windows: [{ endTime: '', startTime: '' }],
}
const modalityOptions = [
  { label: 'Presencial', value: 'presencial' as const },
  { label: 'Online', value: 'online' as const },
]
const weekdayOptions = [
  { label: 'Seg', value: 1 },
  { label: 'Ter', value: 2 },
  { label: 'Qua', value: 3 },
  { label: 'Qui', value: 4 },
  { label: 'Sex', value: 5 },
  { label: 'Sáb', value: 6 },
  { label: 'Dom', value: 7 },
]
const MAX_BATCH_SIZE = 500
const weekStart = ref(getInitialWeekStart())

function addUtcDays(value: string, amount: number): string {
  const date = new Date(`${value}T00:00:00.000Z`)
  date.setUTCDate(date.getUTCDate() + amount)
  return date.toISOString().slice(0, 10)
}

function getInitialWeekStart(): string {
  const current = getInstitutionDateTime().date
  const date = new Date(`${current}T00:00:00.000Z`)
  const weekday = date.getUTCDay() === 0 ? 7 : date.getUTCDay()
  const daysUntilMonday = (8 - weekday) % 7
  return addUtcDays(current, daysUntilMonday)
}

const calendarWeekdays = computed(() =>
  weekdayOptions.map((weekday) => {
    const date = addUtcDays(weekStart.value, weekday.value - 1)
    return {
      ...weekday,
      date,
      dateLabel: new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        timeZone: 'UTC',
      }).format(new Date(`${date}T12:00:00.000Z`)),
      isPast: date < getInstitutionDateTime().date,
    }
  }),
)
const weekLabel = computed(() => {
  const start = new Date(`${weekStart.value}T12:00:00.000Z`)
  const end = new Date(`${addUtcDays(weekStart.value, 6)}T12:00:00.000Z`)
  const format = (value: Date) =>
    new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: 'long',
      timeZone: 'UTC',
    }).format(value)

  return `${format(start)} a ${format(end)}`
})
const canGoToPreviousWeek = computed(
  () => addUtcDays(weekStart.value, -1) >= getInstitutionDateTime().date,
)

const draftCountLabel = computed(() => {
  const count = drafts.value.length
  return `${count} ${count === 1 ? 'horário preparado' : 'horários preparados'}`
})

const calendarEvents = computed<AppCalendarEvent[]>(() =>
  availabilities.value.map((availability) => {
    const startsAt = getInstitutionDateTime(new Date(availability.startsAt))
    const endsAt = getInstitutionDateTime(new Date(availability.endsAt))
    const isBlocked = availability.state === 'bloqueada'

    return {
      date: startsAt.date,
      description: formatModalities(availability.modalities),
      id: availability.id,
      statusLabel: isBlocked ? 'Bloqueada' : 'Disponível',
      title: `${startsAt.time}–${endsAt.time}`,
      tone: isBlocked ? 'warning' : 'success',
    }
  }),
)

const calendarInitialDate = computed(
  () =>
    [...calendarEvents.value].sort((first, second) => first.date.localeCompare(second.date))[0]
      ?.date ?? currentInstitutionDate,
)

const statusCards = computed(() => [
  {
    description: 'Horários publicados e ainda livres.',
    icon: circleCheckIcon,
    label: 'Disponíveis',
    tone: 'bg-status-success-soft text-status-success',
    value: summary.value.available,
  },
  {
    description: 'Horários que já possuem atendimento.',
    icon: calendarCheckIcon,
    label: 'Reservados',
    tone: 'bg-brand-secondary-soft text-brand-secondary',
    value: summary.value.reserved,
  },
  {
    description: 'Períodos retirados temporariamente da agenda.',
    icon: triangleAlertIcon,
    label: 'Bloqueados',
    tone: 'bg-status-warning-soft text-status-warning',
    value: summary.value.blocked,
  },
])

function normalizeModalities(value: unknown): AvailabilityModality[] {
  if (!Array.isArray(value)) return []

  return value.filter(
    (modality): modality is AvailabilityModality =>
      modality === 'online' || modality === 'presencial',
  )
}

function hasOverlap(candidate: Pick<AvailabilityDraft, 'date' | 'endTime' | 'startTime'>) {
  return drafts.value.some(
    (draft) =>
      draft.date === candidate.date &&
      candidate.startTime < draft.endTime &&
      candidate.endTime > draft.startTime,
  )
}

function appendDrafts(candidates: Array<Omit<AvailabilityDraft, 'id'>>): boolean {
  if (drafts.value.length + candidates.length > MAX_BATCH_SIZE) {
    draftError.value = `O lote pode possuir no máximo ${MAX_BATCH_SIZE} disponibilidades.`
    return false
  }

  const prepared = [...drafts.value, ...candidates]
    .map((draft) => ({ ...draft }))
    .sort((first, second) =>
      `${first.date}-${first.startTime}`.localeCompare(`${second.date}-${second.startTime}`),
    )

  for (let index = 1; index < prepared.length; index += 1) {
    const previous = prepared[index - 1]
    const current = prepared[index]

    if (
      previous &&
      current &&
      previous.date === current.date &&
      current.startTime < previous.endTime
    ) {
      draftError.value = 'Um ou mais períodos conflitam com horários já preparados.'
      return false
    }
  }

  draftError.value = ''
  drafts.value.push(
    ...candidates.map((candidate) => ({
      ...candidate,
      id: `availability-draft-${nextDraftId++}`,
    })),
  )
  drafts.value.sort((first, second) =>
    `${first.date}-${first.startTime}`.localeCompare(`${second.date}-${second.startTime}`),
  )
  return true
}

function addDraft(values: GenericObject, actions: FormActions<GenericObject>) {
  const candidate = {
    date: String(values.date),
    endTime: String(values.endTime),
    modalities: normalizeModalities(values.modalities),
    startTime: String(values.startTime),
  }

  if (hasOverlap(candidate)) {
    draftError.value = 'Esse período conflita com outro horário preparado para a mesma data.'
    return
  }

  if (!appendDrafts([candidate])) return

  actions.resetForm({
    values: {
      date: candidate.date,
      endTime: '',
      modalities: candidate.modalities,
      startTime: '',
    },
  })
}

function normalizeWeekdays(value: unknown): number[] {
  if (!Array.isArray(value)) return []
  return value.filter(
    (weekday): weekday is number => Number.isInteger(weekday) && weekday >= 1 && weekday <= 7,
  )
}

function generateWeeklyDrafts(values: GenericObject, actions: FormActions<GenericObject>) {
  const modalities = normalizeModalities(values.modalities)
  const weekdays = new Set(normalizeWeekdays(values.weekdays))
  const windows = Array.isArray(values.windows)
    ? values.windows.map((window) => ({
        endTime: String((window as GenericObject).endTime),
        startTime: String((window as GenericObject).startTime),
      }))
    : []
  const candidates: Array<Omit<AvailabilityDraft, 'id'>> = []
  const now = getInstitutionDateTime()

  for (const weekday of weekdays) {
    const date = addUtcDays(weekStart.value, weekday - 1)

    for (const window of windows) {
      if (date < now.date || (date === now.date && window.startTime <= now.time)) {
        draftError.value = 'Uma das janelas geradas começaria em um horário que já passou.'
        return
      }

      candidates.push({ date, modalities, ...window })
      if (drafts.value.length + candidates.length > MAX_BATCH_SIZE) {
        draftError.value = `As janelas preparadas ultrapassam o limite de ${MAX_BATCH_SIZE} disponibilidades.`
        return
      }
    }
  }

  if (candidates.length === 0) {
    draftError.value = 'Nenhum dia válido foi selecionado nesta semana.'
    return
  }
  if (!appendDrafts(candidates)) return

  actions.resetForm({
    values: {
      modalities,
      weekdays: [...weekdays],
      windows: [{ endTime: '', startTime: '' }],
    },
  })
}

function changeWeek(amount: -1 | 1) {
  if (amount === -1 && !canGoToPreviousWeek.value) return
  weekStart.value = addUtcDays(weekStart.value, amount * 7)
  draftError.value = ''
}

function selectCreationMode(mode: 'specific' | 'weekly') {
  creationMode.value = mode
  draftError.value = ''
}

function removeDraft(id: string) {
  drafts.value = drafts.value.filter((draft) => draft.id !== id)
  draftError.value = ''
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'long',
    timeZone: 'UTC',
    weekday: 'long',
    year: 'numeric',
  }).format(new Date(`${value}T12:00:00.000Z`))
}

function formatModalities(modalities: AvailabilityModality[]) {
  if (modalities.length === 2) return 'Presencial e online'
  return modalities[0] === 'online' ? 'Online' : 'Presencial'
}

async function loadAvailabilities() {
  const loadingId = loadingStore.start({ description: 'Carregando sua agenda...' })
  loadingAvailabilities.value = true
  loadError.value = ''

  try {
    const response = await listOwnAvailabilities()
    availabilities.value = response.availabilities
    summary.value = response.summary
  } catch (error) {
    loadError.value =
      error instanceof ApiError
        ? error.message
        : 'Não foi possível carregar sua agenda. Tente novamente.'
  } finally {
    loadingAvailabilities.value = false
    loadingStore.stop(loadingId)
  }
}

async function publishDrafts() {
  if (drafts.value.length === 0 || publishing.value) return

  const loadingId = loadingStore.start({ description: 'Publicando disponibilidades...' })
  publishing.value = true
  draftError.value = ''

  try {
    await createAvailabilities({
      items: drafts.value.map(({ date, endTime, modalities, startTime }) => ({
        date,
        endTime,
        modalities,
        startTime,
      })),
    })
    drafts.value = []
    isModalOpen.value = false
    await loadAvailabilities()
  } catch (error) {
    draftError.value =
      error instanceof ApiError
        ? error.message
        : 'Não foi possível publicar os horários. Tente novamente.'
  } finally {
    publishing.value = false
    loadingStore.stop(loadingId)
  }
}

onMounted(() => void loadAvailabilities())
</script>

<template>
  <section class="relative isolate min-h-full overflow-hidden">
    <div
      class="institutional-glow pointer-events-none absolute inset-x-0 top-0 -z-10 h-80"
      aria-hidden="true"
    ></div>

    <div class="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
      <header class="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div class="max-w-3xl">
          <div class="flex flex-wrap items-center gap-2">
            <p class="text-xs font-bold uppercase tracking-[0.16em] text-brand-primary">
              Professor
            </p>
            <span
              class="rounded-full border border-outline bg-surface px-2.5 py-1 text-[0.68rem] font-bold uppercase tracking-[0.1em] text-content-muted"
            >
              Agenda própria
            </span>
          </div>
          <h1 class="mt-3 text-3xl font-bold tracking-tight text-content sm:text-4xl">
            Minha agenda
          </h1>
          <p class="mt-4 max-w-2xl text-base leading-7 text-content-muted">
            Organize os horários que poderão ser disponibilizados para atendimento dos alunos.
          </p>
        </div>

        <div class="flex flex-col items-start gap-2 lg:items-end">
          <span v-if="drafts.length" class="text-xs font-semibold text-content-muted">
            {{ draftCountLabel }}
          </span>
          <AppButton data-testid="open-availability-modal" @click="isModalOpen = true">
            Adicionar horários
            <template #icon>
              <Icon class="h-5 w-5" :icon="clockIcon" aria-hidden="true" />
            </template>
          </AppButton>
        </div>
      </header>

      <section class="mt-8 grid gap-4 md:grid-cols-3" aria-label="Resumo da agenda">
        <article
          v-for="card in statusCards"
          :key="card.label"
          class="rounded-2xl border border-outline bg-surface p-5"
        >
          <div class="flex items-start justify-between gap-4">
            <span
              class="inline-flex h-11 w-11 items-center justify-center rounded-xl"
              :class="card.tone"
            >
              <Icon class="h-5 w-5" :icon="card.icon" aria-hidden="true" />
            </span>
            <span
              class="text-2xl font-extrabold text-content"
              :aria-label="loadingAvailabilities ? 'Carregando' : `${card.value} ${card.label}`"
            >
              {{ loadingAvailabilities ? '—' : card.value }}
            </span>
          </div>
          <h2 class="mt-4 font-bold text-content">{{ card.label }}</h2>
          <p class="mt-2 text-sm leading-6 text-content-muted">{{ card.description }}</p>
        </article>
      </section>

      <section
        class="mt-8 overflow-hidden rounded-3xl border border-outline bg-surface"
        aria-labelledby="availability-empty-title"
      >
        <div class="border-b border-outline px-6 py-5 sm:px-8">
          <p class="text-xs font-bold uppercase tracking-[0.14em] text-brand-primary">
            Disponibilidades
          </p>
          <h2 id="availability-empty-title" class="mt-1 text-xl font-bold text-content">
            Horários publicados
          </h2>
        </div>

        <div
          v-if="loadError"
          class="flex min-h-80 flex-col items-center justify-center px-6 py-12 text-center"
          role="alert"
        >
          <span
            class="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-status-danger-soft text-status-danger"
            aria-hidden="true"
          >
            <Icon class="h-8 w-8" :icon="triangleAlertIcon" />
          </span>
          <h3 class="mt-6 text-xl font-bold text-content">Não foi possível carregar a agenda</h3>
          <p class="mt-3 max-w-lg text-sm leading-6 text-content-muted">{{ loadError }}</p>
          <AppButton class="mt-6" variant="secondary" @click="loadAvailabilities">
            Tentar novamente
          </AppButton>
        </div>

        <div
          v-else-if="!loadingAvailabilities && !availabilities.length"
          class="flex min-h-80 flex-col items-center justify-center px-6 py-12 text-center"
        >
          <span
            class="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-primary-soft text-brand-primary"
            aria-hidden="true"
          >
            <Icon class="h-8 w-8" :icon="calendarCheckIcon" />
          </span>
          <h3 class="mt-6 text-xl font-bold text-content">Nenhum horário publicado ainda</h3>
          <p class="mt-3 max-w-lg text-sm leading-6 text-content-muted">
            Prepare datas, horários e modalidades para liberar novos períodos de atendimento.
          </p>
        </div>

        <AppCalendar
          v-else-if="availabilities.length"
          :events="calendarEvents"
          :initial-date="calendarInitialDate"
          :today="currentInstitutionDate"
        />
      </section>
    </div>

    <AppModal
      v-model:open="isModalOpen"
      :close-disabled="publishing"
      title="Adicionar disponibilidades"
      :description="`Monte os horários antes de publicá-los. Todos os campos seguem ${INSTITUTION_TIME_ZONE_LABEL} (${INSTITUTION_TIME_ZONE}).`"
      size="xl"
    >
      <div
        class="mb-6 grid gap-2 rounded-2xl border border-outline bg-surface-subtle p-1.5 sm:grid-cols-2"
        role="tablist"
        aria-label="Modo de criação de disponibilidades"
      >
        <button
          class="rounded-xl px-4 py-3 text-sm font-bold transition-colors"
          :class="
            creationMode === 'specific'
              ? 'bg-surface text-brand-primary shadow-sm'
              : 'text-content-muted hover:text-content'
          "
          type="button"
          role="tab"
          :aria-selected="creationMode === 'specific'"
          @click="selectCreationMode('specific')"
        >
          Data específica
        </button>
        <button
          class="rounded-xl px-4 py-3 text-sm font-bold transition-colors"
          :class="
            creationMode === 'weekly'
              ? 'bg-surface text-brand-primary shadow-sm'
              : 'text-content-muted hover:text-content'
          "
          type="button"
          role="tab"
          :aria-selected="creationMode === 'weekly'"
          @click="selectCreationMode('weekly')"
        >
          Dias da semana
        </button>
      </div>

      <div class="grid gap-7 lg:grid-cols-[minmax(0,1fr)_minmax(19rem,0.8fr)]">
        <AppForm
          v-if="creationMode === 'specific'"
          id="availability-draft-form"
          :initial-values="initialValues"
          :validation-schema="validationSchema"
          class="space-y-6"
          @submit="addDraft"
        >
          <div>
            <p class="text-xs font-bold uppercase tracking-[0.14em] text-brand-primary">
              Novo horário
            </p>
            <h3 class="mt-1 text-lg font-bold text-content">Defina o período</h3>
          </div>

          <AppInput
            name="date"
            label="Data"
            type="date"
            :min="currentInstitutionDate"
            required
            data-modal-autofocus
          />

          <div class="grid gap-5 sm:grid-cols-2">
            <AppInput name="startTime" label="Início" type="time" required />
            <AppInput name="endTime" label="Término" type="time" required />
          </div>

          <fieldset>
            <legend class="text-sm font-semibold text-content">
              Modalidade <span class="text-status-danger" aria-hidden="true">*</span>
            </legend>
            <p class="mt-1 text-xs leading-5 text-content-muted">
              Selecione uma ou as duas opções. Sala e link não são solicitados nesta etapa.
            </p>

            <div class="mt-3 grid gap-3 sm:grid-cols-2">
              <Field
                v-for="option in modalityOptions"
                :key="option.value"
                v-slot="{ field }"
                name="modalities"
                type="checkbox"
                :value="option.value"
              >
                <label
                  class="flex cursor-pointer items-center gap-3 rounded-xl border border-outline bg-surface px-4 py-3 text-sm font-semibold text-content hover:border-brand-primary"
                >
                  <input
                    v-bind="field"
                    class="h-4 w-4 accent-brand-primary"
                    type="checkbox"
                    :value="option.value"
                  />
                  {{ option.label }}
                </label>
              </Field>
            </div>
            <ErrorMessage
              name="modalities"
              as="p"
              class="mt-2 text-sm font-medium text-status-danger"
              role="alert"
            />
          </fieldset>

          <p v-if="draftError" class="text-sm font-medium text-status-danger" role="alert">
            {{ draftError }}
          </p>

          <AppButton type="submit" variant="secondary">Adicionar à lista</AppButton>
        </AppForm>

        <AppForm
          v-else
          v-slot="{ values }"
          id="weekly-availability-form"
          :initial-values="weeklyInitialValues"
          :validation-schema="weeklyValidationSchema"
          class="space-y-6"
          @submit="generateWeeklyDrafts"
        >
          <div>
            <p class="text-xs font-bold uppercase tracking-[0.14em] text-brand-primary">
              Geração semanal
            </p>
            <h3 class="mt-1 text-lg font-bold text-content">Configure a semana</h3>
            <p class="mt-2 text-xs leading-5 text-content-muted">
              Selecione os dias e adicione quantas janelas de atendimento precisar.
            </p>
          </div>

          <section class="rounded-2xl border border-outline bg-surface-subtle px-4 py-3">
            <p class="text-xs font-bold uppercase tracking-[0.12em] text-content-muted">
              Semana selecionada
            </p>
            <div class="mt-2 flex items-center justify-between gap-3">
              <button
                class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-outline bg-surface text-content transition-colors hover:border-brand-primary hover:text-brand-primary disabled:cursor-not-allowed disabled:opacity-40"
                type="button"
                aria-label="Semana anterior"
                :disabled="!canGoToPreviousWeek"
                @click="changeWeek(-1)"
              >
                <Icon class="h-5 w-5" :icon="chevronLeftIcon" aria-hidden="true" />
              </button>
              <div class="min-w-0 text-center">
                <p class="font-bold capitalize text-content">{{ weekLabel }}</p>
                <p class="mt-0.5 text-xs text-content-muted">Use as setas para mudar de semana.</p>
              </div>
              <button
                class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-outline bg-surface text-content transition-colors hover:border-brand-primary hover:text-brand-primary"
                type="button"
                aria-label="Próxima semana"
                @click="changeWeek(1)"
              >
                <Icon class="h-5 w-5" :icon="chevronRightIcon" aria-hidden="true" />
              </button>
            </div>
          </section>

          <fieldset>
            <legend class="text-sm font-semibold text-content">
              Dias da semana <span class="text-status-danger" aria-hidden="true">*</span>
            </legend>
            <div class="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-7">
              <Field
                v-for="option in calendarWeekdays"
                :key="option.value"
                v-slot="{ field }"
                name="weekdays"
                type="checkbox"
                :value="option.value"
              >
                <label
                  class="flex min-h-16 cursor-pointer flex-col items-center justify-center rounded-xl border border-outline bg-surface px-2 py-2 text-xs font-bold text-content transition-colors hover:border-brand-primary"
                  :class="[
                    Array.isArray(values.weekdays) && values.weekdays.includes(option.value)
                      ? 'border-brand-primary bg-brand-primary-soft text-brand-primary ring-1 ring-brand-primary'
                      : undefined,
                    option.isPast ? 'cursor-not-allowed opacity-40' : undefined,
                  ]"
                >
                  <input
                    v-bind="field"
                    class="sr-only"
                    type="checkbox"
                    :value="option.value"
                    :data-date="option.date"
                    :disabled="
                      option.isPast &&
                      !(Array.isArray(values.weekdays) && values.weekdays.includes(option.value))
                    "
                  />
                  <span class="flex items-center gap-1">
                    <Icon
                      v-if="
                        Array.isArray(values.weekdays) && values.weekdays.includes(option.value)
                      "
                      class="h-3.5 w-3.5"
                      :icon="circleCheckIcon"
                      aria-hidden="true"
                    />
                    {{ option.label }}
                  </span>
                  <span
                    class="mt-1 font-medium"
                    :class="
                      Array.isArray(values.weekdays) && values.weekdays.includes(option.value)
                        ? 'text-brand-primary'
                        : 'text-content-muted'
                    "
                  >
                    {{ option.dateLabel }}
                  </span>
                </label>
              </Field>
            </div>
            <ErrorMessage
              name="weekdays"
              as="p"
              class="mt-2 text-sm font-medium text-status-danger"
              role="alert"
            />
          </fieldset>

          <fieldset>
            <legend class="text-sm font-semibold text-content">
              Janelas de atendimento <span class="text-status-danger" aria-hidden="true">*</span>
            </legend>
            <p class="mt-1 text-xs leading-5 text-content-muted">
              Cada janela será criada somente nos dias selecionados acima.
            </p>

            <FieldArray v-slot="{ fields, push, remove }" name="windows">
              <div class="mt-3 space-y-3">
                <section
                  v-for="(window, index) in fields"
                  :key="window.key"
                  class="rounded-2xl border border-outline bg-surface-subtle p-4"
                >
                  <div class="mb-3 flex items-center justify-between gap-3">
                    <p class="text-sm font-bold text-content">Janela {{ index + 1 }}</p>
                    <button
                      v-if="fields.length > 1"
                      class="inline-flex h-8 w-8 items-center justify-center rounded-lg text-content-muted transition-colors hover:bg-status-danger-soft hover:text-status-danger"
                      type="button"
                      :aria-label="`Remover janela ${index + 1}`"
                      @click="remove(index)"
                    >
                      <Icon class="h-4 w-4" :icon="trash2Icon" aria-hidden="true" />
                    </button>
                  </div>

                  <div class="grid gap-4 sm:grid-cols-2">
                    <AppInput
                      :id="`weekly-window-${index}-start`"
                      :name="`windows[${index}].startTime`"
                      label="Início"
                      type="time"
                      required
                    />
                    <AppInput
                      :id="`weekly-window-${index}-end`"
                      :name="`windows[${index}].endTime`"
                      label="Término"
                      type="time"
                      required
                    />
                  </div>
                </section>

                <button
                  class="inline-flex min-h-11 items-center justify-center rounded-xl border border-dashed border-brand-primary px-4 py-2 text-sm font-bold text-brand-primary transition-colors hover:bg-brand-primary-soft"
                  type="button"
                  data-testid="add-weekly-window"
                  @click="push({ endTime: '', startTime: '' })"
                >
                  Adicionar outra janela
                </button>
              </div>
            </FieldArray>
            <ErrorMessage
              name="windows"
              as="p"
              class="mt-2 text-sm font-medium text-status-danger"
              role="alert"
            />
          </fieldset>

          <fieldset>
            <legend class="text-sm font-semibold text-content">
              Modalidade <span class="text-status-danger" aria-hidden="true">*</span>
            </legend>
            <p class="mt-1 text-xs leading-5 text-content-muted">
              A seleção será aplicada a todos os dias e janelas preparados.
            </p>
            <div class="mt-3 grid gap-3 sm:grid-cols-2">
              <Field
                v-for="option in modalityOptions"
                :key="option.value"
                v-slot="{ field }"
                name="modalities"
                type="checkbox"
                :value="option.value"
              >
                <label
                  class="flex cursor-pointer items-center gap-3 rounded-xl border border-outline bg-surface px-4 py-3 text-sm font-semibold text-content hover:border-brand-primary"
                >
                  <input
                    v-bind="field"
                    class="h-4 w-4 accent-brand-primary"
                    type="checkbox"
                    :value="option.value"
                  />
                  {{ option.label }}
                </label>
              </Field>
            </div>
            <ErrorMessage
              name="modalities"
              as="p"
              class="mt-2 text-sm font-medium text-status-danger"
              role="alert"
            />
          </fieldset>

          <p v-if="draftError" class="text-sm font-medium text-status-danger" role="alert">
            {{ draftError }}
          </p>

          <AppButton type="submit" variant="secondary">Adicionar horários à revisão</AppButton>
        </AppForm>

        <section class="rounded-2xl border border-outline bg-surface-subtle p-5" aria-live="polite">
          <div class="flex items-start justify-between gap-4">
            <div>
              <p class="text-xs font-bold uppercase tracking-[0.14em] text-brand-primary">
                Revisão
              </p>
              <h3 class="mt-1 text-lg font-bold text-content">Horários preparados</h3>
            </div>
            <span
              class="inline-flex min-w-8 items-center justify-center rounded-full bg-brand-primary-soft px-2.5 py-1 text-sm font-bold text-brand-primary"
            >
              {{ drafts.length }}
            </span>
          </div>

          <div
            v-if="!drafts.length"
            class="mt-5 rounded-xl border border-dashed border-outline bg-surface px-4 py-6 text-center"
          >
            <p class="text-sm font-semibold text-content">A lista ainda está vazia.</p>
            <p class="mt-1 text-xs leading-5 text-content-muted">
              Escolha os dias e adicione quantas janelas de atendimento precisar.
            </p>
          </div>

          <ul v-else class="mt-5 space-y-3" aria-label="Horários preparados para publicação">
            <li
              v-for="draft in drafts"
              :key="draft.id"
              class="rounded-xl border border-outline bg-surface p-4"
            >
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <p class="font-bold capitalize text-content">{{ formatDate(draft.date) }}</p>
                  <p class="mt-1 text-sm text-content-muted">
                    {{ draft.startTime }}–{{ draft.endTime }} ·
                    {{ formatModalities(draft.modalities) }}
                  </p>
                </div>
                <button
                  class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-content-muted hover:bg-status-danger-soft hover:text-status-danger"
                  type="button"
                  :aria-label="`Remover horário de ${draft.startTime} a ${draft.endTime}`"
                  title="Remover horário"
                  @click="removeDraft(draft.id)"
                >
                  <Icon class="h-4 w-4" :icon="trash2Icon" aria-hidden="true" />
                </button>
              </div>
            </li>
          </ul>
        </section>
      </div>

      <template #footer>
        <AppButton variant="ghost" :disabled="publishing" @click="isModalOpen = false">
          Fechar
        </AppButton>
        <AppButton
          :disabled="!drafts.length"
          :loading="publishing"
          loading-label="Publicando..."
          :title="!drafts.length ? 'Adicione pelo menos um horário antes de publicar.' : undefined"
          @click="publishDrafts"
        >
          Publicar {{ drafts.length || '' }} {{ drafts.length === 1 ? 'horário' : 'horários' }}
        </AppButton>
      </template>
    </AppModal>
  </section>
</template>
