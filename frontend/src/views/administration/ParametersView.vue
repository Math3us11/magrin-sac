<script setup lang="ts">
import { Icon } from '@iconify/vue'
import type { GenericObject } from 'vee-validate'
import { number, object, string } from 'yup'
import { onMounted, ref } from 'vue'

import AppButton from '@/components/basic/AppButton.vue'
import AppForm from '@/components/basic/AppForm.vue'
import AppInput from '@/components/basic/AppInput.vue'
import AppTextarea from '@/components/basic/AppTextarea.vue'
import { INSTITUTION_TIME_ZONE } from '@/config/date-time'
import { useDocumentTitle } from '@/composables/useDocumentTitle'
import { settingsIcon, triangleAlertIcon } from '@/icons'
import { ApiError } from '@/services/api'
import { listSystemParameters, updateSystemParameter } from '@/services/system-parameters'
import { useLoadingStore } from '@/stores/loading'
import type { SystemParameter, SystemParameterName } from '@/types/system-parameter'

useDocumentTitle('Parâmetros | Administração | Sistema de Agendamento')

const loadingStore = useLoadingStore()
const parameters = ref<SystemParameter[]>([])
const loading = ref(true)
const loadError = ref('')
const savingName = ref<SystemParameterName | null>(null)
const saveErrors = ref<Partial<Record<SystemParameterName, string>>>({})
const formVersions = ref<Partial<Record<SystemParameterName, number>>>({})

function formatMinutes(minutes: number): string {
  if (minutes === 0) return 'sem antecedência'
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  const parts = [
    ...(hours ? [`${hours} ${hours === 1 ? 'hora' : 'horas'}`] : []),
    ...(remainder ? [`${remainder} ${remainder === 1 ? 'minuto' : 'minutos'}`] : []),
  ]
  return parts.join(' e ')
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: INSTITUTION_TIME_ZONE,
  }).format(new Date(value))
}

function validationSchema(parameter: SystemParameter) {
  const rangeMessage = `Informe um número inteiro entre ${parameter.min} e ${parameter.max}.`
  return object({
    reason: string()
      .trim()
      .required('Informe o motivo da alteração.')
      .max(500, 'O motivo deve ter no máximo 500 caracteres.'),
    value: number()
      .typeError(rangeMessage)
      .required(rangeMessage)
      .integer(rangeMessage)
      .min(parameter.min, rangeMessage)
      .max(parameter.max, rangeMessage)
      .notOneOf([parameter.value], 'O novo valor é igual ao valor atual.'),
  })
}

async function loadParameters() {
  const loadingId = loadingStore.start({ description: 'Carregando parâmetros...' })
  loading.value = true
  loadError.value = ''

  try {
    parameters.value = (await listSystemParameters()).parameters
  } catch (error) {
    loadError.value =
      error instanceof ApiError
        ? error.message
        : 'Não foi possível carregar os parâmetros. Tente novamente.'
  } finally {
    loading.value = false
    loadingStore.stop(loadingId)
  }
}

async function saveParameter(parameter: SystemParameter, values: GenericObject) {
  if (savingName.value) return

  savingName.value = parameter.name
  saveErrors.value = { ...saveErrors.value, [parameter.name]: '' }

  try {
    const response = await updateSystemParameter(parameter.name, {
      reason: String(values.reason).trim(),
      value: Number(values.value),
    })
    parameters.value = parameters.value.map((item) =>
      item.name === parameter.name ? response.parameter : item,
    )
    // Recria o formulário para limpar o motivo e partir do novo valor salvo.
    formVersions.value = {
      ...formVersions.value,
      [parameter.name]: (formVersions.value[parameter.name] ?? 0) + 1,
    }
  } catch (error) {
    saveErrors.value = {
      ...saveErrors.value,
      [parameter.name]:
        error instanceof ApiError
          ? error.message
          : 'Não foi possível salvar o parâmetro. Tente novamente.',
    }
  } finally {
    savingName.value = null
  }
}

onMounted(() => void loadParameters())
</script>

