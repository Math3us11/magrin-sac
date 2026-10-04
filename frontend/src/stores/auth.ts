import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import { ApiError } from '@/services/api'
import {
  completeFirstAccessPassword,
  createSession,
  deleteSession,
  getCurrentUser,
} from '@/services/auth'
import type { AuthenticatedUser, LoginCredentials } from '@/types/auth'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<AuthenticatedUser | null>(null)
  const initialized = ref(false)
  const isSubmitting = ref(false)

  const isAuthenticated = computed(() => user.value !== null)
  const requiresPasswordChange = computed(() => user.value?.mustChangePassword === true)

  async function initialize() {
    if (initialized.value) return

    try {
      user.value = await getCurrentUser()
    } catch (error) {
      user.value = null
      if (!(error instanceof ApiError) || (error.status !== 0 && error.status !== 401)) throw error
    } finally {
      initialized.value = true
    }
  }

  async function login(credentials: LoginCredentials) {
    isSubmitting.value = true

    try {
      const response = await createSession(credentials)
      user.value = response.user
      initialized.value = true
    } finally {
      isSubmitting.value = false
    }
  }

  async function completeFirstAccess(newPassword: string): Promise<string> {
    isSubmitting.value = true

    try {
      const response = await completeFirstAccessPassword(newPassword)
      user.value = null
      initialized.value = true
      return response.message
    } finally {
      isSubmitting.value = false
    }
  }

  async function logout() {
    try {
      await deleteSession()
    } finally {
      user.value = null
      initialized.value = true
    }
  }

  return {
    completeFirstAccess,
    initialize,
    initialized,
    isAuthenticated,
    isSubmitting,
    login,
    logout,
    requiresPasswordChange,
    user,
  }
})
