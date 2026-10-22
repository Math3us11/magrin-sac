<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'

import AppButton from '@/components/basic/AppButton.vue'
import { useDocumentTitle } from '@/composables/useDocumentTitle'
import { getInstitutionDateTime } from '@/config/date-time'
import { calendarCheckIcon, circleCheckIcon, circleXIcon, clockIcon } from '@/icons'
import { ApiError } from '@/services/api'
import { getDashboardSummary } from '@/services/dashboard'
import { useAuthStore } from '@/stores/auth'
import { useLoadingStore } from '@/stores/loading'
import type { DashboardScope, DashboardSummary } from '@/types/dashboard'

useDocumentTitle('Dashboard | Sistema de Agendamento')

const auth = useAuthStore()
const loadingStore = useLoadingStore()
const today = getInstitutionDateTime().date
const from = ref(`${today.slice(0, 8)}01`)
const to = ref(today)
const summary = ref<DashboardSummary | null>(null)
const loading = ref(true)
const error = ref('')
let requestSequence = 0

const scope = computed<DashboardScope>(() =>
  auth.user?.userType === 'administrador' ? 'admin' : 'professor',
)
const attendanceRouteName = computed(() =>
  scope.value === 'admin' ? 'administration-attendances' : 'professor-attendances',
)
const scopeDescription = computed(() =>
  scope.value === 'admin'
    ? 'Acompanhe os resultados globais registrados pela coordenação no período selecionado.'
    : 'Acompanhe os resultados dos atendimentos vinculados à sua agenda no período selecionado.',
)

const indicators = computed(() => [
  {
    accent: 'text-brand-primary',
    icon: calendarCheckIcon,
    key: 'performed',
    label: 'Realizados',
    query: { occurrence: 'realizado' },
    soft: 'bg-brand-primary-soft',
    value: summary.value?.performed ?? 0,
  },
  {
    accent: 'text-status-success',
    icon: circleCheckIcon,
    key: 'resolved',
    label: 'Resolvidos',
    query: { occurrence: 'realizado', resolutionStatus: 'resolvido' },
    soft: 'bg-status-success-soft',
    value: summary.value?.resolved ?? 0,
  },
  {
    accent: 'text-status-danger',
    icon: circleXIcon,
    key: 'unresolved',
    label: 'Não resolvidos',
    query: { occurrence: 'realizado', resolutionStatus: 'nao_resolvido' },
    soft: 'bg-status-danger-soft',
    value: summary.value?.unresolved ?? 0,
  },
  {
    accent: 'text-brand-secondary',
    icon: clockIcon,
    key: 'inProgress',
    label: 'Em tratativa',
    query: { occurrence: 'realizado', resolutionStatus: 'em_tratativa' },
    soft: 'bg-brand-secondary-soft',
    value: summary.value?.inProgress ?? 0,
  },
])

function requestErrorMessage(requestError: unknown): string {
  return requestError instanceof ApiError
    ? requestError.message
    : 'Não foi possível carregar os indicadores. Tente novamente.'
}

async function loadSummary() {
  if (to.value < from.value) {
    error.value = 'A data final deve ser igual ou posterior à data inicial.'
    summary.value = null
    return
  }

  const currentRequest = ++requestSequence
  const loadingId = loadingStore.start({ description: 'Carregando indicadores...' })
  loading.value = true
  error.value = ''

  try {
    const response = await getDashboardSummary(scope.value, { from: from.value, to: to.value })
    if (currentRequest !== requestSequence) return
    summary.value = response
  } catch (requestError) {
    if (currentRequest !== requestSequence) return
    summary.value = null
    error.value = requestErrorMessage(requestError)
  } finally {
    loadingStore.stop(loadingId)
    if (currentRequest === requestSequence) loading.value = false
  }
}

function indicatorRoute(query: Record<string, string | undefined>) {
  return {
    name: attendanceRouteName.value,
    query: {
      from: summary.value?.filters.from ?? from.value,
      to: summary.value?.filters.to ?? to.value,
      ...query,
    },
  }
}

onMounted(() => void loadSummary())
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

    <div class="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
      <header class="max-w-3xl">
        <p class="text-xs font-bold uppercase tracking-[0.16em] text-brand-primary">Relatórios</p>
        <h1 class="mt-3 text-3xl font-bold tracking-tight text-content sm:text-4xl">Dashboard</h1>
        <p class="mt-4 text-base leading-7 text-content-muted">{{ scopeDescription }}</p>
      </header>

      <section class="mt-8 rounded-3xl border border-outline bg-surface p-5 sm:p-6">
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
          <div>
            <label class="mb-2 block text-sm font-semibold text-content" for="dashboard-from">
              Data inicial
            </label>
            <input id="dashboard-from" v-model="from" class="app-input" type="date" />
          </div>
          <div>
            <label class="mb-2 block text-sm font-semibold text-content" for="dashboard-to">
              Data final
            </label>
            <input id="dashboard-to" v-model="to" class="app-input" type="date" />
          </div>
          <AppButton :loading="loading" loading-label="Atualizando..." @click="loadSummary">
            Atualizar indicadores
          </AppButton>
        </div>
        <p v-if="error" class="mt-4 text-sm font-medium text-status-danger" role="alert">
          {{ error }}
        </p>
      </section>

      <section class="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Indicadores">
        <article
          v-for="indicator in indicators"
          :key="indicator.key"
          class="surface-card flex min-h-52 flex-col rounded-3xl border border-outline bg-surface p-5 sm:p-6"
        >
          <span
            class="inline-flex h-11 w-11 items-center justify-center rounded-xl"
            :class="[indicator.soft, indicator.accent]"
          >
            <Icon class="h-5 w-5" :icon="indicator.icon" aria-hidden="true" />
          </span>
          <p class="mt-5 text-xs font-bold uppercase tracking-[0.12em] text-content-muted">
            {{ indicator.label }}
          </p>
          <p
            class="mt-2 text-4xl font-bold text-content"
            :data-testid="`indicator-${indicator.key}`"
          >
            {{ loading ? '—' : indicator.value }}
          </p>
          <RouterLink
            class="mt-auto pt-5 text-sm font-bold text-brand-primary transition hover:text-brand-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus"
            :to="indicatorRoute(indicator.query)"
          >
            Ver registros
          </RouterLink>
        </article>
      </section>

      <aside
        class="mt-6 rounded-2xl border border-outline bg-surface-subtle p-5 text-sm text-content-muted"
      >
        <p class="font-semibold text-content">Como os totais são calculados</p>
        <p class="mt-2 leading-6">
          “Realizados” inclui todos os atendimentos efetivamente registrados, enquanto as três
          classificações detalham esses mesmos registros. Ausências não são contabilizadas como
          atendimento realizado.
        </p>
      </aside>
    </div>
  </section>
</template>
