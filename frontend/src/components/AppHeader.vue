<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'

import { useTheme } from '@/composables/useTheme'
import { loaderCircleIcon, logOutIcon, moonIcon, sunIcon } from '@/icons'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()
const isLeaving = ref(false)

const { isDark, toggleTheme } = useTheme()

const logoSource = computed(() => (isDark.value ? '/logo_branca.png' : '/logo_extensa.png'))
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
  isLeaving.value = true

  try {
    await auth.logout()
  } catch {
    // A sessão local é encerrada mesmo quando o backend estiver indisponível.
  } finally {
    await router.replace({ name: 'login' })
    isLeaving.value = false
  }
}
</script>

<template>
  <header class="border-b border-outline bg-surface">
    <div class="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-3 sm:px-8">
      <div class="flex min-w-0 items-center gap-4">
        <div class="flex h-12 w-28 shrink-0 items-center" aria-hidden="true">
          <img
            :class="isDark ? 'h-10' : 'h-11'"
            class="max-h-full max-w-full object-contain object-left"
            :src="logoSource"
            alt=""
          />
        </div>

        <div class="min-w-0 border-l border-outline pl-4">
          <p
            class="truncate text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-brand-primary sm:text-xs"
          >
            Ciência da Computação
          </p>
          <p class="mt-0.5 truncate text-sm font-semibold text-content sm:text-base">
            Sistema de Agendamento
          </p>
        </div>
      </div>

      <div class="flex shrink-0 items-center gap-2 sm:gap-3">
        <button
          class="inline-flex h-10 w-10 items-center justify-center rounded-full border border-outline bg-surface-subtle text-content hover:border-brand-primary hover:text-brand-primary"
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
            class="inline-flex h-10 w-10 items-center justify-center rounded-full bg-brand-primary-soft text-sm font-bold text-brand-primary"
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
          class="inline-flex h-10 items-center justify-center rounded-full border border-outline px-3 text-sm font-semibold text-content-muted hover:border-brand-primary hover:text-brand-primary disabled:cursor-wait disabled:opacity-60"
          type="button"
          :disabled="isLeaving"
          @click="leaveSystem"
        >
          <Icon
            class="mr-2 h-4 w-4"
            :class="{ 'animate-spin': isLeaving }"
            :icon="isLeaving ? loaderCircleIcon : logOutIcon"
            aria-hidden="true"
          />
          {{ isLeaving ? 'Saindo...' : 'Sair' }}
        </button>
      </div>
    </div>
  </header>
</template>
