<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import AppButton from '@/components/basic/AppButton.vue'
import AppConfirmDialog from '@/components/basic/AppConfirmDialog.vue'
import AppTable from '@/components/basic/AppTable.vue'
import { useDocumentTitle } from '@/composables/useDocumentTitle'
import {
  bookOpenIcon,
  eyeIcon,
  eyeOffIcon,
  keyRoundIcon,
  lockKeyholeIcon,
  pencilIcon,
  trash2Icon,
  userPlusIcon,
} from '@/icons'
import { ApiError } from '@/services/api'
import { deleteUser, listUsers } from '@/services/users'
import { useAuthStore } from '@/stores/auth'
import { useLoadingStore } from '@/stores/loading'
import type { AppTableColumn, AppTableFilter, AppTableRecord } from '@/types/table'
import type { UserListItem } from '@/types/user'

const router = useRouter()
const auth = useAuthStore()
const loadingStore = useLoadingStore()

useDocumentTitle('Usuários | Sistema de Agendamento')

const initialFlow = [
  {
    description: 'Dados pessoais, contato e identificação da pessoa que receberá a conta.',
    icon: userPlusIcon,
    title: 'Dados do usuário',
  },
  {
    description: 'Perfil de aluno, professor ou administrador e credencial temporária.',
    icon: keyRoundIcon,
    title: 'Primeiro acesso',
  },
  {
    description: 'Cursos e matérias variam conforme o perfil acadêmico escolhido.',
    icon: bookOpenIcon,
    title: 'Vínculos acadêmicos',
  },
]

const columns: AppTableColumn[] = [
  { name: 'Nome', size: '22%', value: 'name' },
  { name: 'E-mail', size: '25%', value: 'email' },
  { name: 'Perfil', size: '14%', value: 'userType' },
  { name: 'Situação', size: '12%', value: 'isActive' },
  { name: 'Criado em', size: '17%', value: 'createdAt' },
  { name: 'Ações', size: 152, value: 'actions' },
]

const filters: AppTableFilter[] = [
  {
    label: 'Perfil',
    options: [
      { label: 'Administrador', value: 'administrador' },
      { label: 'Aluno', value: 'aluno' },
      { label: 'Professor', value: 'professor' },
    ],
    placeholder: 'Todos os perfis',
    value: 'userType',
  },
  {
    label: 'Situação',
    options: [
      { label: 'Ativos', value: 'true' },
      { label: 'Inativos', value: 'false' },
    ],
    placeholder: 'Todas as situações',
    value: 'isActive',
  },
]

const users = ref<UserListItem[]>([])
const totalUsers = ref(0)
const usersLoading = ref(true)
const usersError = ref('')
const search = ref('')
const appliedSearch = ref('')
const userTypeFilter = ref('')
const statusFilter = ref('')
const page = ref(1)
const pageSize = ref(20)
const userToDelete = ref<UserListItem | null>(null)
const deleteConfirmationPassword = ref('')
const deleteError = ref('')
const deletingUser = ref(false)
const showDeletePassword = ref(false)
const filterValues = computed(() => ({
  isActive: statusFilter.value,
  userType: userTypeFilter.value,
}))
const deleteDialogDescription = computed(() =>
  userToDelete.value
    ? `O usuário ${userToDelete.value.name} será removido da listagem e perderá o acesso. O histórico será preservado.`
    : '',
)
let requestSequence = 0

const userTypeLabels: Record<UserListItem['userType'], string> = {
  administrador: 'Administrador',
  aluno: 'Aluno',
  professor: 'Professor',
}

async function loadUsers() {
  const currentRequest = ++requestSequence
  const loadingId = loadingStore.start({ description: 'Carregando usuários...' })
  usersLoading.value = true
  usersError.value = ''

  try {
    const response = await listUsers({
      isActive: statusFilter.value === '' ? undefined : statusFilter.value === 'true',
      page: page.value,
      pageSize: pageSize.value,
      search: appliedSearch.value || undefined,
      userType: (userTypeFilter.value || undefined) as UserListItem['userType'] | undefined,
    })

    if (currentRequest !== requestSequence) return

    users.value = response.users
    totalUsers.value = response.total
    page.value = response.page
    pageSize.value = response.pageSize
  } catch (error) {
    if (currentRequest !== requestSequence) return

    users.value = []
    totalUsers.value = 0
    usersError.value =
      error instanceof ApiError
        ? error.message
        : 'Não foi possível carregar os usuários. Tente novamente.'
  } finally {
    loadingStore.stop(loadingId)
    if (currentRequest === requestSequence) usersLoading.value = false
  }
}

function updateSearch(value: string) {
  search.value = value
}

function submitSearch(value: string) {
  appliedSearch.value = value
  page.value = 1
  void loadUsers()
}

function updateFilter(name: string, value: string) {
  if (name === 'userType') userTypeFilter.value = value
  if (name === 'isActive') statusFilter.value = value
  page.value = 1
  void loadUsers()
}

function updatePage(value: number) {
  page.value = value
  void loadUsers()
}

function updatePageSize(value: number) {
  pageSize.value = value
  page.value = 1
  void loadUsers()
}

