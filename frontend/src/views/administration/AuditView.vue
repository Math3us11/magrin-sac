<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

import AppButton from '@/components/basic/AppButton.vue'
import AppSelect from '@/components/basic/AppSelect.vue'
import AppTable from '@/components/basic/AppTable.vue'
import { useDocumentTitle } from '@/composables/useDocumentTitle'
import { INSTITUTION_TIME_ZONE, getInstitutionDateTime } from '@/config/date-time'
import { ApiError } from '@/services/api'
import { listAuditLogs } from '@/services/audit'
import { useLoadingStore } from '@/stores/loading'
import type {
  AuditAction,
  AuditChange,
  AuditEntityType,
  AuditLogEntry,
  AuditValue,
} from '@/types/audit'
import type { AppTableColumn, AppTableRecord } from '@/types/table'

useDocumentTitle('Auditoria | Administração | Sistema de Agendamento')

const loadingStore = useLoadingStore()
const today = getInstitutionDateTime().date
const from = ref(`${today.slice(0, 8)}01`)
const to = ref(today)
const action = ref('')
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)
const entries = ref<AuditLogEntry[]>([])
const listLoading = ref(true)
const listError = ref('')
let listSequence = 0

const actionLabels: Record<AuditAction, string> = {
  'appointment.cancelled': 'Agendamento cancelado',
  'appointment.created': 'Agendamento criado',
  'availability.blocked': 'Disponibilidade bloqueada',
  'availability.created': 'Disponibilidade publicada',
  'availability.unblocked': 'Disponibilidade desbloqueada',
  'system_parameter.updated': 'Parâmetro alterado',
  'user.created': 'Usuário cadastrado',
  'user.deleted': 'Usuário excluído',
  'user.updated': 'Usuário alterado',
}
const entityLabels: Record<AuditEntityType, string> = {
  appointment: 'Agendamento',
  availability: 'Disponibilidade',
  system_parameter: 'Parâmetro',
  user: 'Usuário',
}
const fieldLabels: Record<string, string> = {
  availabilityId: 'Disponibilidade',
  birthDate: 'Data de nascimento',
  cpf: 'CPF',
  email: 'E-mail',
  endsAt: 'Término',
  isActive: 'Ativo',
  modalities: 'Modalidades',
  modality: 'Modalidade',
  name: 'Nome',
  phone: 'Telefone',
  protocol: 'Protocolo',
  registrationNumber: 'Matrícula',
  startsAt: 'Início',
  state: 'Estado',
  status: 'Situação',
  userType: 'Perfil',
  value: 'Valor',
}
const actionOptions = [
  { label: 'Todas as ações', value: '' },
  ...Object.entries(actionLabels)
    .map(([value, label]) => ({ label, value }))
    .sort((first, second) => first.label.localeCompare(second.label)),
]
const columns: AppTableColumn[] = [
  { name: 'Data e horário', size: 170, value: 'occurredAt' },
  { name: 'Ação', size: 210, value: 'action' },
  { name: 'Registro', size: 160, value: 'entity' },
  { name: 'Responsável', size: 180, value: 'actor' },
  { name: 'Alterações', value: 'changes' },
  { name: 'Motivo', size: 220, value: 'reason' },
]

type AuditTableRow = AuditLogEntry & { entity: string }

const rows = computed<AuditTableRow[]>(() =>
  entries.value.map((entry) => ({
    ...entry,
    entity: `${entityLabels[entry.entityType]} #${entry.entityId}`,
  })),
)

function entryFromRecord(record: AppTableRecord): AuditTableRow {
  return record as AuditTableRow
}

const ISO_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: INSTITUTION_TIME_ZONE,
  }).format(new Date(value))
}

function formatValue(value: AuditValue): string {
  if (value === null || value === '') return '—'
  if (typeof value === 'boolean') return value ? 'Sim' : 'Não'
  if (typeof value === 'string' && ISO_INSTANT.test(value)) return formatDateTime(value)
  return String(value)
}

function describeChanges(changes: Record<string, AuditChange>) {
  return Object.entries(changes).map(([field, change]) => ({
    field,
    label: fieldLabels[field] ?? field,
    text:
      'redacted' in change
        ? 'alterado (valor protegido)'
        : `${formatValue(change.from)} → ${formatValue(change.to)}`,
  }))
}

