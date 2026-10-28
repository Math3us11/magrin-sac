import { ref } from 'vue'
import { defineStore } from 'pinia'

import { ApiError } from '@/services/api'
import { getCurrentNavigation } from '@/services/navigation'
import type { NavigationItem } from '@/types/navigation'

export const useNavigationStore = defineStore('navigation', () => {
  const items = ref<NavigationItem[]>([])
  const permissions = ref<string[]>([])
  const initialized = ref(false)
  const isLoading = ref(false)
  const errorMessage = ref('')
  // Chamadas simultâneas (guard do router e AppShell) aguardam a mesma requisição.
  let pendingLoad: Promise<void> | null = null
  // Invalida respostas que chegam depois de um reset, como no logout.
  let generation = 0

  function hasPermission(code: string): boolean {
    return permissions.value.includes(code)
  }

  function load(force = false): Promise<void> {
    if (pendingLoad) return pendingLoad
    if (initialized.value && !force) return Promise.resolve()

    const requestGeneration = generation
    isLoading.value = true
    errorMessage.value = ''

    pendingLoad = getCurrentNavigation()
      .then(
        (response) => {
          if (requestGeneration !== generation) return
          items.value = response.items
          permissions.value = response.permissions
          initialized.value = true
        },
        (error: unknown) => {
          if (requestGeneration !== generation) return
          initialized.value = false
          errorMessage.value =
            error instanceof ApiError
              ? error.message
              : 'Não foi possível carregar a navegação. Tente novamente.'
          throw error
        },
      )
      .finally(() => {
        if (requestGeneration !== generation) return
        isLoading.value = false
        pendingLoad = null
      })

    return pendingLoad
  }

  function reset() {
    generation += 1
    pendingLoad = null
    items.value = []
    permissions.value = []
    initialized.value = false
    isLoading.value = false
    errorMessage.value = ''
  }

  return {
    errorMessage,
    hasPermission,
    initialized,
    isLoading,
    items,
    load,
    permissions,
    reset,
  }
})
