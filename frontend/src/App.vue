<script setup lang="ts">
import { computed } from 'vue'
import { RouterView, useRoute } from 'vue-router'

import AppHeader from '@/components/AppHeader.vue'

const route = useRoute()
const showHeader = computed(() => !route.meta.hideHeader)
</script>

<template>
  <div class="min-h-screen bg-canvas text-content">
    <a
      class="sr-only z-50 rounded-md bg-brand-primary px-4 py-2 font-medium text-on-primary focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      href="#conteudo-principal"
    >
      Pular para o conteúdo
    </a>

    <AppHeader v-if="showHeader" />

    <main id="conteudo-principal" :class="showHeader ? '' : 'min-h-screen'">
      <RouterView />
    </main>
  </div>
</template>