<template>
  <section class="relative isolate min-h-full overflow-hidden">
    <div
      class="institutional-glow pointer-events-none absolute inset-x-0 top-0 -z-10 h-80"
      aria-hidden="true"
    ></div>

    <div class="mx-auto w-full max-w-4xl px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
      <header class="max-w-3xl">
        <p class="text-xs font-bold uppercase tracking-[0.16em] text-brand-primary">
          Administração
        </p>
        <h1 class="mt-3 text-3xl font-bold tracking-tight text-content sm:text-4xl">Parâmetros</h1>
        <p class="mt-4 text-base leading-7 text-content-muted">
          Ajuste regras institucionais sem alterar o código. Cada alteração exige um motivo e fica
          registrada na auditoria.
        </p>
      </header>

      <div
        v-if="loadError"
        class="mt-8 flex flex-col gap-3 rounded-2xl border border-status-danger bg-status-danger-soft p-5 text-sm text-content sm:flex-row sm:items-center sm:justify-between"
        role="alert"
      >
        <span>{{ loadError }}</span>
        <AppButton variant="secondary" @click="loadParameters">Tentar novamente</AppButton>
      </div>

      <p
        v-else-if="!loading && !parameters.length"
        class="mt-8 rounded-2xl border border-dashed border-outline p-6 text-center text-sm text-content-muted"
      >
        Nenhum parâmetro configurável foi encontrado.
      </p>

      <ul v-else class="mt-8 space-y-6">
        <li
          v-for="parameter in parameters"
          :key="parameter.name"
          class="rounded-3xl border border-outline bg-surface p-6 sm:p-8"
          :data-testid="`parameter-${parameter.name}`"
        >
          <div class="flex items-start gap-4">
            <span
              class="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-primary-soft text-brand-primary"
              aria-hidden="true"
            >
              <Icon class="h-5 w-5" :icon="settingsIcon" />
            </span>
            <div class="min-w-0">
              <h2 class="text-xl font-bold text-content">{{ parameter.label }}</h2>
              <p class="mt-2 text-sm leading-6 text-content-muted">{{ parameter.description }}</p>
            </div>
          </div>

          <dl class="mt-6 grid gap-4 sm:grid-cols-2">
            <div class="rounded-xl border border-outline bg-surface-subtle p-4">
              <dt class="text-xs font-bold uppercase tracking-[0.12em] text-content-muted">
                Valor em uso
              </dt>
              <dd class="mt-2 font-semibold text-content" data-testid="parameter-current-value">
                {{ parameter.value }} minutos ({{ formatMinutes(parameter.value) }})
              </dd>
            </div>
            <div class="rounded-xl border border-outline bg-surface-subtle p-4">
              <dt class="text-xs font-bold uppercase tracking-[0.12em] text-content-muted">
                Última alteração
              </dt>
              <dd class="mt-2 text-sm text-content">
                <template v-if="parameter.updatedAt">
                  {{ formatDateTime(parameter.updatedAt) }}
                  <span v-if="parameter.updatedBy" class="block text-content-muted">
                    por {{ parameter.updatedBy.name }}
                  </span>
                </template>
                <template v-else>Nunca alterado pela interface.</template>
              </dd>
            </div>
          </dl>

          <p
            v-if="parameter.usingFallback"
            class="mt-4 flex items-start gap-3 rounded-xl border border-status-warning bg-status-warning-soft p-4 text-sm leading-6 text-content"
            role="status"
          >
            <Icon
              class="mt-0.5 h-5 w-5 shrink-0 text-status-warning"
              :icon="triangleAlertIcon"
              aria-hidden="true"
            />
            O valor salvo está ausente ou inválido. O sistema usa o valor aprovado de
            {{ parameter.fallback }} minutos até uma nova definição.
          </p>

          <AppForm
            :key="`${parameter.name}-${formVersions[parameter.name] ?? 0}`"
            class="mt-6 space-y-5 border-t border-outline pt-6"
            :initial-values="{ reason: '', value: parameter.value }"
            :validation-schema="validationSchema(parameter)"
            @submit="(values) => saveParameter(parameter, values)"
          >
            <div class="max-w-xs">
              <AppInput
                :help-text="`Entre ${parameter.min} e ${parameter.max} minutos.`"
                inputmode="numeric"
                label="Novo valor (minutos)"
                name="value"
                required
                type="number"
              />
            </div>
            <AppTextarea
              label="Motivo da alteração"
              :maxlength="500"
              name="reason"
              placeholder="Ex.: decisão da coordenação registrada em ata"
              required
              :rows="3"
            />
            <p
              v-if="saveErrors[parameter.name]"
              class="rounded-xl bg-status-danger-soft px-4 py-3 text-sm font-medium text-status-danger"
              role="alert"
            >
              {{ saveErrors[parameter.name] }}
            </p>
            <AppButton
              :data-testid="`save-parameter-${parameter.name}`"
              :loading="savingName === parameter.name"
              loading-label="Salvando..."
              type="submit"
            >
              Salvar alteração
            </AppButton>
          </AppForm>
        </li>
      </ul>
    </div>
  </section>
</template>
