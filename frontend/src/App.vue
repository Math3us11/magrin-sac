<script setup lang="ts">
import { computed } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import { storeToRefs } from 'pinia'

import AppLoading from '@/components/basic/AppLoading.vue'
import AppNotify from '@/components/basic/AppNotify.vue'
import AppShell from '@/components/layout/AppShell.vue'
import { useLoadingStore } from '@/stores/loading'

const route = useRoute()
const loadingStore = useLoadingStore()
const {
  active: loadingActive,
  description: loadingDescription,
  icon: loadingIcon,
} = storeToRefs(loadingStore)
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

    <AppNotify />
    <AppLoading :active="loadingActive" :description="loadingDescription" :icon="loadingIcon" />
  </div>
</template>
