<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { computed, ref, watch } from 'vue'

import { calendarCheckIcon, chevronLeftIcon, chevronRightIcon } from '@/icons'
import type { AppCalendarEvent, AppCalendarEventTone } from '@/types/calendar'

const props = defineProps<{
  events: AppCalendarEvent[]
  initialDate?: string
  today: string
}>()

const weekdayLabels = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
const initialReference = props.initialDate ?? props.today
const visibleMonth = ref(initialReference.slice(0, 7))
const selectedDate = ref(initialReference)

function addUtcDays(value: string, amount: number): string {
  const date = new Date(`${value}T12:00:00.000Z`)
  date.setUTCDate(date.getUTCDate() + amount)
  return date.toISOString().slice(0, 10)
}

function shiftUtcMonth(value: string, amount: number): string {
  const date = new Date(`${value}-01T12:00:00.000Z`)
  date.setUTCMonth(date.getUTCMonth() + amount)
  return date.toISOString().slice(0, 7)
}

function eventsForDate(date: string): AppCalendarEvent[] {
  return eventsByDate.value.get(date) ?? []
}

function selectFirstDateInMonth(month: string) {
  selectedDate.value =
    props.events
      .filter((event) => event.date.startsWith(month))
      .sort((first, second) =>
        `${first.date}-${first.title}`.localeCompare(`${second.date}-${second.title}`),
      )[0]?.date ?? `${month}-01`
}

function changeMonth(amount: -1 | 1) {
  visibleMonth.value = shiftUtcMonth(visibleMonth.value, amount)
  selectFirstDateInMonth(visibleMonth.value)
}

function goToToday() {
  visibleMonth.value = props.today.slice(0, 7)
  selectedDate.value = props.today
}

function selectDate(date: string) {
  selectedDate.value = date
  if (!date.startsWith(visibleMonth.value)) visibleMonth.value = date.slice(0, 7)
}

function formatMonth(value: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    timeZone: 'UTC',
    year: 'numeric',
  }).format(new Date(`${value}-01T12:00:00.000Z`))
}

function formatLongDate(value: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'long',
    timeZone: 'UTC',
    weekday: 'long',
    year: 'numeric',
  }).format(new Date(`${value}T12:00:00.000Z`))
}

function dayAriaLabel(date: string, count: number): string {
  const scheduleLabel = count === 1 ? '1 horário' : `${count} horários`
  return `${formatLongDate(date)}, ${scheduleLabel}`
}

function toneClasses(tone: AppCalendarEventTone = 'neutral'): string {
  return {
    brand: 'bg-brand-primary-soft text-brand-primary',
    neutral: 'bg-surface-subtle text-content-muted',
    success: 'bg-status-success-soft text-status-success',
    warning: 'bg-status-warning-soft text-status-warning',
  }[tone]
}

const eventsByDate = computed(() => {
  const grouped = new Map<string, AppCalendarEvent[]>()

  for (const event of [...props.events].sort((first, second) =>
    `${first.date}-${first.title}`.localeCompare(`${second.date}-${second.title}`),
  )) {
    const current = grouped.get(event.date) ?? []
    current.push(event)
    grouped.set(event.date, current)
  }

  return grouped
})

const calendarDays = computed(() => {
  const firstDay = `${visibleMonth.value}-01`
  const firstDate = new Date(`${firstDay}T12:00:00.000Z`)
  const offsetFromMonday = (firstDate.getUTCDay() + 6) % 7
  const gridStart = addUtcDays(firstDay, -offsetFromMonday)

  return Array.from({ length: 42 }, (_, index) => {
    const date = addUtcDays(gridStart, index)
    const events = eventsForDate(date)

    return {
      date,
      dayNumber: Number(date.slice(-2)),
      events,
      isCurrentMonth: date.startsWith(visibleMonth.value),
      isSelected: date === selectedDate.value,
      isToday: date === props.today,
    }
  })
})

const selectedEvents = computed(() => eventsForDate(selectedDate.value))
const selectedDateLabel = computed(() => formatLongDate(selectedDate.value))

watch(
  () => props.initialDate,
  (value) => {
    if (!value) return
    visibleMonth.value = value.slice(0, 7)
    selectedDate.value = value
  },
)
</script>

