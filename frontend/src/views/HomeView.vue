<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { computed, onMounted, ref } from 'vue'

import { getInstitutionDateTime, INSTITUTION_TIME_ZONE } from '@/config/date-time'
import { useDocumentTitle } from '@/composables/useDocumentTitle'
import {
  arrowRightIcon,
  calendarCheckIcon,
  chartCombinedIcon,
  circleCheckIcon,
  clockIcon,
  historyIcon,
  triangleAlertIcon,
  userPlusIcon,
  usersIcon,
} from '@/icons'
import { ApiError } from '@/services/api'
import {
  listAdminAppointments,
  listAssignedAppointments,
  listOwnAppointments,
} from '@/services/appointments'
import { useAuthStore } from '@/stores/auth'
import { useNavigationStore } from '@/stores/navigation'
import type {
  AdminAppointmentItem,
  AppointmentStatus,
  OwnAppointmentItem,
} from '@/types/appointment'
import type { AvailabilityModality } from '@/types/availability'

type HomeAppointment = {
  context?: string
  endsAt: string
  id: number
  modality: AvailabilityModality
  participantLabel: string
  participantName: string
  protocol: string
  startsAt: string
  status: AppointmentStatus
  subject: string
}

type UserType = 'administrador' | 'aluno' | 'professor'

useDocumentTitle('Início | Sistema de Agendamento')

const auth = useAuthStore()
const navigation = useNavigationStore()
const today = getInstitutionDateTime().date
const periodEnd = addDays(today, 29)
const appointments = ref<HomeAppointment[]>([])
const totalAppointments = ref(0)
const loading = ref(true)
const loadError = ref('')

const firstName = computed(() => auth.user?.name.trim().split(/\s+/)[0] || 'usuário')
const userType = computed<UserType>(() => auth.user?.userType ?? 'aluno')
const userTypeLabel = computed(() => {
  if (userType.value === 'administrador') return 'Administrador'
  if (userType.value === 'professor') return 'Professor'
  return 'Aluno'
})
const todayLabel = formatInstitutionDate(`${today}T12:00:00.000Z`, {
  day: '2-digit',
  month: 'long',
  weekday: 'long',
})

const quickLinks = [
  {
    description: 'Encontre um horário livre e envie uma nova solicitação.',
    icon: userPlusIcon,
    permission: 'appointments.create',
    roles: ['aluno'],
    routeName: 'appointments-new',
    title: 'Novo agendamento',
  },
  {
    description: 'Consulte seus próximos compromissos e o histórico.',
    icon: historyIcon,
    permission: 'appointments.read.own',
    roles: ['aluno'],
    routeName: 'appointments-mine',
    title: 'Meus agendamentos',
  },
  {
    description: 'Publique e acompanhe suas janelas de atendimento.',
    icon: calendarCheckIcon,
    permission: 'availability.manage.own',
    roles: ['professor'],
    routeName: 'professor-availability',
    title: 'Minha agenda',
  },
  {
    description: 'Registre resultados e acompanhe suas demandas.',
    icon: circleCheckIcon,
    permission: 'attendance.manage.assigned',
    roles: ['professor'],
    routeName: 'professor-attendances',
    title: 'Meus atendimentos',
  },
  {
    description: 'Consulte disponibilidades e compromissos de toda a equipe.',
    icon: calendarCheckIcon,
    permission: 'availability.read.any',
    roles: ['administrador'],
    routeName: 'administration-schedule',
    title: 'Agenda geral',
  },
  {
    description: 'Registre resultados e acompanhe demandas institucionais.',
    icon: circleCheckIcon,
    permission: 'attendance.manage.any',
    roles: ['administrador'],
    routeName: 'administration-attendances',
    title: 'Atendimentos',
  },
  {
    description: 'Cadastre, consulte e mantenha as contas autorizadas.',
    icon: usersIcon,
    permission: 'users.manage',
    roles: ['administrador'],
    routeName: 'administration-users',
    title: 'Usuários',
  },
  {
    description: 'Acompanhe os principais indicadores de atendimento.',
    icon: chartCombinedIcon,
    permission: 'reports.dashboard.view',
    roles: ['administrador', 'professor'],
    routeName: 'reports-dashboard',
    title: 'Dashboard',
  },
] as const

