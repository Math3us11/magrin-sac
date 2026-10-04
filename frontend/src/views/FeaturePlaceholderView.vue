<script setup lang="ts">
import { useDocumentTitle } from '@/composables/useDocumentTitle'

const props = defineProps<{
  description: string
  eyebrow: string
  title: string
}>()

useDocumentTitle(`${props.title} | Sistema de Agendamento`)
</script>

<template>
  <section class="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
    <div
      class="institutional-glow relative isolate overflow-hidden rounded-3xl border border-outline bg-surface p-7 sm:p-10"
    >
      <div class="max-w-2xl">
        <p class="text-xs font-bold uppercase tracking-[0.18em] text-brand-primary">
          {{ eyebrow }}
        </p>
        <h1 class="mt-3 text-3xl font-bold tracking-tight text-content sm:text-4xl">
          {{ title }}
        </h1>
        <p class="mt-4 text-base leading-7 text-content-muted">{{ description }}</p>
        <span
          class="mt-8 inline-flex rounded-full bg-brand-secondary-soft px-3 py-1.5 text-xs font-semibold text-brand-secondary"
        >
          Estrutura inicial
        </span>
      </div>
    </div>
  </section>
</template>
