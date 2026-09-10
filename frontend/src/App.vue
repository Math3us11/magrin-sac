<script setup lang="ts">
import { RouterView } from 'vue-router'

import AppHeader from '@/components/AppHeader.vue'
</script>

<template>
  <div class="min-h-screen bg-slate-950 text-slate-100">
    <a
      class="sr-only z-50 rounded-md bg-white px-4 py-2 text-slate-950 focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      href="#conteudo-principal"
    >
      Pular para o conteúdo
    </a>

    <AppHeader />

    <main id="conteudo-principal">
      <RouterView />
    </main>
  </div>
</template>
