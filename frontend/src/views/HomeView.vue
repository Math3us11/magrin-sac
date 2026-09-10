<script setup lang="ts">
import { useDocumentTitle } from '@/composables/useDocumentTitle'
import type { ModuleSummary } from '@/types/module-summary'

useDocumentTitle('Sistema de Agendamento')

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
      class="pointer-events-none absolute inset-x-0 top-0 -z-10 h-80 bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.2),transparent_55%)]"
      aria-hidden="true"
    ></div>

    <div class="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
      <div class="max-w-3xl">
        <p class="text-sm font-semibold text-brand-300">Base técnica preparada</p>
        <h1 class="mt-3 text-4xl font-bold tracking-tight text-white sm:text-5xl">
          Agendamentos claros para alunos e coordenação
        </h1>
        <p class="mt-6 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
          O frontend está pronto para evoluir por fluxos, com Vue, TypeScript, Router, Pinia,
          Tailwind e testes automatizados.
        </p>
      </div>

      <div class="mt-12 grid gap-4 sm:grid-cols-2">
        <article
          v-for="module in modules"
          :key="module.title"
          class="rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/10"
        >
          <div class="flex items-start justify-between gap-4">
            <h2 class="text-lg font-semibold text-white">{{ module.title }}</h2>
            <span
              class="rounded-full bg-brand-400/10 px-2.5 py-1 text-xs font-medium text-brand-300"
            >
              {{ module.phase }}
            </span>
          </div>
          <p class="mt-3 leading-6 text-slate-400">{{ module.description }}</p>
        </article>
      </div>

      <div class="mt-8 rounded-2xl border border-amber-300/20 bg-amber-300/[0.06] p-5">
        <p class="font-medium text-amber-200">Próxima etapa</p>
        <p class="mt-1 text-sm leading-6 text-amber-100/70">
          Criar o backend Flask e validar os contratos antes de conectar dados reais à interface.
        </p>
      </div>
    </div>
  </section>
</template>