async function loadEntries() {
  const currentRequest = ++listSequence
  const loadingId = loadingStore.start({ description: 'Carregando auditoria...' })
  listLoading.value = true
  listError.value = ''

  try {
    const response = await listAuditLogs({
      action: (action.value || undefined) as AuditAction | undefined,
      from: from.value,
      page: page.value,
      pageSize: pageSize.value,
      to: to.value,
    })
    if (currentRequest !== listSequence) return

    entries.value = response.entries
    total.value = response.total
  } catch (error) {
    if (currentRequest !== listSequence) return
    entries.value = []
    total.value = 0
    listError.value =
      error instanceof ApiError
        ? error.message
        : 'Não foi possível carregar a auditoria. Tente novamente.'
  } finally {
    loadingStore.stop(loadingId)
    if (currentRequest === listSequence) listLoading.value = false
  }
}

function applyFilters() {
  page.value = 1
  void loadEntries()
}

function updatePage(value: number) {
  page.value = value
  void loadEntries()
}

function updatePageSize(value: number) {
  pageSize.value = value
  page.value = 1
  void loadEntries()
}

onMounted(() => void loadEntries())
onBeforeUnmount(() => {
  listSequence += 1
})
</script>

<template>
  <section class="relative isolate min-h-full overflow-hidden">
    <div
      class="institutional-glow pointer-events-none absolute inset-x-0 top-0 -z-10 h-80"
      aria-hidden="true"
    ></div>

    <div class="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
      <header class="max-w-3xl">
        <p class="text-xs font-bold uppercase tracking-[0.16em] text-brand-primary">
          Administração
        </p>
        <h1 class="mt-3 text-3xl font-bold tracking-tight text-content sm:text-4xl">Auditoria</h1>
        <p class="mt-4 text-base leading-7 text-content-muted">
          Consulte quem realizou cada operação relevante, quando e o que foi alterado. Dados
          pessoais sensíveis aparecem apenas como alterados, sem os valores.
        </p>
      </header>

      <section class="mt-8 rounded-3xl border border-outline bg-surface p-5 sm:p-6">
        <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1.4fr_auto] xl:items-end">
          <div>
            <label class="mb-2 block text-sm font-semibold text-content" for="audit-from">
              Data inicial
            </label>
            <input id="audit-from" v-model="from" class="app-input" type="date" />
          </div>
          <div>
            <label class="mb-2 block text-sm font-semibold text-content" for="audit-to">
              Data final
            </label>
            <input id="audit-to" v-model="to" class="app-input" type="date" />
          </div>
          <AppSelect
            v-model="action"
            label="Ação"
            name="auditActionFilter"
            :options="actionOptions"
          />
          <AppButton :loading="listLoading" loading-label="Filtrando..." @click="applyFilters">
            Filtrar
          </AppButton>
        </div>
        <p class="mt-3 text-xs text-content-muted">
          Períodos de até 62 dias, no horário de Porto Velho.
        </p>
      </section>

      <AppTable
        class="mt-6"
        :body-max-height="620"
        :body-min-height="280"
        :columns="columns"
        empty-message="Nenhuma operação foi registrada para os filtros escolhidos."
        :error="listError"
        :loading="listLoading"
        name="Operações registradas"
        :page="page"
        :page-size="pageSize"
        pagination
        :records="rows"
        :total="total"
        @retry="loadEntries"
        @update:page="updatePage"
        @update:page-size="updatePageSize"
      >
        <template #cell-occurredAt="{ record }">
          <span class="whitespace-nowrap font-semibold text-content">
            {{ formatDateTime(entryFromRecord(record).occurredAt) }}
          </span>
        </template>

        <template #cell-action="{ record }">
          <span class="font-semibold">{{ actionLabels[entryFromRecord(record).action] }}</span>
        </template>

        <template #cell-actor="{ record }">
          {{ entryFromRecord(record).actor?.name ?? 'Sistema' }}
        </template>

        <template #cell-changes="{ record }">
          <ul v-if="Object.keys(entryFromRecord(record).changes).length" class="space-y-1 text-sm">
            <li
              v-for="change in describeChanges(entryFromRecord(record).changes)"
              :key="change.field"
            >
              <strong class="text-content">{{ change.label }}:</strong>
              {{ change.text }}
            </li>
          </ul>
          <span v-else class="text-content-muted">—</span>
        </template>

        <template #cell-reason="{ value }">
          <span :class="value ? '' : 'text-content-muted'">{{ value || '—' }}</span>
        </template>
      </AppTable>
    </div>
  </section>
</template>
