<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { FormActions, GenericObject } from 'vee-validate'

import AppButton from '@/components/basic/AppButton.vue'
import AppForm from '@/components/basic/AppForm.vue'
import AppInput from '@/components/basic/AppInput.vue'
import { useDocumentTitle } from '@/composables/useDocumentTitle'
import { useTheme } from '@/composables/useTheme'
import {
  arrowRightIcon,
  calendarCheckIcon,
  chartCombinedIcon,
  circleAlertIcon,
  historyIcon,
  infoIcon,
  lockKeyholeIcon,
  mailIcon,
  moonIcon,
  sunIcon,
} from '@/icons'
import { ApiError } from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import { loginValidationSchema, type LoginFormValues } from '@/validations/auth.schema'

useDocumentTitle('Entrar | Sistema de Agendamento')

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const { isDark, toggleTheme } = useTheme()

const errorMessage = ref('')
const whiteLogoSource = '/logo_branca.png'
const extendedLogoSource = '/logo_extensa.png'

const themeButtonLabel = computed(() => (isDark.value ? 'Usar tema claro' : 'Usar tema escuro'))
const systemUnavailable = computed(() => route.query.unavailable === '1')

function redirectAfterLogin(): string {
  const redirect = route.query.redirect
  return typeof redirect === 'string' && redirect.startsWith('/') && !redirect.startsWith('//')
    ? redirect
    : '/'
}

async function submitLogin(values: GenericObject, actions: FormActions<GenericObject>) {
  const { email, password } = values as LoginFormValues
  errorMessage.value = ''

  try {
    await auth.login({
      email,
      password,
    })
    await router.replace(redirectAfterLogin())
  } catch (error) {
    errorMessage.value =
      error instanceof ApiError
        ? error.message
        : 'Não foi possível entrar. Tente novamente em instantes.'
    actions.setFieldValue('password', '', false)
  }
}
</script>

