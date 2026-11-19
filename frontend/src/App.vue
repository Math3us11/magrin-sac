<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import { RouterView, useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'

import AppLoading from '@/components/basic/AppLoading.vue'
import AppNotify from '@/components/basic/AppNotify.vue'
import AppShell from '@/components/layout/AppShell.vue'
import SessionLockOverlay from '@/components/layout/SessionLockOverlay.vue'
import { setUnauthorizedHandler } from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import { useLoadingStore } from '@/stores/loading'
import { useSessionLockStore } from '@/stores/session-lock'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const sessionLock = useSessionLockStore()
const loadingStore = useLoadingStore()
// Até a primeira navegação ser resolvida a rota é a inicial vazia, sem `hideShell`.
// Montar o shell nesse momento carregaria o menu sem sessão e exibiria um aviso de 401
// a quem acabou de abrir o sistema, antes do redirecionamento para o login.
const routerReady = ref(false)
void router.isReady().then(
  () => (routerReady.value = true),
  () => (routerReady.value = true),
)
const {
  active: loadingActive,
  description: loadingDescription,
  icon: loadingIcon,
} = storeToRefs(loadingStore)
const showShell = computed(() => !route.meta.hideShell)

// Um 401 durante o uso abre a tela de bloqueio em vez do aviso genérico de sessão.
setUnauthorizedHandler((path) => sessionLock.handleUnauthorized(path))

// O monitor de ociosidade só acompanha sessões completas; o primeiro acesso ainda troca a senha.
watch(
  () => auth.isAuthenticated && !auth.requiresPasswordChange,
  (hasSession) => {
    if (hasSession) sessionLock.start()
    else if (!sessionLock.locked) sessionLock.stop()
  },
  { immediate: true },
)

onUnmounted(() => {
  setUnauthorizedHandler(null)
  sessionLock.stop()
})
</script>

<template>
  <div class="min-h-screen bg-canvas text-content">
    <div v-if="routerReady" :inert="sessionLock.locked">
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

      <main v-else id="conteudo-principal" class="min-h-screen" tabindex="-1">
        <RouterView />
      </main>
    </div>

    <SessionLockOverlay />
    <AppNotify />
    <AppLoading :active="loadingActive" :description="loadingDescription" :icon="loadingIcon" />
  </div>
</template>
