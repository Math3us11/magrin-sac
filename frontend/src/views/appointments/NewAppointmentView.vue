<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { ErrorMessage, Field, type GenericObject } from 'vee-validate'
import { computed, onMounted, ref } from 'vue'

import AppButton from '@/components/basic/AppButton.vue'
import AppCalendar from '@/components/basic/AppCalendar.vue'
import AppForm from '@/components/basic/AppForm.vue'
import AppInput from '@/components/basic/AppInput.vue'
import AppModal from '@/components/basic/AppModal.vue'
import AppTextarea from '@/components/basic/AppTextarea.vue'
import {
  getInstitutionDateTime,
  institutionLocalToUtc,
  INSTITUTION_TIME_ZONE,
  INSTITUTION_TIME_ZONE_LABEL,
} from '@/config/date-time'
import { useDocumentTitle } from '@/composables/useDocumentTitle'
import { calendarCheckIcon, clockIcon, triangleAlertIcon, usersIcon } from '@/icons'
import { ApiError } from '@/services/api'
import { createAppointment } from '@/services/appointments'
import { listStudentAvailabilities } from '@/services/availability'
import { pinia } from '@/stores'
import { useLoadingStore } from '@/stores/loading'
import type { AppCalendarEvent } from '@/types/calendar'
import type { CreatedAppointment } from '@/types/appointment'
import type {
  AvailabilityModality,
  FreeAvailabilityInterval,
  StudentAvailabilityItem,
} from '@/types/availability'
import {
  createAppointmentValidationSchema,
  type AppointmentFormValues,
} from '@/validations/appointment.schema'

type SelectableInterval = {
  availability: StudentAvailabilityItem
  interval: FreeAvailabilityInterval
}

useDocumentTitle('Novo agendamento | Sistema de Agendamento')

const loadingStore = useLoadingStore(pinia)
const currentInstitutionDate = getInstitutionDateTime().date
const visibleMonth = ref(currentInstitutionDate.slice(0, 7))
const selectedDate = ref(currentInstitutionDate)
const selectedModality = ref<AvailabilityModality | ''>('')
const availabilities = ref<StudentAvailabilityItem[]>([])
const selectedInterval = ref<SelectableInterval | null>(null)
const appointmentReview = ref<AppointmentFormValues | null>(null)
const confirmedAppointment = ref<CreatedAppointment | null>(null)
const confirming = ref(false)
const confirmationError = ref('')
const loading = ref(true)
const loadError = ref('')
let requestSequence = 0

const modalityOptions: Array<{ label: string; value: AvailabilityModality | '' }> = [
  { label: 'Todas', value: '' },
  { label: 'Presencial', value: 'presencial' },
  { label: 'Online', value: 'online' },
]

function monthRange(month: string): { from: string; to: string } {
  const first = `${month}-01`
  const date = new Date(`${first}T12:00:00.000Z`)
  date.setUTCMonth(date.getUTCMonth() + 1)
  date.setUTCDate(0)
  return { from: first, to: date.toISOString().slice(0, 10) }
}

function formatModalities(modalities: AvailabilityModality[]): string {
  if (modalities.length === 2) return 'Presencial ou online'
  return modalities[0] === 'online' ? 'Online' : 'Presencial'
}

function formatModality(modality: AvailabilityModality): string {
  return modality === 'online' ? 'Online' : 'Presencial'
}

function intervalId(availabilityId: number, interval: FreeAvailabilityInterval): string {
  return `${availabilityId}-${interval.startsAt}`
}

const calendarEvents = computed<AppCalendarEvent[]>(() =>
  availabilities.value.flatMap((availability) =>
    availability.freeIntervals.map((interval) => {
      const startsAt = getInstitutionDateTime(new Date(interval.startsAt))
      const endsAt = getInstitutionDateTime(new Date(interval.endsAt))

      return {
        date: startsAt.date,
        description: `${availability.professor.name} · ${formatModalities(availability.modalities)}`,
        id: intervalId(availability.id, interval),
        statusLabel: 'Livre',
        title: `${startsAt.time}–${endsAt.time}`,
        tone: 'success' as const,
      }
    }),
  ),
)

