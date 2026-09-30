<script setup lang="ts">
import { computed } from 'vue'
import { RouterView, useRoute } from 'vue-router'

import AppShell from '@/components/layout/AppShell.vue'

const route = useRoute()
const showShell = computed(() => !route.meta.hideShell)
</script>

<template>
  <div class="min-h-screen bg-canvas text-content">
    <a
      v-if="showShell"
      class="sr-only z-50 rounded-md bg-brand-primary px-4 py-2 font-medium text-on-primary focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      href="#conteudo-principal"
    >
      Pular para o conteúdo
    </a>

    <AppShell v-if="showShell">
      <RouterView />
    </AppShell>

    <main v-else id="conteudo-principal" class="min-h-screen">
      <RouterView />
    </main>
  </div>
</template>
