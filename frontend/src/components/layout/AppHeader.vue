<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import AppConfirmDialog from '@/components/basic/AppConfirmDialog.vue'
import { useTheme } from '@/composables/useTheme'
import { logOutIcon, menuIcon, moonIcon, sunIcon } from '@/icons'
import { useAuthStore } from '@/stores/auth'
import { useNavigationStore } from '@/stores/navigation'

defineProps<{
  mobileNavigationOpen: boolean
}>()

const emit = defineEmits<{
  toggleNavigation: []
}>()

const auth = useAuthStore()
const navigation = useNavigationStore()
const route = useRoute()
const router = useRouter()
const isLeaving = ref(false)
const isLogoutDialogOpen = ref(false)
const { isDark, toggleTheme } = useTheme()

const headerLogoSource = computed(() => (isDark.value ? '/logo_branca.png' : '/logo_vermelha.png'))
const pageTitle = computed(() => route.meta.title ?? 'Sistema de Agendamento')
const themeButtonLabel = computed(() => (isDark.value ? 'Usar tema claro' : 'Usar tema escuro'))
const userInitials = computed(() =>
  auth.user?.name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase(),
)
const userTypeLabel = computed(() => {
  if (auth.user?.userType === 'administrador') return 'Administrador'
  if (auth.user?.userType === 'professor') return 'Professor'
  return 'Aluno'
})

async function leaveSystem() {
  if (isLeaving.value) return

  isLeaving.value = true

  try {
    await auth.logout()
  } catch {
    // A sessão local é encerrada mesmo quando o backend estiver indisponível.
  } finally {
    navigation.reset()
    isLogoutDialogOpen.value = false

    try {
      await router.replace({ name: 'login' })
    } finally {
      isLeaving.value = false
    }
  }
}
</script>

<template>
  <header
    class="sticky top-0 z-30 border-b border-outline bg-surface/95 shadow-[0_1px_16px_var(--theme-shadow)] backdrop-blur"
  >
    <div class="flex h-18 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
      <div class="flex min-w-0 items-center gap-3">
        <button
          class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-outline bg-surface-subtle text-content hover:border-brand-primary hover:text-brand-primary lg:hidden"
          type="button"
          aria-controls="app-sidebar"
          :aria-expanded="mobileNavigationOpen"
          aria-label="Abrir menu de navegação"
          title="Abrir menu de navegação"
          @click="emit('toggleNavigation')"
        >
          <Icon class="h-5 w-5" :icon="menuIcon" aria-hidden="true" />
        </button>

        <img
          class="h-9 w-9 shrink-0 object-contain sm:h-10 sm:w-10"
          :src="headerLogoSource"
          alt="Afya"
        />

        <div class="min-w-0">
          <p
            class="truncate text-[0.65rem] font-bold uppercase tracking-[0.16em] text-brand-primary"
          >
            Sistema de Agendamento
          </p>
          <h1 class="mt-0.5 truncate text-base font-semibold text-content sm:text-lg">
            {{ pageTitle }}
          </h1>
        </div>
      </div>

      <div class="flex shrink-0 items-center gap-2 sm:gap-3">
        <button
          class="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-outline bg-surface-subtle text-content hover:border-brand-primary hover:text-brand-primary"
          type="button"
          :aria-label="themeButtonLabel"
          :title="themeButtonLabel"
          :aria-pressed="isDark"
          @click="toggleTheme"
        >
          <Icon class="h-5 w-5" :icon="isDark ? sunIcon : moonIcon" aria-hidden="true" />
        </button>

        <div
          v-if="auth.user"
          class="hidden items-center gap-3 border-l border-outline pl-3 md:flex"
        >
          <span
            class="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-primary-soft text-sm font-bold text-brand-primary"
            aria-hidden="true"
          >
            {{ userInitials }}
          </span>
          <div class="max-w-40 leading-tight">
            <p class="truncate text-sm font-semibold text-content">{{ auth.user.name }}</p>
            <p class="mt-1 text-xs text-content-muted">{{ userTypeLabel }}</p>
          </div>
        </div>

        <button
          data-testid="logout-trigger"
          class="inline-flex h-10 items-center justify-center rounded-xl border border-outline px-3 text-sm font-semibold text-content-muted hover:border-brand-primary hover:text-brand-primary disabled:cursor-wait disabled:opacity-60"
          type="button"
          :disabled="isLeaving"
          @click="isLogoutDialogOpen = true"
        >
          <Icon class="h-4 w-4 sm:mr-2" :icon="logOutIcon" aria-hidden="true" />
          <span class="hidden sm:inline">Sair</span>
        </button>
      </div>
    </div>

    <AppConfirmDialog
      v-model:open="isLogoutDialogOpen"
      title="Deseja sair do sistema?"
      description="Sua sessão atual será encerrada e será necessário informar suas credenciais para entrar novamente."
      confirm-label="Sim, sair"
      loading-label="Saindo..."
      :loading="isLeaving"
      @confirm="leaveSystem"
    />
  </header>
</template>
