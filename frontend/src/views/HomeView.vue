<script setup lang="ts">
import { computed } from 'vue'

import { useDocumentTitle } from '@/composables/useDocumentTitle'
import { useAuthStore } from '@/stores/auth'
import type { ModuleSummary } from '@/types/module-summary'

useDocumentTitle('Sistema de Agendamento')

const auth = useAuthStore()
const firstName = computed(() => auth.user?.name.split(/\s+/)[0] ?? 'administrador')

const modules: ModuleSummary[] = [
  {
    title: 'Agenda do aluno',
    description: 'Consulta de horários e criação de agendamentos presenciais ou online.',
    phase: 'Fluxo vertical',
  },
  {
    title: 'Disponibilidades',
    description: 'Publicação e bloqueio de horários pela coordenação.',
    phase: 'Fluxo vertical',
  },
  {
    title: 'Atendimentos',
    description: 'Registro de realização, ausência e evolução das demandas.',
    phase: 'MVP',
  },
  {
    title: 'Indicadores',
    description: 'Visão dos atendimentos realizados e seus resultados.',
    phase: 'MVP',
  },
]
</script>

<template>
  <section class="relative isolate overflow-hidden">
    <div
      class="institutional-glow pointer-events-none absolute inset-x-0 top-0 -z-10 h-96"
      aria-hidden="true"
    ></div>

    <div class="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
      <div class="max-w-3xl">
        <p class="text-sm font-semibold text-brand-primary">Painel administrativo</p>
        <h1 class="mt-3 text-4xl font-bold tracking-tight text-content sm:text-5xl">
          Olá, {{ firstName }}. Vamos organizar os próximos atendimentos?
        </h1>
        <p class="mt-6 max-w-2xl text-base leading-7 text-content-muted sm:text-lg">
          Este é o início do ambiente de gestão. Os módulos serão habilitados conforme avançarmos no
          fluxo vertical do sistema.
        </p>
      </div>

      <div class="mt-12 grid gap-4 sm:grid-cols-2">
        <article
          v-for="module in modules"
          :key="module.title"
          class="surface-card rounded-2xl border border-outline bg-surface p-6"
        >
          <div class="flex items-start justify-between gap-4">
            <h2 class="text-lg font-semibold text-content">{{ module.title }}</h2>
            <span
              class="rounded-full bg-brand-primary-soft px-2.5 py-1 text-xs font-medium text-brand-primary"
            >
              {{ module.phase }}
            </span>
          </div>
          <p class="mt-3 leading-6 text-content-muted">{{ module.description }}</p>
        </article>
      </div>

      <div class="mt-8 rounded-2xl border border-brand-secondary bg-brand-secondary-soft p-5">
        <p class="font-semibold text-brand-secondary">Próxima etapa</p>
        <p class="mt-1 text-sm leading-6 text-content-muted">
          Cadastrar o primeiro administrador no banco e validar o acesso completo com dados reais.
        </p>
      </div>
    </div>
  </section>
</template>
