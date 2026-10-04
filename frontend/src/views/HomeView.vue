<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { computed } from 'vue'

import { useDocumentTitle } from '@/composables/useDocumentTitle'
import {
  arrowRightIcon,
  bellIcon,
  calendarCheckIcon,
  chartCombinedIcon,
  clockIcon,
  historyIcon,
  mapPinIcon,
  megaphoneIcon,
  starIcon,
  videoIcon,
} from '@/icons'
import { useAuthStore } from '@/stores/auth'
import { useNavigationStore } from '@/stores/navigation'

useDocumentTitle('Sistema de Agendamento')

const auth = useAuthStore()
const navigation = useNavigationStore()

const firstName = computed(() => auth.user?.name.split(/\s+/)[0] ?? 'usuário')
const userTypeLabel = computed(() => {
  if (auth.user?.userType === 'administrador') return 'Administrador'
  if (auth.user?.userType === 'professor') return 'Professor'
  return 'Aluno'
})
const todayLabel = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'long',
  weekday: 'long',
}).format(new Date())

const quickLinks = [
  {
    description: 'Publique e acompanhe seus horários de atendimento.',
    icon: calendarCheckIcon,
    permission: 'availability.manage.own',
    routeName: 'professor-availability',
    title: 'Minha agenda',
  },
  {
    description: 'Acompanhe os principais indicadores de atendimento.',
    icon: chartCombinedIcon,
    permission: 'reports.dashboard.view',
    routeName: 'reports-dashboard',
    title: 'Dashboard',
  },
  {
    description: 'Consulte horários disponíveis e inicie uma solicitação.',
    icon: calendarCheckIcon,
    permission: 'appointments.create',
    routeName: 'appointments-new',
    title: 'Novo agendamento',
  },
  {
    description: 'Veja compromissos futuros e o histórico de solicitações.',
    icon: historyIcon,
    permission: 'appointments.read.own',
    routeName: 'appointments-mine',
    title: 'Meus agendamentos',
  },
]

const availableQuickLinks = computed(() =>
  quickLinks.filter(({ permission }) => navigation.hasPermission(permission)),
)

const upcomingAppointments = [
  {
    date: 'Hoje',
    icon: mapPinIcon,
    id: 1,
    location: 'Sala da coordenação',
    mode: 'Presencial',
    participant: 'Aluno de exemplo',
    subject: 'Orientação acadêmica',
    time: '14:30',
  },
  {
    date: 'Amanhã',
    icon: videoIcon,
    id: 2,
    location: 'Sala virtual informada pela coordenação',
    mode: 'Online',
    participant: 'Estudante de exemplo',
    subject: 'Acompanhamento de matrícula',
    time: '09:00',
  },
]

const notices = [
  {
    category: 'Acadêmico',
    description: 'O período ilustrativo de ajustes acadêmicos termina nesta sexta-feira.',
    title: 'Prazo para ajustes de matrícula',
  },
  {
    category: 'Sistema',
    description: 'Este espaço poderá reunir indisponibilidades e comunicados importantes.',
    title: 'Manutenção programada',
  },
]
</script>