function openUser(action: 'edit' | 'view', record: AppTableRecord) {
  const user = record as UserListItem
  void router.push({
    name: action === 'edit' ? 'administration-users-edit' : 'administration-users-view',
    params: { userId: user.id },
  })
}

function recordName(record: AppTableRecord): string {
  return (record as UserListItem).name
}

function isCurrentUser(record: AppTableRecord): boolean {
  return (record as UserListItem).id === auth.user?.id
}

function requestUserDeletion(record: AppTableRecord) {
  if (isCurrentUser(record)) return

  userToDelete.value = record as UserListItem
  deleteConfirmationPassword.value = ''
  deleteError.value = ''
  showDeletePassword.value = false
}

function closeDeleteDialog() {
  if (deletingUser.value) return

  userToDelete.value = null
  deleteConfirmationPassword.value = ''
  deleteError.value = ''
  showDeletePassword.value = false
}

async function confirmUserDeletion() {
  if (deletingUser.value) return

  if (!userToDelete.value || !deleteConfirmationPassword.value) {
    deleteError.value = 'Informe sua senha para confirmar a exclusão.'
    return
  }

  deletingUser.value = true
  deleteError.value = ''
  const shouldReturnToPreviousPage = users.value.length === 1 && page.value > 1

  try {
    await deleteUser(userToDelete.value.id, deleteConfirmationPassword.value)
    deletingUser.value = false
    closeDeleteDialog()
    if (shouldReturnToPreviousPage) page.value -= 1
    await loadUsers()
  } catch (error) {
    deleteError.value =
      error instanceof ApiError
        ? error.message
        : 'Não foi possível excluir o usuário. Tente novamente.'
    deleteConfirmationPassword.value = ''
  } finally {
    deletingUser.value = false
  }
}

function formatUserType(value: unknown): string {
  return userTypeLabels[value as UserListItem['userType']] ?? String(value)
}

function formatCreatedAt(value: unknown): string {
  if (typeof value !== 'string') return '—'

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}

onMounted(() => {
  void loadUsers()
})

onBeforeUnmount(() => {
  requestSequence += 1
})

function startUserCreation() {
  void router.push({ name: 'administration-users-new' })
}
</script>