const selectedDateLabel = computed(() => {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'long',
    timeZone: 'UTC',
  }).format(new Date(`${selectedDate.value}T12:00:00.000Z`))
})

const selectedDateIntervals = computed(() =>
  availabilities.value
    .flatMap((availability) =>
      availability.freeIntervals.map((interval) => ({ availability, interval })),
    )
    .filter(
      ({ interval }) =>
        getInstitutionDateTime(new Date(interval.startsAt)).date === selectedDate.value,
    )
    .sort((first, second) => first.interval.startsAt.localeCompare(second.interval.startsAt)),
)

const selectedWindow = computed(() => {
  if (!selectedInterval.value) return null
  const startsAt = getInstitutionDateTime(new Date(selectedInterval.value.interval.startsAt))
  const endsAt = getInstitutionDateTime(new Date(selectedInterval.value.interval.endsAt))

  return {
    date: startsAt.date,
    endsAt: endsAt.time,
    modalities: selectedInterval.value.availability.modalities,
    startsAt: startsAt.time,
  }
})

const appointmentInitialValues = computed(() => {
  if (!selectedWindow.value) return undefined

  return {
    details: '',
    endTime: selectedWindow.value.endsAt,
    modality: selectedWindow.value.modalities[0],
    startTime: selectedWindow.value.startsAt,
    subject: '',
  }
})

const appointmentValidationSchema = computed(() =>
  selectedWindow.value ? createAppointmentValidationSchema(selectedWindow.value) : undefined,
)

const appointmentFormKey = computed(() => {
  if (!selectedInterval.value) return 'empty'
  return intervalId(selectedInterval.value.availability.id, selectedInterval.value.interval)
})

const reviewTimeLabel = computed(() => {
  if (!appointmentReview.value) return ''
  return `${appointmentReview.value.startTime}–${appointmentReview.value.endTime}`
})

const confirmedDateLabel = computed(() => {
  if (!confirmedAppointment.value) return ''
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'long',
    timeZone: INSTITUTION_TIME_ZONE,
  }).format(new Date(confirmedAppointment.value.startsAt))
})

const confirmedTimeLabel = computed(() => {
  if (!confirmedAppointment.value) return ''
  const startsAt = getInstitutionDateTime(new Date(confirmedAppointment.value.startsAt))
  const endsAt = getInstitutionDateTime(new Date(confirmedAppointment.value.endsAt))
  return `${startsAt.time}–${endsAt.time}`
})

async function loadAvailabilities(month = visibleMonth.value) {
  const currentRequest = ++requestSequence
  const loadingId = loadingStore.start({ description: 'Buscando horários livres...' })
  loading.value = true
  loadError.value = ''
  selectedInterval.value = null
  appointmentReview.value = null

  try {
    const response = await listStudentAvailabilities({
      ...monthRange(month),
      modality: selectedModality.value || undefined,
    })
    if (currentRequest !== requestSequence) return
    availabilities.value = response.availabilities
  } catch (error) {
    if (currentRequest !== requestSequence) return
    availabilities.value = []
    loadError.value =
      error instanceof ApiError
        ? error.message
        : 'Não foi possível consultar os horários. Tente novamente.'
  } finally {
    if (currentRequest === requestSequence) loading.value = false
    loadingStore.stop(loadingId)
  }
}

function changeMonth(month: string) {
  if (month === visibleMonth.value) return
  visibleMonth.value = month
  void loadAvailabilities(month)
}

function changeModality(modality: AvailabilityModality | '') {
  if (modality === selectedModality.value) return
  selectedModality.value = modality
  void loadAvailabilities()
}

function selectCalendarDate(date: string) {
  selectedDate.value = date
  selectedInterval.value = null
  appointmentReview.value = null
}

function selectInterval(interval: SelectableInterval) {
  selectedInterval.value = interval
  appointmentReview.value = null
}

function formatIntervalTime(interval: FreeAvailabilityInterval): string {
  const startsAt = getInstitutionDateTime(new Date(interval.startsAt))
  const endsAt = getInstitutionDateTime(new Date(interval.endsAt))
  return `${startsAt.time}–${endsAt.time}`
}

