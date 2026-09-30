<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

import AppHeader from '@/components/layout/AppHeader.vue'
import AppSidebar from '@/components/layout/AppSidebar.vue'
import { useNavigationStore } from '@/stores/navigation'

const SIDEBAR_STORAGE_KEY = 'magrin-sac-sidebar-collapsed'

const route = useRoute()
const navigation = useNavigationStore()
const isMobileNavigationOpen = ref(false)
const isDesktopSidebarCollapsed = ref(readCollapsedPreference())

function readCollapsedPreference(): boolean {
  if (typeof window === 'undefined') return false

  try {
    return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

function persistCollapsedPreference(value: boolean) {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(value))
  } catch {
    // A sidebar continua funcional quando o armazenamento estiver indisponível.
  }
}

function closeMobileNavigation() {
  isMobileNavigationOpen.value = false
}

function handleEscape(event: KeyboardEvent) {
  if (event.key === 'Escape') closeMobileNavigation()
}

async function reloadNavigation() {
  try {
    await navigation.load(true)
  } catch {
    // O erro permanece visível na própria sidebar com opção de nova tentativa.
  }
}

watch(isDesktopSidebarCollapsed, persistCollapsedPreference)
watch(() => route.fullPath, closeMobileNavigation)

onMounted(() => {
  window.addEventListener('keydown', handleEscape)

  if (!navigation.initialized && !navigation.isLoading) {
    void reloadNavigation()
  }
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleEscape)
})
</script>

<template>
  <div
    class="grid min-h-screen grid-cols-1 grid-rows-[auto_minmax(0,1fr)] bg-canvas transition-[grid-template-columns] duration-200 ease-out"
    :class="
      isDesktopSidebarCollapsed
        ? 'lg:grid-cols-[6rem_minmax(0,1fr)]'
        : 'lg:grid-cols-[18rem_minmax(0,1fr)]'
    "
  >
    <AppHeader
      class="col-start-1 row-start-1 lg:col-span-2"
      :mobile-navigation-open="isMobileNavigationOpen"
      @toggle-navigation="isMobileNavigationOpen = !isMobileNavigationOpen"
    />

    <button
      v-if="isMobileNavigationOpen"
      class="fixed inset-0 z-40 bg-black/45 backdrop-blur-[2px] lg:hidden"
      type="button"
      aria-label="Fechar menu de navegação"
      @click="closeMobileNavigation"
    ></button>

    <AppSidebar
      class="col-start-1 row-start-2"
      :collapsed="isDesktopSidebarCollapsed"
      :error-message="navigation.errorMessage"
      :is-loading="navigation.isLoading"
      :items="navigation.items"
      :mobile-open="isMobileNavigationOpen"
      @close-mobile="closeMobileNavigation"
      @expand-desktop="isDesktopSidebarCollapsed = false"
      @retry="reloadNavigation"
      @toggle-desktop="isDesktopSidebarCollapsed = !isDesktopSidebarCollapsed"
    />

    <main id="conteudo-principal" class="col-start-1 row-start-2 min-w-0 lg:col-start-2">
      <slot />
    </main>
  </div>
</template>