const availableQuickLinks = computed(() =>
  quickLinks.filter(
    ({ permission, roles }) =>
      roles.some((role) => role === userType.value) && navigation.hasPermission(permission),
  ),
)
const primaryLink = computed(() => availableQuickLinks.value[0] ?? null)
const agendaTitle = computed(() => {
  if (userType.value === 'administrador') return 'Próximos agendamentos da equipe'
  if (userType.value === 'professor') return 'Próximos atendimentos atribuídos'
  return 'Seus próximos agendamentos'
})
const agendaDescription = computed(() => {
  if (userType.value === 'administrador') {
    return 'Compromissos confirmados de todos os professores nos próximos 30 dias.'
  }
  if (userType.value === 'professor') {
    return 'Atendimentos confirmados em suas disponibilidades nos próximos 30 dias.'
  }
  return 'Compromissos confirmados para você, ordenados pelo horário mais próximo.'
})
const agendaRouteName = computed(() => {
  if (userType.value === 'administrador') return 'administration-schedule'
  if (userType.value === 'professor') return 'professor-availability'
  return 'appointments-mine'
})
const canReadAgenda = computed(() => {
  if (userType.value === 'administrador') return navigation.hasPermission('appointments.read.any')
  if (userType.value === 'professor') return navigation.hasPermission('appointments.read.assigned')
  return navigation.hasPermission('appointments.read.own')
})
const appointmentsToday = computed(
  () =>
    appointments.value.filter(
      ({ startsAt }) => getInstitutionDateTime(new Date(startsAt)).date === today,
    ).length,
)
const nextAppointment = computed(() => appointments.value[0] ?? null)
const visibleAppointments = computed(() => appointments.value.slice(0, 4))

function addDays(value: string, amount: number): string {
  const date = new Date(`${value}T12:00:00.000Z`)
  date.setUTCDate(date.getUTCDate() + amount)
  return date.toISOString().slice(0, 10)
}

function formatInstitutionDate(
  value: string,
  options: Intl.DateTimeFormatOptions = { dateStyle: 'medium' },
): string {
  return new Intl.DateTimeFormat('pt-BR', {
    ...options,
    timeZone: options.timeZone ?? INSTITUTION_TIME_ZONE,
  }).format(new Date(value))
}

function formatTime(value: string): string {
  return getInstitutionDateTime(new Date(value)).time
}

function modalityLabel(modality: AvailabilityModality): string {
  return modality === 'online' ? 'Online' : 'Presencial'
}

function mapOwnAppointment(appointment: OwnAppointmentItem): HomeAppointment {
  return {
    endsAt: appointment.endsAt,
    id: appointment.id,
    modality: appointment.modality,
    participantLabel: 'Professor',
    participantName: appointment.professor.name,
    protocol: appointment.protocol,
    startsAt: appointment.startsAt,
    status: appointment.status,
    subject: appointment.subject,
  }
}

function mapTeamAppointment(appointment: AdminAppointmentItem): HomeAppointment {
  return {
    context:
      userType.value === 'administrador' ? `Professor ${appointment.professor.name}` : undefined,
    endsAt: appointment.endsAt,
    id: appointment.id,
    modality: appointment.modality,
    participantLabel: 'Aluno',
    participantName: appointment.student.name,
    protocol: appointment.protocol,
    startsAt: appointment.startsAt,
    status: appointment.status,
    subject: appointment.subject,
  }
}

async function loadHomeAgenda() {
  if (!auth.user || !canReadAgenda.value) {
    loading.value = false
    return
  }

  loading.value = true
  loadError.value = ''

  try {
    if (userType.value === 'aluno') {
      const response = await listOwnAppointments({
        from: today,
        status: 'confirmado',
        to: periodEnd,
      })
      appointments.value = response.appointments.map(mapOwnAppointment)
      totalAppointments.value = response.total
    } else {
      const params = { from: today, status: 'confirmado' as const, to: periodEnd }
      const response =
        userType.value === 'administrador'
          ? await listAdminAppointments(params)
          : await listAssignedAppointments(params)
      const orderedAppointments = response.appointments
        .map(mapTeamAppointment)
        .sort((first, second) => first.startsAt.localeCompare(second.startsAt))

      appointments.value = orderedAppointments
      totalAppointments.value = orderedAppointments.length
    }
  } catch (error) {
    appointments.value = []
    totalAppointments.value = 0
    loadError.value =
      error instanceof ApiError
        ? error.message
        : 'Não foi possível carregar o resumo da agenda. Tente novamente.'
  } finally {
    loading.value = false
  }
}

onMounted(() => void loadHomeAgenda())
</script>