function reviewAppointment(values: GenericObject) {
  confirmationError.value = ''
  appointmentReview.value = {
    details: String(values.details ?? '').trim(),
    endTime: String(values.endTime),
    modality: values.modality as AvailabilityModality,
    startTime: String(values.startTime),
    subject: String(values.subject).trim(),
  }
}

function closeReview() {
  if (confirming.value) return
  appointmentReview.value = null
  confirmationError.value = ''
}

async function confirmAppointment() {
  if (!appointmentReview.value || !selectedInterval.value || !selectedWindow.value) return

  confirming.value = true
  confirmationError.value = ''
  const loadingId = loadingStore.start({ description: 'Confirmando seu agendamento...' })

  try {
    const response = await createAppointment({
      availabilityId: selectedInterval.value.availability.id,
      details: appointmentReview.value.details || undefined,
      endsAt: institutionLocalToUtc(
        selectedWindow.value.date,
        appointmentReview.value.endTime,
      ).toISOString(),
      modality: appointmentReview.value.modality,
      startsAt: institutionLocalToUtc(
        selectedWindow.value.date,
        appointmentReview.value.startTime,
      ).toISOString(),
      subject: appointmentReview.value.subject,
    })

    confirmedAppointment.value = response.appointment
    appointmentReview.value = null
    selectedInterval.value = null
    await loadAvailabilities()
  } catch (error) {
    confirmationError.value =
      error instanceof ApiError
        ? error.message
        : 'Não foi possível confirmar o agendamento. Tente novamente.'
  } finally {
    confirming.value = false
    loadingStore.stop(loadingId)
  }
}

