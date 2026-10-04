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

  function hasPermission(code: string): boolean {
    return permissions.value.includes(code)
  }

  async function load(force = false): Promise<void> {
    if ((initialized.value && !force) || isLoading.value) return

    isLoading.value = true
    errorMessage.value = ''

    try {
      const response = await getCurrentNavigation()
      items.value = response.items
      permissions.value = response.permissions
      initialized.value = true
    } catch (error) {
      initialized.value = false
      errorMessage.value =
        error instanceof ApiError
          ? error.message
          : 'Não foi possível carregar a navegação. Tente novamente.'
      throw error
    } finally {
      isLoading.value = false
    }
  }

  function reset() {
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