<template>
  <section class="relative isolate min-h-full overflow-hidden">
    <div
      class="institutional-glow pointer-events-none absolute inset-x-0 top-0 -z-10 h-96"
      aria-hidden="true"
    ></div>

    <div class="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
      <header class="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div class="max-w-3xl">
          <div class="flex flex-wrap items-center gap-2">
            <p class="text-xs font-bold uppercase tracking-[0.16em] text-brand-primary">Início</p>
            <span
              class="rounded-full border border-outline bg-surface px-2.5 py-1 text-[0.68rem] font-bold uppercase tracking-[0.1em] text-content-muted"
            >
              {{ userTypeLabel }}
            </span>
          </div>
          <h1 class="mt-3 text-3xl font-bold tracking-tight text-content sm:text-4xl">
            Olá, {{ firstName }}.
          </h1>
          <p class="mt-3 text-base leading-7 text-content-muted">
            {{ todayLabel }} · Horário de Porto Velho
          </p>
        </div>

        <RouterLink
          v-if="primaryLink"
          class="inline-flex min-h-12 items-center justify-center gap-3 self-start rounded-xl bg-brand-primary px-5 text-sm font-bold text-on-primary shadow-lg shadow-brand-primary/20 hover:bg-brand-primary-hover lg:self-auto"
          :to="{ name: primaryLink.routeName }"
        >
          <Icon class="h-5 w-5" :icon="primaryLink.icon" aria-hidden="true" />
          {{ primaryLink.title }}
        </RouterLink>
      </header>

      <div class="mt-8 grid items-start gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(19rem,0.75fr)]">
        <section
          class="overflow-hidden rounded-3xl border border-outline bg-surface"
          aria-labelledby="home-agenda-title"
          data-testid="home-agenda"
        >
          <div
            class="flex flex-wrap items-start justify-between gap-4 border-b border-outline p-6 sm:p-7"
          >
            <div class="max-w-2xl">
              <p class="text-xs font-bold uppercase tracking-[0.14em] text-brand-primary">Agenda</p>
              <h2 id="home-agenda-title" class="mt-1 text-xl font-bold text-content">
                {{ agendaTitle }}
              </h2>
              <p class="mt-2 text-sm leading-6 text-content-muted">{{ agendaDescription }}</p>
            </div>
            <span
              class="rounded-full bg-brand-secondary-soft px-3 py-1 text-xs font-bold text-brand-secondary"
            >
              {{ loading ? 'Carregando' : `${totalAppointments} no período` }}
            </span>
          </div>

          <div v-if="loading" class="space-y-4 p-6 sm:p-7" aria-live="polite">
            <p class="sr-only">Carregando o resumo da agenda.</p>
            <div
              v-for="index in 2"
              :key="index"
              class="h-24 animate-pulse rounded-2xl bg-surface-subtle"
              aria-hidden="true"
            ></div>
          </div>

          <div v-else-if="loadError" class="p-8 text-center" role="alert">
            <Icon
              class="mx-auto h-9 w-9 text-status-danger"
              :icon="triangleAlertIcon"
              aria-hidden="true"
            />
            <h3 class="mt-4 text-lg font-bold text-content">Não foi possível carregar a agenda</h3>
            <p class="mt-2 text-sm text-content-muted">{{ loadError }}</p>
            <button
              class="mt-5 min-h-11 rounded-xl border border-outline px-4 text-sm font-bold text-content hover:border-brand-primary hover:text-brand-primary"
              type="button"
              @click="loadHomeAgenda"
            >
              Tentar novamente
            </button>
          </div>

          <div
            v-else-if="!canReadAgenda"
            class="p-8 text-center text-sm leading-6 text-content-muted"
          >
            O resumo da agenda aparecerá quando seu perfil receber a permissão necessária.
          </div>

          <div v-else-if="appointments.length === 0" class="p-8 text-center sm:p-10">
            <span
              class="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-status-success-soft text-status-success"
            >
              <Icon class="h-6 w-6" :icon="calendarCheckIcon" aria-hidden="true" />
            </span>
            <h3 class="mt-4 text-lg font-bold text-content">Nenhum compromisso próximo</h3>
            <p class="mx-auto mt-2 max-w-md text-sm leading-6 text-content-muted">
              Não encontramos agendamentos confirmados para este período.
            </p>
          </div>

          <ul v-else class="divide-y divide-outline">
            <li
              v-for="appointment in visibleAppointments"
              :key="appointment.id"
              class="grid gap-4 p-5 sm:grid-cols-[8.5rem_minmax(0,1fr)_auto] sm:items-center sm:px-7"
            >
              <div
                class="rounded-xl bg-brand-primary-soft px-3 py-2.5 text-center text-brand-primary"
              >
                <p class="text-xs font-bold capitalize">
                  {{
                    formatInstitutionDate(appointment.startsAt, {
                      day: '2-digit',
                      month: 'short',
                      weekday: 'short',
                    })
                  }}
                </p>
                <p class="mt-1 text-base font-extrabold">
                  {{ formatTime(appointment.startsAt) }}–{{ formatTime(appointment.endsAt) }}
                </p>
              </div>

              <div class="min-w-0">
                <p class="truncate font-bold text-content">{{ appointment.subject }}</p>
                <p class="mt-1 text-sm text-content-muted">
                  {{ appointment.participantLabel }}: {{ appointment.participantName }}
                </p>
                <p v-if="appointment.context" class="mt-1 text-xs text-content-muted">
                  {{ appointment.context }}
                </p>
              </div>

              <div class="flex items-center gap-2 sm:flex-col sm:items-end">
                <span
                  class="rounded-full bg-status-success-soft px-3 py-1 text-xs font-bold text-status-success"
                >
                  Confirmado
                </span>
                <span class="text-xs text-content-muted">
                  {{ modalityLabel(appointment.modality) }}
                </span>
              </div>
            </li>
          </ul>

          <div
            v-if="canReadAgenda && !loading && !loadError"
            class="border-t border-outline p-5 sm:px-7"
          >
            <RouterLink
              class="inline-flex min-h-10 items-center gap-2 text-sm font-bold text-brand-primary hover:text-brand-primary-hover"
              :to="{ name: agendaRouteName }"
            >
              Abrir agenda completa
              <Icon class="h-4 w-4" :icon="arrowRightIcon" aria-hidden="true" />
            </RouterLink>
          </div>
        </section>

        <aside
          class="rounded-3xl border border-outline bg-surface p-6 sm:p-7"
          aria-labelledby="home-summary-title"
          data-testid="home-summary"
        >
          <p class="text-xs font-bold uppercase tracking-[0.14em] text-brand-secondary">Resumo</p>
          <h2 id="home-summary-title" class="mt-1 text-xl font-bold text-content">
            Próximos 30 dias
          </h2>

          <dl class="mt-6 space-y-4">
            <div class="rounded-2xl bg-surface-subtle p-4">
              <dt class="flex items-center gap-2 text-sm font-semibold text-content-muted">
                <Icon class="h-4 w-4" :icon="clockIcon" aria-hidden="true" />
                Compromissos hoje
              </dt>
              <dd class="mt-2 text-3xl font-extrabold text-content">
                {{ loading ? '—' : appointmentsToday }}
              </dd>
            </div>
            <div class="rounded-2xl bg-surface-subtle p-4">
              <dt class="flex items-center gap-2 text-sm font-semibold text-content-muted">
                <Icon class="h-4 w-4" :icon="calendarCheckIcon" aria-hidden="true" />
                Total no período
              </dt>
              <dd class="mt-2 text-3xl font-extrabold text-content">
                {{ loading ? '—' : totalAppointments }}
              </dd>
            </div>
            <div class="rounded-2xl bg-surface-subtle p-4">
              <dt class="text-sm font-semibold text-content-muted">Próximo horário</dt>
              <dd v-if="nextAppointment" class="mt-2 font-bold capitalize text-content">
                {{
                  formatInstitutionDate(nextAppointment.startsAt, {
                    day: '2-digit',
                    month: 'short',
                  })
                }},
                {{ formatTime(nextAppointment.startsAt) }}
              </dd>
              <dd v-else class="mt-2 font-bold text-status-success">Agenda livre</dd>
            </div>
          </dl>
        </aside>
      </div>

      <section class="mt-9" aria-labelledby="quick-links-title">
        <div>
          <p class="text-xs font-bold uppercase tracking-[0.14em] text-brand-primary">Seu perfil</p>
          <h2 id="quick-links-title" class="mt-1 text-xl font-bold text-content">
            Acessos rápidos
          </h2>
        </div>

        <div
          v-if="availableQuickLinks.length > 0"
          data-testid="quick-links"
          class="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4"
        >
          <RouterLink
            v-for="link in availableQuickLinks"
            :key="link.routeName"
            class="group surface-card rounded-2xl border border-outline bg-surface p-5 motion-safe:hover:-translate-y-0.5 hover:border-brand-primary"
            :to="{ name: link.routeName }"
          >
            <div class="flex items-start justify-between gap-4">
              <span
                class="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-brand-primary-soft text-brand-primary"
              >
                <Icon class="h-5 w-5" :icon="link.icon" aria-hidden="true" />
              </span>
              <Icon
                class="h-5 w-5 text-content-muted group-hover:translate-x-1 group-hover:text-brand-primary"
                :icon="arrowRightIcon"
                aria-hidden="true"
              />
            </div>
            <h3 class="mt-5 font-bold text-content">{{ link.title }}</h3>
            <p class="mt-2 text-sm leading-6 text-content-muted">{{ link.description }}</p>
          </RouterLink>
        </div>

        <p
          v-else
          class="mt-4 rounded-2xl border border-dashed border-outline bg-surface p-5 text-sm text-content-muted"
        >
          Seus atalhos aparecerão aqui conforme as permissões disponíveis para o seu perfil.
        </p>
      </section>
    </div>
  </section>
</template>