<template>
  <section class="relative isolate min-h-full overflow-hidden">
    <div
      class="institutional-glow pointer-events-none absolute inset-x-0 top-0 -z-10 h-80"
      aria-hidden="true"
    ></div>

    <div class="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
      <header class="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div class="max-w-3xl">
          <div class="flex flex-wrap items-center gap-2">
            <p class="text-xs font-bold uppercase tracking-[0.16em] text-brand-primary">
              Administração
            </p>
            <span
              class="rounded-full border border-outline bg-surface px-2.5 py-1 text-[0.68rem] font-bold uppercase tracking-[0.1em] text-content-muted"
            >
              Estrutura inicial
            </span>
          </div>
          <h1 class="mt-3 text-3xl font-bold tracking-tight text-content sm:text-4xl">
            Gerenciamento de usuários
          </h1>
          <p class="mt-4 text-base leading-7 text-content-muted">
            Crie contas institucionais e, nas próximas etapas, acompanhe os usuários cadastrados e
            suas situações de acesso.
          </p>
        </div>

        <AppButton data-testid="create-user-trigger" @click="startUserCreation">
          Cadastrar usuário
          <template #icon>
            <Icon class="h-5 w-5" :icon="userPlusIcon" aria-hidden="true" />
          </template>
        </AppButton>
      </header>

      <section class="mt-9" aria-labelledby="user-flow-title">
        <h2 id="user-flow-title" class="text-lg font-bold text-content">
          Estrutura do primeiro cadastro
        </h2>
        <div class="mt-4 grid gap-4 md:grid-cols-3">
          <article
            v-for="step in initialFlow"
            :key="step.title"
            class="rounded-2xl border border-outline bg-surface p-5"
          >
            <span
              class="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-brand-primary-soft text-brand-primary"
            >
              <Icon class="h-5 w-5" :icon="step.icon" aria-hidden="true" />
            </span>
            <h3 class="mt-5 font-bold text-content">{{ step.title }}</h3>
            <p class="mt-2 text-sm leading-6 text-content-muted">{{ step.description }}</p>
          </article>
        </div>
      </section>

      <AppTable
        class="mt-8"
        :columns="columns"
        empty-message="Nenhum usuário foi cadastrado ainda."
        :error="usersError"
        :filters="filters"
        :filter-values="filterValues"
        :loading="usersLoading"
        name="Usuários cadastrados"
        :page="page"
        :page-size="pageSize"
        pagination
        :records="users"
        :search="search"
        searchable
        search-placeholder="Buscar por nome ou e-mail"
        :total="totalUsers"
        @retry="loadUsers"
        @search="submitSearch"
        @update:filter="updateFilter"
        @update:page="updatePage"
        @update:page-size="updatePageSize"
        @update:search="updateSearch"
      >
        <template #cell-name="{ value }">
          <span class="font-semibold">{{ value }}</span>
        </template>

        <template #cell-userType="{ value }">
          <span
            class="inline-flex rounded-full bg-brand-secondary-soft px-2.5 py-1 text-xs font-semibold text-brand-secondary"
          >
            {{ formatUserType(value) }}
          </span>
        </template>

        <template #cell-isActive="{ value }">
          <span
            class="inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-semibold"
            :class="
              value === true
                ? 'bg-status-success-soft text-status-success'
                : 'bg-surface-subtle text-content-muted'
            "
          >
            <span class="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true"></span>
            {{ value === true ? 'Ativo' : 'Inativo' }}
          </span>
        </template>

        <template #cell-createdAt="{ value }">
          {{ formatCreatedAt(value) }}
        </template>

        <template #cell-actions="{ record }">
          <div class="flex items-center gap-1">
            <button
              class="inline-flex h-9 w-9 items-center justify-center rounded-lg text-content-muted transition hover:bg-brand-secondary-soft hover:text-brand-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus"
              type="button"
              :aria-label="`Visualizar ${recordName(record)}`"
              :title="`Visualizar ${recordName(record)}`"
              @click="openUser('view', record)"
            >
              <Icon class="h-4 w-4" :icon="eyeIcon" aria-hidden="true" />
            </button>
            <button
              class="inline-flex h-9 w-9 items-center justify-center rounded-lg text-content-muted transition hover:bg-brand-primary-soft hover:text-brand-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus"
              type="button"
              :aria-label="`Editar ${recordName(record)}`"
              :title="`Editar ${recordName(record)}`"
              @click="openUser('edit', record)"
            >
              <Icon class="h-4 w-4" :icon="pencilIcon" aria-hidden="true" />
            </button>
            <button
              class="inline-flex h-9 w-9 items-center justify-center rounded-lg text-content-muted transition hover:bg-status-danger-soft hover:text-status-danger focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-content-muted"
              type="button"
              :aria-label="
                isCurrentUser(record)
                  ? 'Não é possível excluir a própria conta'
                  : `Excluir ${recordName(record)}`
              "
              :title="
                isCurrentUser(record)
                  ? 'Não é possível excluir a própria conta'
                  : `Excluir ${recordName(record)}`
              "
              :disabled="isCurrentUser(record)"
              @click="requestUserDeletion(record)"
            >
              <Icon class="h-4 w-4" :icon="trash2Icon" aria-hidden="true" />
            </button>
          </div>
        </template>
      </AppTable>

      <AppConfirmDialog
        :open="userToDelete !== null"
        title="Excluir usuário?"
        :description="deleteDialogDescription"
        cancel-label="Cancelar"
        confirm-label="Excluir usuário"
        :confirm-disabled="deleteConfirmationPassword.length === 0"
        :loading="deletingUser"
        loading-label="Excluindo..."
        tone="danger"
        @cancel="closeDeleteDialog"
        @confirm="confirmUserDeletion"
        @update:open="closeDeleteDialog"
      >
        <label class="mb-2 block text-sm font-semibold text-content" for="delete-password">
          Sua senha
          <span class="text-status-danger" aria-hidden="true">*</span>
        </label>
        <div class="group relative">
          <span
            class="pointer-events-none absolute left-4 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center text-content-muted group-focus-within:text-brand-primary"
            aria-hidden="true"
          >
            <Icon class="h-5 w-5" :icon="lockKeyholeIcon" />
          </span>
          <input
            id="delete-password"
            v-model="deleteConfirmationPassword"
            class="app-input pl-12 pr-24"
            :class="{ 'app-input-error': deleteError }"
            :type="showDeletePassword ? 'text' : 'password'"
            name="deleteConfirmationPassword"
            autocomplete="current-password"
            maxlength="128"
            placeholder="Digite sua senha"
            required
            :aria-describedby="deleteError ? 'delete-password-error' : undefined"
            :aria-invalid="Boolean(deleteError)"
            data-confirm-dialog-autofocus
            @input="deleteError = ''"
            @keydown.enter.prevent="confirmUserDeletion"
          />
          <button
            class="absolute right-3 top-1/2 inline-flex h-9 min-w-9 -translate-y-1/2 items-center justify-center rounded-lg px-2 text-xs font-semibold text-content-muted hover:bg-surface-subtle hover:text-content"
            type="button"
            :aria-label="showDeletePassword ? 'Ocultar senha' : 'Mostrar senha'"
            :aria-pressed="showDeletePassword"
            :disabled="deletingUser"
            @click="showDeletePassword = !showDeletePassword"
          >
            <Icon
              class="h-5 w-5"
              :icon="showDeletePassword ? eyeOffIcon : eyeIcon"
              aria-hidden="true"
            />
          </button>
        </div>
        <p
          v-if="deleteError"
          id="delete-password-error"
          class="mt-2 text-sm font-medium text-status-danger"
          role="alert"
        >
          {{ deleteError }}
        </p>
        <p class="mt-3 text-xs leading-5 text-content-muted">
          Confirme com a senha da sua conta administrativa. Esta ação não apaga o histórico do
          usuário.
        </p>
      </AppConfirmDialog>
    </div>
  </section>
</template>
