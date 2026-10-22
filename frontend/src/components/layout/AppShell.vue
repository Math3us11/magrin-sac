<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

import AppHeader from '@/components/layout/AppHeader.vue'
import AppSidebar from '@/components/layout/AppSidebar.vue'
import { useNavigationStore } from '@/stores/navigation'

const SIDEBAR_STORAGE_KEY = 'magrin-sac-sidebar-collapsed'

const route = useRoute()
const navigation = useNavigationStore()
const isMobileNavigationOpen = ref(false)
const isDesktopSidebarCollapsed = ref(readCollapsedPreference())
let mobileNavigationTrigger: HTMLElement | null = null
let previousBodyOverflow = ''

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

async function openMobileNavigation() {
  mobileNavigationTrigger =
    document.activeElement instanceof HTMLElement ? document.activeElement : null
  previousBodyOverflow = document.body.style.overflow
  document.body.style.overflow = 'hidden'
  isMobileNavigationOpen.value = true

  await nextTick()
  document.querySelector<HTMLElement>('[data-testid="sidebar-mobile-close"]')?.focus()
}

function closeMobileNavigation(restoreFocus = true) {
  if (!isMobileNavigationOpen.value) return

  const triggerToRestore = mobileNavigationTrigger
  isMobileNavigationOpen.value = false
  document.body.style.overflow = previousBodyOverflow

  if (restoreFocus) {
    void nextTick(() => triggerToRestore?.focus())
  }

  mobileNavigationTrigger = null
}

function toggleMobileNavigation() {
  if (isMobileNavigationOpen.value) closeMobileNavigation()
  else void openMobileNavigation()
}

function handleEscape(event: KeyboardEvent) {
  if (event.key !== 'Escape' || !isMobileNavigationOpen.value) return

  event.preventDefault()
  closeMobileNavigation()
}

function handleFocusTrap(event: KeyboardEvent) {
  if (event.key !== 'Tab' || !isMobileNavigationOpen.value) return

  const sidebar = document.getElementById('app-sidebar')
  if (!sidebar) return

  const focusableElements = Array.from(
    sidebar.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((element) => {
    let current: HTMLElement | null = element

    while (current && current !== sidebar) {
      if (
        current.hidden ||
        current.style.display === 'none' ||
        current.classList.contains('hidden')
      ) {
        return false
      }
      current = current.parentElement
    }

    return true
  })
  const firstElement = focusableElements[0]
  const lastElement = focusableElements[focusableElements.length - 1]

  if (!firstElement || !lastElement) {
    event.preventDefault()
    sidebar.focus()
    return
  }

  if (!sidebar.contains(document.activeElement)) {
    event.preventDefault()
    ;(event.shiftKey ? lastElement : firstElement).focus()
    return
  }

  if (event.shiftKey && document.activeElement === firstElement) {
    event.preventDefault()
    lastElement.focus()
  } else if (!event.shiftKey && document.activeElement === lastElement) {
    event.preventDefault()
    firstElement.focus()
  }
}

async function reloadNavigation() {
  try {
    await navigation.load(true)
  } catch {
    // O erro permanece visível na própria sidebar com opção de nova tentativa.
  }
}

watch(isDesktopSidebarCollapsed, persistCollapsedPreference)
watch(
  () => route.fullPath,
  () => closeMobileNavigation(false),
)

onMounted(() => {
  window.addEventListener('keydown', handleEscape)
  window.addEventListener('keydown', handleFocusTrap)

  if (!navigation.initialized && !navigation.isLoading) {
    void reloadNavigation()
  }
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleEscape)
  window.removeEventListener('keydown', handleFocusTrap)

  if (isMobileNavigationOpen.value) document.body.style.overflow = previousBodyOverflow
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
      @toggle-navigation="toggleMobileNavigation"
    />

    <button
      v-if="isMobileNavigationOpen"
      class="fixed inset-0 z-40 bg-black/45 backdrop-blur-[2px] lg:hidden"
      type="button"
      aria-label="Fechar menu de navegação"
      @click="closeMobileNavigation()"
    ></button>

    <AppSidebar
      class="col-start-1 row-start-2"
      :collapsed="isDesktopSidebarCollapsed"
      :error-message="navigation.errorMessage"
      :is-loading="navigation.isLoading"
      :items="navigation.items"
      :mobile-open="isMobileNavigationOpen"
      @close-mobile="closeMobileNavigation()"
      @expand-desktop="isDesktopSidebarCollapsed = false"
      @retry="reloadNavigation"
      @toggle-desktop="isDesktopSidebarCollapsed = !isDesktopSidebarCollapsed"
    />

    <main
      id="conteudo-principal"
      class="col-start-1 row-start-2 min-w-0 lg:col-start-2"
      tabindex="-1"
    >
      <slot />
    </main>
  </div>
</template>