<template>
  <section
    class="grid min-h-screen grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1.08fr)_minmax(28rem,0.92fr)]"
  >
    <aside
      class="auth-brand-panel relative isolate flex min-h-72 min-w-0 overflow-hidden px-6 py-7 text-white sm:px-10 lg:min-h-screen lg:px-14 lg:py-12 xl:px-20"
    >
      <div class="auth-grid pointer-events-none absolute inset-0 -z-20" aria-hidden="true"></div>
      <div class="auth-orbit auth-orbit-primary" aria-hidden="true"></div>
      <div class="auth-orbit auth-orbit-secondary" aria-hidden="true"></div>

      <div class="flex w-full flex-col">
        <div class="flex items-center justify-between gap-6">
          <img class="h-14 w-auto object-contain sm:h-16" :src="whiteLogoSource" alt="Afya" />
          <span
            class="shrink-0 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-white/90 backdrop-blur-sm"
          >
            Ambiente interno
          </span>
        </div>

        <div class="my-auto max-w-2xl py-12 lg:py-20">
          <p
            class="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.24em] text-white/70"
          >
            <span class="h-px w-10 bg-white/50" aria-hidden="true"></span>
            Experiência universitária
          </p>

          <h1
            class="mt-6 text-4xl font-semibold leading-[1.05] tracking-[-0.045em] sm:text-6xl xl:text-7xl"
          >
            Organizar o cuidado<br />também é <span class="auth-emphasis">cuidar.</span>
          </h1>

          <p class="mt-6 max-w-xl text-base leading-7 text-white/75 sm:text-lg lg:mt-8">
            Uma experiência simples para aproximar alunos e coordenação, transformar horários em
            encontros e acompanhar cada atendimento com clareza.
          </p>

          <div class="auth-feature-flow mt-10 hidden grid-cols-3 sm:grid lg:mt-14">
            <div class="auth-feature-item">
              <span class="auth-feature-marker" aria-hidden="true">
                <Icon class="h-5 w-5" :icon="calendarCheckIcon" />
              </span>
              <span class="auth-feature-index">01</span>
              <p class="auth-feature-title">Agenda segura</p>
              <p class="auth-feature-description">Horários bem organizados</p>
            </div>
            <div class="auth-feature-item">
              <span class="auth-feature-marker" aria-hidden="true">
                <Icon class="h-5 w-5" :icon="historyIcon" />
              </span>
              <span class="auth-feature-index">02</span>
              <p class="auth-feature-title">Histórico confiável</p>
              <p class="auth-feature-description">Registros sempre preservados</p>
            </div>
            <div class="auth-feature-item">
              <span class="auth-feature-marker" aria-hidden="true">
                <Icon class="h-5 w-5" :icon="chartCombinedIcon" />
              </span>
              <span class="auth-feature-index">03</span>
              <p class="auth-feature-title">Gestão clara</p>
              <p class="auth-feature-description">Informação para decidir melhor</p>
            </div>
          </div>
        </div>

        <div class="flex items-end justify-between gap-6 text-xs text-white/60">
          <p>Sistema de Agendamento da Coordenação</p>
          <p class="hidden text-right sm:block">Tecnologia a serviço de boas experiências.</p>
        </div>
      </div>
    </aside>

    <div
      class="relative flex min-h-[42rem] min-w-0 items-center bg-canvas px-5 py-20 sm:px-10 lg:px-14 xl:px-20"
    >
      <button
        class="absolute right-5 top-5 inline-flex h-11 w-11 items-center justify-center rounded-full border border-outline bg-surface text-content-muted shadow-sm hover:border-brand-primary hover:text-brand-primary sm:right-8 sm:top-8"
        type="button"
        :aria-label="themeButtonLabel"
        :title="themeButtonLabel"
        :aria-pressed="isDark"
        @click="toggleTheme"
      >
        <Icon class="h-5 w-5" :icon="isDark ? sunIcon : moonIcon" aria-hidden="true" />
      </button>

      <div class="mx-auto w-full max-w-md">
        <img
          class="mb-10 h-12 w-auto object-contain object-left lg:hidden"
          :src="extendedLogoSource"
          alt="Afya"
        />

        <p class="text-xs font-bold uppercase tracking-[0.2em] text-brand-primary">
          Portal administrativo
        </p>
        <h2 class="mt-4 text-3xl font-bold tracking-[-0.035em] text-content sm:text-4xl">
          Bem-vindo de volta.
        </h2>
        <p class="mt-3 leading-7 text-content-muted">
          Entre com suas credenciais institucionais para acessar a gestão de atendimentos.
        </p>

        <div
          v-if="systemUnavailable"
          class="mt-6 rounded-xl border border-status-warning bg-status-warning-soft px-4 py-3 text-sm leading-6 text-content"
          role="status"
        >
          Não foi possível confirmar sua sessão anterior. Você ainda pode tentar entrar novamente.
        </div>

        <AppForm
          class="mt-9 space-y-5"
          :validation-schema="loginValidationSchema"
          @submit="submitLogin"
        >
          <AppInput
            id="email"
            autocomplete="username"
            inputmode="email"
            label="E-mail"
            :maxlength="254"
            name="email"
            placeholder="seu.nome@instituicao.edu.br"
            required
            type="email"
          >
            <template #prefix>
              <Icon class="h-5 w-5" :icon="mailIcon" />
            </template>
          </AppInput>

          <AppInput
            id="password"
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
            data-testid="login-error"
            class="flex gap-3 rounded-xl border border-status-danger bg-status-danger-soft px-4 py-3 text-sm leading-6 text-content"
            role="alert"
          >
            <Icon
              class="mt-0.5 h-5 w-5 shrink-0 text-status-danger"
              :icon="circleAlertIcon"
              aria-hidden="true"
            />
            <span>{{ errorMessage }}</span>
          </div>

          <AppButton
            block
            type="submit"
            :loading="auth.isSubmitting"
            loading-label="Validando acesso..."
          >
            Entrar no sistema
            <template #icon>
              <Icon class="h-4 w-4" :icon="arrowRightIcon" aria-hidden="true" />
            </template>
          </AppButton>
        </AppForm>

        <div class="mt-8 border-t border-outline pt-6">
          <div class="flex items-start gap-3">
            <span
              class="mt-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-secondary-soft text-brand-secondary"
              aria-hidden="true"
            >
              <Icon class="h-4 w-4" :icon="infoIcon" />
            </span>
            <p class="text-sm leading-6 text-content-muted">
              Contas administrativas e docentes são criadas internamente. O cadastro de alunos será
              disponibilizado após a definição da validação institucional.
            </p>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