<template>
  <section class="relative isolate min-h-full overflow-hidden">
    <div
      class="institutional-glow pointer-events-none absolute inset-x-0 top-0 -z-10 h-96"
      aria-hidden="true"
    ></div>

    <div class="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
      <header class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div class="flex flex-wrap items-center gap-2">
            <p class="text-sm font-semibold text-brand-primary">Visão inicial</p>
            <span
              class="rounded-full border border-outline bg-surface px-2.5 py-1 text-[0.68rem] font-bold uppercase tracking-[0.1em] text-content-muted"
            >
              Conteúdo ilustrativo
            </span>
          </div>
          <h1 class="mt-3 text-3xl font-bold tracking-tight text-content sm:text-4xl">
            Olá, {{ firstName }}.
          </h1>
          <p class="mt-2 text-sm leading-6 text-content-muted sm:text-base">
            {{ userTypeLabel }} · {{ todayLabel }}
          </p>
        </div>

        <p class="max-w-md text-sm leading-6 text-content-muted sm:text-right">
          Uma prévia de como favoritos, agenda e comunicados poderão se adaptar ao seu perfil.
        </p>
      </header>

      <article
        class="relative mt-8 overflow-hidden rounded-3xl bg-brand-secondary p-6 text-on-secondary shadow-xl shadow-brand-secondary/15 sm:p-8"
      >
        <div
          class="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full border border-white/20 bg-white/10"
          aria-hidden="true"
        ></div>
        <div
          class="pointer-events-none absolute -bottom-24 right-32 h-48 w-48 rounded-full border border-white/15"
          aria-hidden="true"
        ></div>

        <div class="relative max-w-2xl">
          <div class="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em]">
            <Icon class="h-4 w-4" :icon="megaphoneIcon" aria-hidden="true" />
            Espaço institucional
          </div>
          <h2 class="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">
            Semana de acolhimento Afya
          </h2>
          <p class="mt-3 max-w-xl text-sm leading-6 opacity-85 sm:text-base">
            Campanhas, eventos e orientações importantes da faculdade poderão ganhar destaque aqui
            sem interromper as tarefas do dia a dia.
          </p>
        </div>
      </article>

      <section class="mt-9" aria-labelledby="quick-links-title">
        <div class="flex items-center gap-2">
          <Icon class="h-5 w-5 text-brand-primary" :icon="starIcon" aria-hidden="true" />
          <h2 id="quick-links-title" class="text-lg font-bold text-content">Acessos rápidos</h2>
        </div>

        <div
          v-if="availableQuickLinks.length > 0"
          data-testid="quick-links"
          class="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3"
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

      <div class="mt-9 grid items-start gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(19rem,0.75fr)]">
        <section
          class="overflow-hidden rounded-2xl border border-outline bg-surface"
          aria-labelledby="appointments-title"
        >
          <div
            class="flex flex-wrap items-center justify-between gap-3 border-b border-outline p-5"
          >
            <div>
              <p class="text-xs font-bold uppercase tracking-[0.12em] text-brand-primary">Agenda</p>
              <h2 id="appointments-title" class="mt-1 text-lg font-bold text-content">
                Próximos atendimentos
              </h2>
            </div>
            <span class="rounded-full bg-status-warning-soft px-3 py-1 text-xs text-status-warning">
              Dados de exemplo
            </span>
          </div>

          <ul data-testid="upcoming-appointments" class="divide-y divide-outline">
            <li
              v-for="appointment in upcomingAppointments"
              :key="appointment.id"
              class="grid gap-4 p-5 sm:grid-cols-[5rem_minmax(0,1fr)_auto] sm:items-center"
            >
              <div
                class="flex w-fit min-w-20 flex-row items-baseline gap-2 rounded-xl bg-brand-primary-soft px-3 py-2 text-brand-primary sm:flex-col sm:items-center sm:gap-0"
              >
                <span class="text-xs font-bold uppercase tracking-wide">{{
                  appointment.date
                }}</span>
                <span class="text-lg font-extrabold">{{ appointment.time }}</span>
              </div>

              <div class="min-w-0">
                <h3 class="font-bold text-content">{{ appointment.subject }}</h3>
                <p class="mt-1 text-sm text-content-muted">{{ appointment.participant }}</p>
                <p class="mt-2 flex items-center gap-1.5 text-xs text-content-muted">
                  <Icon class="h-4 w-4 shrink-0" :icon="appointment.icon" aria-hidden="true" />
                  <span class="truncate">{{ appointment.location }}</span>
                </p>
              </div>

              <span
                class="w-fit rounded-full bg-brand-secondary-soft px-3 py-1 text-xs font-semibold text-brand-secondary"
              >
                {{ appointment.mode }}
              </span>
            </li>
          </ul>
        </section>

        <section
          class="rounded-2xl border border-outline bg-surface p-5"
          aria-labelledby="notices-title"
        >
          <div class="flex items-center gap-3">
            <span
              class="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-secondary-soft text-brand-secondary"
            >
              <Icon class="h-5 w-5" :icon="bellIcon" aria-hidden="true" />
            </span>
            <div>
              <p class="text-xs font-bold uppercase tracking-[0.12em] text-brand-secondary">
                Mural
              </p>
              <h2 id="notices-title" class="font-bold text-content">Avisos importantes</h2>
            </div>
          </div>

          <ul class="mt-5 space-y-5">
            <li
              v-for="notice in notices"
              :key="notice.title"
              class="border-l-2 border-outline pl-4"
            >
              <p class="text-xs font-semibold text-brand-primary">{{ notice.category }}</p>
              <h3 class="mt-1 text-sm font-bold text-content">{{ notice.title }}</h3>
              <p class="mt-2 text-sm leading-6 text-content-muted">{{ notice.description }}</p>
            </li>
          </ul>

          <div
            class="mt-6 flex items-center gap-2 rounded-xl bg-surface-subtle p-3 text-xs text-content-muted"
          >
            <Icon class="h-4 w-4 shrink-0" :icon="clockIcon" aria-hidden="true" />
            Comunicados poderão ter validade e prioridade definidas.
          </div>
        </section>
      </div>
    </div>
  </section>
</template>