<template>
  <section class="overflow-hidden" aria-label="Calendário da agenda">
    <header
      class="flex flex-col gap-4 border-b border-outline px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"
    >
      <div class="flex items-center gap-2" aria-label="Navegação do calendário">
        <button
          class="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-outline bg-surface text-content transition-colors hover:border-brand-primary hover:text-brand-primary"
          type="button"
          aria-label="Mês anterior"
          data-testid="calendar-previous-month"
          @click="changeMonth(-1)"
        >
          <Icon class="h-5 w-5" :icon="chevronLeftIcon" aria-hidden="true" />
        </button>
        <h3
          class="min-w-44 px-2 text-center text-lg font-bold capitalize text-content"
          data-testid="calendar-month-label"
        >
          {{ formatMonth(visibleMonth) }}
        </h3>
        <button
          class="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-outline bg-surface text-content transition-colors hover:border-brand-primary hover:text-brand-primary"
          type="button"
          aria-label="Próximo mês"
          data-testid="calendar-next-month"
          @click="changeMonth(1)"
        >
          <Icon class="h-5 w-5" :icon="chevronRightIcon" aria-hidden="true" />
        </button>
      </div>

      <button
        class="inline-flex h-10 w-fit items-center justify-center gap-2 rounded-xl border border-outline bg-surface px-4 text-sm font-bold text-content-muted transition-colors hover:border-brand-primary hover:text-brand-primary"
        type="button"
        data-testid="calendar-today"
        @click="goToToday"
      >
        <Icon class="h-4 w-4" :icon="calendarCheckIcon" aria-hidden="true" />
        Ir para hoje
      </button>
    </header>

    <div class="overflow-x-auto" tabindex="0" aria-label="Dias do mês">
      <div class="min-w-[48rem]">
        <div class="grid grid-cols-7 border-b border-outline bg-surface-subtle" aria-hidden="true">
          <div
            v-for="weekday in weekdayLabels"
            :key="weekday"
            class="px-3 py-2 text-center text-xs font-bold uppercase tracking-[0.08em] text-content-muted"
          >
            {{ weekday }}
          </div>
        </div>

        <div class="grid grid-cols-7" :aria-label="formatMonth(visibleMonth)">
          <button
            v-for="day in calendarDays"
            :key="day.date"
            class="group min-h-28 border-b border-r border-outline p-2 text-left align-top transition-colors hover:bg-surface-subtle focus-visible:relative focus-visible:z-10"
            :class="
              day.isSelected
                ? 'bg-brand-primary-soft ring-2 ring-inset ring-brand-primary'
                : day.isCurrentMonth
                  ? 'bg-surface'
                  : 'bg-surface-subtle/50 text-content-muted'
            "
            type="button"
            :aria-label="dayAriaLabel(day.date, day.events.length)"
            :aria-pressed="day.isSelected"
            :data-testid="`calendar-day-${day.date}`"
            @click="selectDate(day.date)"
          >
            <span class="flex items-center justify-between gap-2">
              <span class="flex items-center gap-1.5">
                <span
                  class="inline-flex h-7 min-w-7 items-center justify-center rounded-full px-1 text-xs font-bold"
                  :class="
                    day.isToday
                      ? 'border border-brand-primary bg-surface text-brand-primary'
                      : day.isSelected
                        ? 'text-brand-primary'
                        : 'text-content'
                  "
                >
                  {{ day.dayNumber }}
                </span>
                <span
                  v-if="day.isToday"
                  class="text-[0.6rem] font-extrabold uppercase tracking-[0.08em] text-brand-primary"
                >
                  Hoje
                </span>
              </span>
              <span
                v-if="day.events.length"
                class="inline-flex min-w-6 items-center justify-center rounded-md bg-brand-secondary-soft px-2 py-1 text-[0.65rem] font-extrabold text-brand-secondary"
                :aria-label="`${day.events.length} ${day.events.length === 1 ? 'horário' : 'horários'}`"
                :data-testid="`calendar-count-${day.date}`"
              >
                {{ day.events.length }}
              </span>
            </span>

            <span class="mt-1 block space-y-1">
              <span
                v-for="event in day.events.slice(0, 2)"
                :key="event.id"
                class="block truncate rounded-md px-2 py-1 text-[0.68rem] font-bold"
                :class="toneClasses(event.tone)"
              >
                {{ event.title }}
              </span>
              <span
                v-if="day.events.length > 2"
                class="block px-1 text-[0.68rem] font-bold text-content-muted"
              >
                +{{ day.events.length - 2 }} horário(s)
              </span>
            </span>
          </button>
        </div>
      </div>
    </div>

    <section class="bg-surface-subtle px-4 py-5 sm:px-6" data-testid="calendar-selected-agenda">
      <div class="flex items-center gap-3">
        <span
          class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-primary-soft text-brand-primary"
          aria-hidden="true"
        >
          <Icon class="h-5 w-5" :icon="calendarCheckIcon" />
        </span>
        <div>
          <p class="text-xs font-bold uppercase tracking-[0.12em] text-content-muted">
            Agenda do dia
          </p>
          <h4 class="font-bold capitalize text-content">{{ selectedDateLabel }}</h4>
        </div>
      </div>

      <p
        v-if="!selectedEvents.length"
        class="mt-4 rounded-xl border border-dashed border-outline bg-surface px-4 py-5 text-sm text-content-muted"
      >
        Nenhum horário publicado para esta data.
      </p>

      <ul v-else class="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <li
          v-for="event in selectedEvents"
          :key="event.id"
          class="rounded-xl border border-outline bg-surface p-4"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="font-bold text-content">{{ event.title }}</p>
              <p v-if="event.description" class="mt-1 text-sm text-content-muted">
                {{ event.description }}
              </p>
            </div>
            <span
              v-if="event.statusLabel"
              class="shrink-0 rounded-full px-2.5 py-1 text-[0.68rem] font-bold"
              :class="toneClasses(event.tone)"
            >
              {{ event.statusLabel }}
            </span>
          </div>
        </li>
      </ul>
    </section>
  </section>
</template>
