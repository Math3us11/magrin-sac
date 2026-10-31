<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { computed, nextTick, ref, useId, watch } from 'vue'
import { useRouter } from 'vue-router'
import type { FormActions, GenericObject } from 'vee-validate'

import AppButton from '@/components/basic/AppButton.vue'
import AppForm from '@/components/basic/AppForm.vue'
import AppInput from '@/components/basic/AppInput.vue'
import { circleAlertIcon, lockKeyholeIcon, logOutIcon } from '@/icons'
import { ApiError } from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import { useSessionLockStore } from '@/stores/session-lock'
import {
  sessionUnlockValidationSchema,
  type SessionUnlockFormValues,
} from '@/validations/auth.schema'

const auth = useAuthStore()
const lock = useSessionLockStore()
const router = useRouter()
const titleId = `session-lock-title-${useId()}`
const descriptionId = `session-lock-description-${useId()}`
const panel = ref<HTMLElement | null>(null)
const errorMessage = ref('')
const signingOut = ref(false)

const description = computed(() =>
  lock.reason === 'idle'
    ? `Por segurança, a tela foi bloqueada após ${lock.idleTimeoutMinutes} minutos sem uso.`
    : 'Sua sessão expirou.',
)

async function submitUnlock(values: GenericObject, actions: FormActions<GenericObject>) {
  const { password } = values as SessionUnlockFormValues
  errorMessage.value = ''

  try {
    await lock.unlock(password)
  } catch (error) {
    errorMessage.value =
      error instanceof ApiError
        ? error.message
        : 'Não foi possível desbloquear. Tente novamente em instantes.'
  } finally {
    actions.setFieldValue('password', '', false)
  }
}

async function signOut() {
  signingOut.value = true
  try {
    await lock.signOut()
    await router.replace({ name: 'login' })
  } finally {
    signingOut.value = false
  }
}

// O restante da página fica inerte enquanto bloqueada; o Tab circula só dentro do painel.
function keepFocusInside(event: KeyboardEvent) {
  if (event.key !== 'Tab' || !panel.value) return

  const focusable = Array.from(
    panel.value.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled])'),
  )
  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  if (!first || !last) return

  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}

watch(
  () => lock.locked,
  async (isLocked) => {
    if (!isLocked) return
    errorMessage.value = ''
    await nextTick()
    panel.value?.querySelector<HTMLInputElement>('input[name="password"]')?.focus()
  },
)
</script>

<template>
  <Teleport to="body">
    <div
      v-if="lock.locked && lock.lockedUser"
      class="fixed inset-0 z-[200] flex items-center justify-center overflow-y-auto bg-canvas p-4"
      data-testid="session-lock"
    >
      <section
        ref="panel"
        class="surface-card w-full max-w-md rounded-3xl border border-outline bg-surface p-6 sm:p-8"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="titleId"
        :aria-describedby="descriptionId"
        @keydown="keepFocusInside"
      >
        <span
          class="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-primary-soft text-brand-primary"
          aria-hidden="true"
        >
          <Icon class="h-6 w-6" :icon="lockKeyholeIcon" />
        </span>
        <h2 :id="titleId" class="mt-5 text-2xl font-bold text-content">Sessão bloqueada</h2>
        <p :id="descriptionId" class="mt-2 text-sm leading-6 text-content-muted">
          {{ description }} Confirme sua senha para continuar de onde parou.
        </p>

        <div class="mt-5 rounded-2xl bg-surface-subtle px-4 py-3">
          <p class="font-bold text-content">{{ lock.lockedUser.name }}</p>
          <p class="text-sm text-content-muted">{{ lock.lockedUser.email }}</p>
        </div>

        <AppForm
          class="mt-5 space-y-4"
          data-testid="session-unlock-form"
          :validation-schema="sessionUnlockValidationSchema"
          @invalid="errorMessage = ''"
          @submit="submitUnlock"
        >
          <!-- Campo oculto para gerenciadores de senha associarem a credencial à conta certa. -->
          <input
            autocomplete="username"
            class="hidden"
            name="username"
            readonly
            tabindex="-1"
            :value="lock.lockedUser.email"
          />
          <AppInput
            autocomplete="current-password"
            label="Senha"
            :maxlength="128"
            name="password"
            placeholder="Digite sua senha"
            required
            revealable
            type="password"
          >
            <template #prefix>
              <Icon class="h-5 w-5" :icon="lockKeyholeIcon" />
            </template>
          </AppInput>

          <div
            v-if="errorMessage"
            class="flex gap-3 rounded-xl border border-status-danger bg-status-danger-soft px-4 py-3 text-sm leading-6 text-content"
            data-testid="session-unlock-error"
            role="alert"
          >
            <Icon
              class="mt-0.5 h-5 w-5 shrink-0 text-status-danger"
              :icon="circleAlertIcon"
              aria-hidden="true"
            />
            <span>{{ errorMessage }}</span>
          </div>

          <AppButton block type="submit" :loading="auth.isSubmitting" loading-label="Validando...">
            Desbloquear
          </AppButton>
        </AppForm>

        <button
          class="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-content-muted hover:bg-surface-subtle hover:text-brand-primary disabled:opacity-60"
          data-testid="session-lock-sign-out"
          :disabled="signingOut"
          type="button"
          @click="signOut"
        >
          <Icon class="h-4 w-4" :icon="logOutIcon" aria-hidden="true" />
          Sair e entrar com outra conta
        </button>
      </section>
    </div>
  </Teleport>
</template>