function closeConfirmation() {
  confirmedAppointment.value = null
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
      <header class="max-w-3xl">
        <p class="text-xs font-bold uppercase tracking-[0.16em] text-brand-primary">Agendamentos</p>
        <h1 class="mt-3 text-3xl font-bold tracking-tight text-content sm:text-4xl">
          Novo agendamento
        </h1>
        <p class="mt-4 max-w-2xl text-base leading-7 text-content-muted">
          Consulte a agenda dos professores e escolha uma janela livre. Os horários seguem
          {{ INSTITUTION_TIME_ZONE_LABEL }}.
        </p>
      </header>

      <section class="mt-8 rounded-3xl border border-outline bg-surface p-5 sm:p-6">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p class="text-xs font-bold uppercase tracking-[0.14em] text-brand-primary">
              Modalidade
            </p>
            <h2 class="mt-1 text-lg font-bold text-content">Como deseja ser atendido?</h2>
          </div>
          <div class="flex flex-wrap gap-2" role="group" aria-label="Filtrar por modalidade">
            <button
              v-for="option in modalityOptions"
              :key="option.value || 'all'"
              class="min-h-10 rounded-xl border px-4 text-sm font-bold transition-colors"
              :class="
                selectedModality === option.value
                  ? 'border-brand-primary bg-brand-primary-soft text-brand-primary'
                  : 'border-outline bg-surface text-content-muted hover:border-brand-primary hover:text-brand-primary'
              "
              type="button"
              :aria-pressed="selectedModality === option.value"
              @click="changeModality(option.value)"
            >
              {{ option.label }}
            </button>
          </div>
        </div>
      </section>

      <div class="mt-8 grid gap-8 xl:grid-cols-[minmax(0,1fr)_26rem]">
        <section
          class="h-fit self-start overflow-hidden rounded-3xl border border-outline bg-surface"
        >
          <div class="border-b border-outline px-6 py-5 sm:px-8">
            <p class="text-xs font-bold uppercase tracking-[0.14em] text-brand-primary">
              Agenda disponível
            </p>
            <div class="mt-1 flex items-center justify-between gap-4">
              <h2 class="text-xl font-bold text-content">Escolha uma data</h2>
              <span class="text-sm font-semibold text-content-muted">
                {{ loading ? '—' : calendarEvents.length }} janela(s) livre(s)
              </span>
            </div>
          </div>

          <div
            v-if="loadError"
            class="flex min-h-80 flex-col items-center justify-center p-8 text-center"
            role="alert"
          >
            <span
              class="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-status-danger-soft text-status-danger"
            >
              <Icon class="h-7 w-7" :icon="triangleAlertIcon" aria-hidden="true" />
            </span>
            <h3 class="mt-5 text-lg font-bold text-content">Não foi possível carregar a agenda</h3>
            <p class="mt-2 max-w-md text-sm text-content-muted">{{ loadError }}</p>
            <AppButton class="mt-5" variant="secondary" @click="loadAvailabilities()">
              Tentar novamente
            </AppButton>
          </div>

          <AppCalendar
            v-else
            :events="calendarEvents"
            :initial-date="selectedDate"
            :show-selected-agenda="false"
            :today="currentInstitutionDate"
            @select-date="selectCalendarDate"
            @visible-month-change="changeMonth"
          />
        </section>

        <aside class="h-fit rounded-3xl border border-outline bg-surface p-6 xl:sticky xl:top-6">
          <p class="text-xs font-bold uppercase tracking-[0.14em] text-brand-primary">
            Dia selecionado
          </p>
          <h2 class="mt-1 text-xl font-bold capitalize text-content">{{ selectedDateLabel }}</h2>

          <div class="mt-6" data-testid="selected-day-summary">
            <div class="flex items-center justify-between gap-3">
              <div class="flex items-center gap-3">
                <span
                  class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-primary-soft text-brand-primary"
                  aria-hidden="true"
                >
                  <Icon class="h-5 w-5" :icon="calendarCheckIcon" />
                </span>
                <h3 class="font-bold text-content">Horários livres</h3>
              </div>
              <span
                class="rounded-full bg-brand-secondary-soft px-3 py-1 text-xs font-bold text-brand-secondary"
              >
                {{ selectedDateIntervals.length }}
              </span>
            </div>

            <div
              v-if="!selectedDateIntervals.length"
              class="mt-4 rounded-2xl border border-dashed border-outline bg-surface-subtle p-5 text-center"
              data-testid="selected-day-empty"
              role="status"
            >
              <Icon
                class="mx-auto h-7 w-7 text-content-muted"
                :icon="clockIcon"
                aria-hidden="true"
              />
              <p class="mt-3 font-semibold text-content">Nenhum horário livre nesta data</p>
              <p class="mt-1 text-sm leading-6 text-content-muted">
                Escolha outro dia no calendário ou altere o filtro de modalidade.
              </p>
            </div>

            <ul v-else class="mt-4 space-y-3" aria-label="Horários livres do dia selecionado">
              <li
                v-for="item in selectedDateIntervals"
                :key="intervalId(item.availability.id, item.interval)"
              >
                <button
                  class="w-full rounded-2xl border p-4 text-left transition-colors"
                  :class="
                    selectedInterval === item
                      ? 'border-brand-primary bg-brand-primary-soft'
                      : 'border-outline bg-surface-subtle hover:border-brand-primary'
                  "
                  type="button"
                  :aria-pressed="selectedInterval === item"
                  :data-testid="`day-interval-${intervalId(item.availability.id, item.interval)}`"
                  @click="selectInterval(item)"
                >
                  <span class="flex items-start justify-between gap-3">
                    <span>
                      <span class="flex items-center gap-2 font-bold text-content">
                        <Icon
                          class="h-4 w-4 text-brand-primary"
                          :icon="clockIcon"
                          aria-hidden="true"
                        />
                        {{ formatIntervalTime(item.interval) }}
                      </span>
                      <span class="mt-2 flex items-center gap-2 text-sm text-content-muted">
                        <Icon class="h-4 w-4" :icon="usersIcon" aria-hidden="true" />
                        {{ item.availability.professor.name }}
                      </span>
                    </span>
                    <span
                      class="shrink-0 rounded-full bg-status-success-soft px-2.5 py-1 text-[0.68rem] font-bold text-status-success"
                    >
                      Livre
                    </span>
                  </span>
                  <span class="mt-3 block text-xs font-semibold text-content-muted">
                    {{ formatModalities(item.availability.modalities) }}
                  </span>
                </button>
              </li>
            </ul>
          </div>

          <div
            v-if="selectedInterval"
            class="mt-6 border-t border-outline pt-6"
            data-testid="selected-availability"
          >
            <div class="rounded-2xl bg-brand-primary-soft p-4 text-brand-primary">
              <p class="text-xs font-bold uppercase tracking-[0.1em]">Janela escolhida</p>
              <p class="mt-2 font-bold">{{ formatIntervalTime(selectedInterval.interval) }}</p>
              <p class="mt-1 text-sm font-semibold">
                {{ selectedInterval.availability.professor.name }} ·
                {{ formatModalities(selectedInterval.availability.modalities) }}
              </p>
            </div>

            <AppForm
              v-if="appointmentInitialValues && appointmentValidationSchema"
              :key="appointmentFormKey"
              v-slot="{ isSubmitting }"
              class="mt-5 space-y-5"
              data-testid="appointment-form"
              :initial-values="appointmentInitialValues"
              :validation-schema="appointmentValidationSchema"
              @submit="reviewAppointment"
            >
              <div>
                <h3 class="font-bold text-content">Dados do atendimento</h3>
                <p class="mt-1 text-xs leading-5 text-content-muted">
                  Ajuste o horário somente dentro da janela livre selecionada.
                </p>
              </div>

              <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                <AppInput
                  name="startTime"
                  label="Início"
                  type="time"
                  required
                  :min="selectedWindow?.startsAt"
                  :max="selectedWindow?.endsAt"
                />
                <AppInput
                  name="endTime"
                  label="Término"
                  type="time"
                  required
                  :min="selectedWindow?.startsAt"
                  :max="selectedWindow?.endsAt"
                />
              </div>

              <fieldset>
                <legend class="text-sm font-semibold text-content">
                  Modalidade <span class="text-status-danger" aria-hidden="true">*</span>
                </legend>
                <div class="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                  <Field
                    v-for="modality in selectedInterval.availability.modalities"
                    :key="modality"
                    v-slot="{ field }"
                    name="modality"
                    type="radio"
                    :value="modality"
                  >
                    <label
                      class="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-outline bg-surface-subtle px-4 text-sm font-semibold text-content has-[:checked]:border-brand-primary has-[:checked]:bg-brand-primary-soft has-[:checked]:text-brand-primary"
                    >
                      <input
                        v-bind="field"
                        class="h-4 w-4 accent-brand-primary"
                        name="modality"
                        type="radio"
                        :value="modality"
                      />
                      {{ formatModality(modality) }}
                    </label>
                  </Field>
                </div>
                <ErrorMessage
                  name="modality"
                  as="p"
                  class="mt-2 text-sm font-medium text-status-danger"
                />
              </fieldset>

              <AppInput
                name="subject"
                label="Assunto"
                :maxlength="150"
                placeholder="Ex.: orientação sobre estágio"
                required
              />

              <AppTextarea
                name="details"
                label="Informações complementares"
                help-text="Opcional. Inclua apenas informações úteis para preparar o atendimento."
                placeholder="Descreva brevemente sua dúvida ou necessidade."
              />

              <p class="rounded-xl bg-status-info-soft p-4 text-xs leading-5 text-status-info">
                A disponibilidade será validada novamente pelo servidor no momento da confirmação.
              </p>

              <AppButton block type="submit" :loading="isSubmitting">
                Revisar agendamento
              </AppButton>
            </AppForm>
          </div>

          <p
            v-else-if="selectedDateIntervals.length"
            class="mt-5 rounded-xl border border-outline bg-surface-subtle p-4 text-sm leading-6 text-content-muted"
          >
            Escolha um dos horários livres acima para preencher os dados do atendimento.
          </p>
        </aside>
      </div>
    </div>
  </section>

  <AppModal
    :open="Boolean(appointmentReview)"
    :close-disabled="confirming"
    title="Revise seu agendamento"
    description="Confira os dados antes da confirmação definitiva."
    size="sm"
    @close="closeReview"
    @update:open="(open) => !open && closeReview()"
  >
    <div
      v-if="appointmentReview && selectedInterval"
      class="space-y-5"
      data-testid="appointment-review"
    >
      <div class="rounded-2xl bg-brand-primary-soft p-5 text-brand-primary">
        <p class="font-bold capitalize">{{ selectedDateLabel }}</p>
        <p class="mt-1 text-sm font-semibold">{{ reviewTimeLabel }}</p>
      </div>

      <dl class="grid gap-4 text-sm">
        <div>
          <dt class="text-content-muted">Professor</dt>
          <dd class="mt-1 font-bold text-content">
            {{ selectedInterval.availability.professor.name }}
          </dd>
        </div>
        <div>
          <dt class="text-content-muted">Modalidade</dt>
          <dd class="mt-1 font-bold text-content">
            {{ formatModality(appointmentReview.modality) }}
          </dd>
        </div>
        <div>
          <dt class="text-content-muted">Assunto</dt>
          <dd class="mt-1 whitespace-pre-wrap font-bold text-content">
            {{ appointmentReview.subject }}
          </dd>
        </div>
        <div v-if="appointmentReview.details">
          <dt class="text-content-muted">Informações complementares</dt>
          <dd class="mt-1 whitespace-pre-wrap text-content">{{ appointmentReview.details }}</dd>
        </div>
      </dl>

      <p
        class="rounded-xl border border-outline bg-surface-subtle p-4 text-sm leading-6 text-content-muted"
      >
        Nenhum horário foi reservado nesta revisão. A reserva só será efetivada depois da
        confirmação pelo servidor.
      </p>

      <p
        v-if="confirmationError"
        class="rounded-xl bg-status-danger-soft p-4 text-sm font-medium text-status-danger"
        role="alert"
      >
        {{ confirmationError }}
      </p>
    </div>

    <template #footer>
      <AppButton
        variant="secondary"
        data-modal-autofocus
        :disabled="confirming"
        @click="closeReview"
      >
        Voltar e ajustar
      </AppButton>
      <AppButton
        data-testid="confirm-appointment"
        :loading="confirming"
        loading-label="Confirmando..."
        @click="confirmAppointment"
      >
        Confirmar agendamento
      </AppButton>
    </template>
  </AppModal>

  <AppModal
    :open="Boolean(confirmedAppointment)"
    title="Agendamento confirmado"
    description="Seu horário foi reservado com sucesso. Guarde o protocolo para consultas futuras."
    size="sm"
    @close="closeConfirmation"
    @update:open="(open) => !open && closeConfirmation()"
  >
    <div v-if="confirmedAppointment" class="space-y-5" data-testid="appointment-confirmation">
      <div class="rounded-2xl bg-status-success-soft p-5 text-status-success">
        <p class="text-xs font-bold uppercase tracking-[0.12em]">Protocolo</p>
        <p class="mt-2 break-all text-xl font-bold">{{ confirmedAppointment.protocol }}</p>
      </div>

      <dl class="grid gap-4 text-sm">
        <div>
          <dt class="text-content-muted">Data e horário</dt>
          <dd class="mt-1 font-bold capitalize text-content">
            {{ confirmedDateLabel }} · {{ confirmedTimeLabel }}
          </dd>
        </div>
        <div>
          <dt class="text-content-muted">Professor</dt>
          <dd class="mt-1 font-bold text-content">{{ confirmedAppointment.professor.name }}</dd>
        </div>
        <div>
          <dt class="text-content-muted">Modalidade</dt>
          <dd class="mt-1 font-bold text-content">
            {{ formatModality(confirmedAppointment.modality) }}
          </dd>
        </div>
        <div>
          <dt class="text-content-muted">Assunto</dt>
          <dd class="mt-1 font-bold text-content">{{ confirmedAppointment.subject }}</dd>
        </div>
      </dl>
    </div>

    <template #footer>
      <AppButton data-modal-autofocus @click="closeConfirmation">Concluir</AppButton>
    </template>
  </AppModal>
</template>
