<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { computed, onMounted, ref } from 'vue'
import { ErrorMessage, Field, type GenericObject } from 'vee-validate'
import { useRoute, useRouter } from 'vue-router'

import AppButton from '@/components/basic/AppButton.vue'
import AppForm from '@/components/basic/AppForm.vue'
import AppInput from '@/components/basic/AppInput.vue'
import AppMultiSelect from '@/components/basic/AppMultiSelect.vue'
import { useDocumentTitle } from '@/composables/useDocumentTitle'
import { arrowLeftIcon, eyeIcon, pencilIcon, shieldCheckIcon } from '@/icons'
import { ApiError } from '@/services/api'
import {
  getUser,
  getUserRegistrationOptions,
  getUserRegistrationSubjects,
  updateUser,
} from '@/services/users'
import { useLoadingStore } from '@/stores/loading'
import { useNotificationStore } from '@/stores/notification'
import type { UpdateUserPayload, UserDetails } from '@/types/user'
import type {
  AcademicPeriod,
  RegistrationCourse,
  RegistrationSubject,
} from '@/types/user-registration'
import { createUserDetailsValidationSchema } from '@/validations/user-registration.schema'

type UserDetailsMode = 'edit' | 'view'
type SetFieldValue = (field: string, value: unknown) => void

interface UserDetailsFormValues {
  accountStatus: 'active' | 'inactive'
  academicPeriodIds?: Array<string | undefined>
  birthDate: string
  courseIds?: Array<string | undefined>
  courseSubjectIds?: Array<string | undefined>
  cpf: string
  email: string
  name: string
  phone: string
  userType: UserDetails['userType']
}

interface CourseSubjectOption {
  courseId: string
  courseLabel: string
  subjectLabel: string
  value: string
}

const props = defineProps<{ mode: UserDetailsMode }>()
const route = useRoute()
const router = useRouter()
const loadingStore = useLoadingStore()
const notificationStore = useNotificationStore()

useDocumentTitle('Usuário | Sistema de Agendamento')

const user = ref<UserDetails | null>(null)
const courseCatalog = ref<RegistrationCourse[]>([])
const academicPeriodCatalog = ref<AcademicPeriod[]>([])
const registrationSubjects = ref<RegistrationSubject[]>([])
const selectedUserType = ref<UserDetails['userType']>('administrador')
const selectedCourseIds = ref<string[]>([])
const loadError = ref('')
const subjectsError = ref('')
const subjectsLoading = ref(false)
const isSaving = ref(false)
const saveError = ref('')
const formVersion = ref(0)
let subjectsRequestSequence = 0

const isEditing = computed(() => props.mode === 'edit')
const userId = computed(() => Number(route.params.userId))
const hasAcademicProfile = computed(() => selectedUserType.value !== 'administrador')
const validationSchema = computed(() => createUserDetailsValidationSchema(selectedUserType.value))
const courseSelectionLimit = computed(() => (selectedUserType.value === 'aluno' ? 1 : undefined))
const profileOptions = [
  {
    description: 'Vínculo acadêmico com um curso, período atual e matérias selecionadas.',
    label: 'Aluno',
    value: 'aluno',
  },
  {
    description: 'Pode possuir vínculos com vários cursos e matérias, sem período.',
    label: 'Professor',
    value: 'professor',
  },
  {
    description: 'Acesso privilegiado às rotinas internas de manutenção.',
    label: 'Administrador',
    value: 'administrador',
  },
] as const
const phoneMasks = ['(##) ####-####', '(##) #####-####']

const courseOptions = computed(() => {
  const options = new Map(
    courseCatalog.value.map(({ id, name }) => [String(id), { label: name, value: String(id) }]),
  )

  for (const course of user.value?.academic?.courses ?? []) {
    if (!options.has(String(course.id))) {
      options.set(String(course.id), { label: course.name, value: String(course.id) })
    }
  }

  return [...options.values()].sort((left, right) => left.label.localeCompare(right.label, 'pt-BR'))
})

const periodOptions = computed(() => {
  const options = new Map(
    academicPeriodCatalog.value.map(({ id, name }) => [
      String(id),
      { label: name, value: String(id) },
    ]),
  )
  const currentPeriod = user.value?.academic?.academicPeriod

  if (currentPeriod && !options.has(String(currentPeriod.id))) {
    options.set(String(currentPeriod.id), {
      label: currentPeriod.name,
      value: String(currentPeriod.id),
    })
  }

  return [...options.values()]
})

const courseSubjectOptions = computed<CourseSubjectOption[]>(() => {
  const options = new Map(
    registrationSubjects.value.map((subject) => [
      String(subject.courseSubjectId),
      {
        courseId: String(subject.courseId),
        courseLabel: subject.courseName,
        subjectLabel: subject.subjectName,
        value: String(subject.courseSubjectId),
      },
    ]),
  )

  for (const subject of user.value?.academic?.subjects ?? []) {
    if (
      selectedCourseIds.value.includes(String(subject.courseId)) &&
      !options.has(String(subject.courseSubjectId))
    ) {
      options.set(String(subject.courseSubjectId), {
        courseId: String(subject.courseId),
        courseLabel: subject.courseName,
        subjectLabel: subject.subjectName,
        value: String(subject.courseSubjectId),
      })
    }
  }

  return [...options.values()]
})

const subjectOptions = computed(() =>
  courseSubjectOptions.value.map((subject) => ({
    label:
      selectedCourseIds.value.length > 1
        ? `${subject.subjectLabel} · ${subject.courseLabel}`
        : subject.subjectLabel,
    value: subject.value,
  })),
)

const initialValues = computed<UserDetailsFormValues | undefined>(() => {
  if (!user.value) return undefined

  return {
    accountStatus: user.value.isActive ? 'active' : 'inactive',
    academicPeriodIds: user.value.academic?.academicPeriod
      ? [String(user.value.academic.academicPeriod.id)]
      : [],
    birthDate: user.value.birthDate ?? '',
    courseIds: user.value.academic?.courseIds.map(String) ?? [],
    courseSubjectIds: user.value.academic?.courseSubjectIds.map(String) ?? [],
    cpf: user.value.cpf,
    email: user.value.email,
    name: user.value.name,
    phone: user.value.phone ?? '',
    userType: user.value.userType,
  }
})

function requestErrorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}

function normalizedIds(values: Array<string | undefined> | undefined): number[] {
  return (values ?? []).filter((value): value is string => Boolean(value)).map(Number)
}

async function loadSubjects(courseIds: string[]) {
  const currentRequest = ++subjectsRequestSequence

  if (courseIds.length === 0) {
    registrationSubjects.value = []
    subjectsError.value = ''
    subjectsLoading.value = false
    return
  }

  subjectsLoading.value = true
  subjectsError.value = ''

  try {
    const response = await getUserRegistrationSubjects(courseIds.map(Number))
    if (currentRequest !== subjectsRequestSequence) return
    registrationSubjects.value = response.subjects
  } catch (error) {
    if (currentRequest !== subjectsRequestSequence) return
    registrationSubjects.value = []
    subjectsError.value = requestErrorMessage(
      error,
      'Não foi possível carregar as matérias. Tente novamente.',
    )
  } finally {
    if (currentRequest === subjectsRequestSequence) subjectsLoading.value = false
  }
}

async function loadPage() {
  if (!Number.isInteger(userId.value) || userId.value < 1) {
    loadError.value = 'O identificador do usuário é inválido.'
    return
  }

  const loadingId = loadingStore.start({ description: 'Carregando usuário...' })
  loadError.value = ''
  saveError.value = ''

  try {
    const [details, options] = await Promise.all([
      getUser(userId.value),
      getUserRegistrationOptions(),
    ])
    user.value = details
    courseCatalog.value = options.courses
    academicPeriodCatalog.value = options.academicPeriods
    selectedUserType.value = details.userType
    selectedCourseIds.value = details.academic?.courseIds.map(String) ?? []
    await loadSubjects(selectedCourseIds.value)
    formVersion.value += 1
  } catch (error) {
    user.value = null
    loadError.value = requestErrorMessage(
      error,
      'Não foi possível carregar os dados do usuário. Tente novamente.',
    )
  } finally {
    loadingStore.stop(loadingId)
  }
}

function updateUserType(nextUserType: UserDetails['userType'], setFieldValue: SetFieldValue) {
  if (selectedUserType.value === nextUserType) return

  selectedUserType.value = nextUserType
  selectedCourseIds.value = []
  registrationSubjects.value = []
  subjectsRequestSequence += 1
  subjectsError.value = ''
  subjectsLoading.value = false
  setFieldValue('courseIds', [])
  setFieldValue('courseSubjectIds', [])
  setFieldValue('academicPeriodIds', [])
}

async function updateCourseSelection(
  courseIds: string[],
  currentCourseSubjectIds: unknown,
  setFieldValue: SetFieldValue,
) {
  selectedCourseIds.value = courseIds
  await loadSubjects(courseIds)

  const selectedSubjects = Array.isArray(currentCourseSubjectIds)
    ? currentCourseSubjectIds.filter((value): value is string => typeof value === 'string')
    : []
  const availableIds = new Set(courseSubjectOptions.value.map(({ value }) => value))
  setFieldValue(
    'courseSubjectIds',
    selectedSubjects.filter((id) => availableIds.has(id)),
  )
}

function returnToUsers() {
  void router.push({ name: 'administration-users' })
}

function editUser() {
  void router.push({ name: 'administration-users-edit', params: { userId: userId.value } })
}

async function showUser() {
  await router.push({ name: 'administration-users-view', params: { userId: userId.value } })
  await loadPage()
}

async function saveUser(values: GenericObject) {
  if (!user.value || isSaving.value) return

  const form = values as UserDetailsFormValues
  const loadingId = loadingStore.start({ description: 'Salvando alterações...' })
  const payload: UpdateUserPayload = {
    birthDate: form.birthDate,
    cpf: form.cpf,
    email: form.email,
    isActive: form.accountStatus === 'active',
    name: form.name,
    phone: form.phone.trim(),
    userType: form.userType,
  }

  if (form.userType !== 'administrador') {
    payload.academic = {
      courseIds: normalizedIds(form.courseIds),
      courseSubjectIds: normalizedIds(form.courseSubjectIds),
      ...(form.userType === 'aluno'
        ? { academicPeriodId: normalizedIds(form.academicPeriodIds)[0] }
        : {}),
    }
  }

  isSaving.value = true
  saveError.value = ''

  try {
    const response = await updateUser(user.value.id, payload)
    notificationStore.notify({ message: response.message, type: 'success' })
    await showUser()
  } catch (error) {
    saveError.value = requestErrorMessage(
      error,
      'Não foi possível atualizar o usuário. Tente novamente.',
    )
  } finally {
    isSaving.value = false
    loadingStore.stop(loadingId)
  }
}

onMounted(() => {
  void loadPage()
})
</script>

<template>
  <section class="relative isolate min-h-full overflow-hidden">
    <div
      class="institutional-glow pointer-events-none absolute inset-x-0 top-0 -z-10 h-80"
      aria-hidden="true"
    ></div>

    <div class="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
      <button
        class="inline-flex items-center gap-2 text-sm font-semibold text-content-muted transition hover:text-brand-primary"
        type="button"
        @click="returnToUsers"
      >
        <Icon class="h-4 w-4" :icon="arrowLeftIcon" aria-hidden="true" />
        Voltar para usuários
      </button>

      <div
        v-if="loadError"
        class="surface-card mt-7 rounded-3xl border border-status-danger bg-surface p-6 sm:p-8"
        role="alert"
      >
        <h1 class="text-2xl font-bold text-content">Não foi possível abrir o usuário</h1>
        <p class="mt-3 text-sm leading-6 text-content-muted">{{ loadError }}</p>
        <AppButton class="mt-6" variant="secondary" @click="loadPage">Tentar novamente</AppButton>
      </div>

      <template v-else-if="user && initialValues">
        <header class="mt-7 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p class="text-xs font-bold uppercase tracking-[0.16em] text-brand-primary">
              Administração · Usuários
            </p>
            <h1 class="mt-3 text-3xl font-bold tracking-tight text-content sm:text-4xl">
              {{ isEditing ? 'Editar usuário' : 'Visualizar usuário' }}
            </h1>
            <p class="mt-3 text-sm leading-6 text-content-muted">
              {{
                isEditing
                  ? 'Atualize os dados pessoais, a situação e os vínculos acadêmicos.'
                  : 'Consulte todas as informações cadastradas sem permitir alterações.'
              }}
            </p>
          </div>

          <AppButton v-if="!isEditing" data-testid="edit-user" @click="editUser">
            Editar usuário
            <template #icon>
              <Icon class="h-4 w-4" :icon="pencilIcon" aria-hidden="true" />
            </template>
          </AppButton>
        </header>

        <AppForm
          :key="formVersion"
          v-slot="{ setFieldValue, values }"
          class="surface-card mt-8 space-y-8 rounded-3xl border border-outline bg-surface p-6 sm:p-8"
          :initial-values="initialValues"
          :validation-schema="validationSchema"
          @submit="saveUser"
        >
          <section aria-labelledby="personal-data-title">
            <div class="flex items-start gap-3">
              <span
                class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-primary-soft text-brand-primary"
              >
                <Icon class="h-5 w-5" :icon="eyeIcon" aria-hidden="true" />
              </span>
              <div>
                <h2 id="personal-data-title" class="text-xl font-bold text-content">
                  Dados pessoais
                </h2>
                <p class="mt-1 text-sm text-content-muted">
                  Identificação e canais de contato usados pela conta.
                </p>
              </div>
            </div>

            <div class="mt-6 grid gap-5 md:grid-cols-2">
              <AppInput
                :disabled="!isEditing"
                label="Nome completo"
                :maxlength="150"
                name="name"
                required
              />
              <AppInput
                :disabled="!isEditing"
                label="E-mail"
                :maxlength="254"
                name="email"
                required
                type="email"
              />
              <AppInput
                :disabled="!isEditing"
                label="CPF"
                mask="###.###.###-##"
                name="cpf"
                required
              />
              <AppInput
                :disabled="!isEditing"
                label="Data de nascimento"
                name="birthDate"
                required
                type="date"
              />
              <AppInput
                :disabled="!isEditing"
                label="Telefone"
                :mask="phoneMasks"
                name="phone"
                required
                type="tel"
              />
            </div>
          </section>

          <section class="border-t border-outline pt-8" aria-labelledby="access-profile-title">
            <div class="flex items-start gap-3">
              <span
                class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-secondary-soft text-brand-secondary"
              >
                <Icon class="h-5 w-5" :icon="shieldCheckIcon" aria-hidden="true" />
              </span>
              <div>
                <h2 id="access-profile-title" class="text-xl font-bold text-content">
                  Perfil e acesso
                </h2>
                <p class="mt-1 text-sm text-content-muted">
                  O perfil determina as regras do vínculo acadêmico e das permissões.
                </p>
              </div>
            </div>

            <fieldset class="mt-6">
              <legend class="text-sm font-semibold text-content">Tipo de usuário</legend>
              <div class="mt-3 grid gap-4 md:grid-cols-3">
                <Field
                  v-for="profile in profileOptions"
                  :key="profile.value"
                  v-slot="{ field }"
                  name="userType"
                  type="radio"
                  :value="profile.value"
                >
                  <label
                    class="rounded-2xl border p-5"
                    :class="[
                      field.checked
                        ? 'border-brand-primary bg-brand-primary-soft'
                        : 'border-outline bg-surface-subtle',
                      isEditing
                        ? 'cursor-pointer hover:border-brand-primary'
                        : 'cursor-not-allowed',
                    ]"
                  >
                    <input
                      class="sr-only"
                      type="radio"
                      v-bind="field"
                      :disabled="!isEditing"
                      :value="profile.value"
                      @change="updateUserType(profile.value, setFieldValue)"
                    />
                    <span class="block font-bold text-content">{{ profile.label }}</span>
                    <span class="mt-2 block text-sm leading-6 text-content-muted">
                      {{ profile.description }}
                    </span>
                  </label>
                </Field>
              </div>
              <ErrorMessage
                class="mt-3 block text-sm font-medium text-status-danger"
                name="userType"
              />
            </fieldset>

            <fieldset class="mt-6">
              <legend class="text-sm font-semibold text-content">Situação da conta</legend>
              <div class="mt-3 grid gap-3 sm:grid-cols-2">
                <Field
                  v-for="status in [
                    { label: 'Conta ativa', value: 'active' },
                    { label: 'Conta inativa', value: 'inactive' },
                  ]"
                  :key="status.value"
                  v-slot="{ field }"
                  name="accountStatus"
                  type="radio"
                  :value="status.value"
                >
                  <label
                    class="rounded-xl border p-4"
                    :class="[
                      field.checked
                        ? 'border-brand-primary bg-brand-primary-soft'
                        : 'border-outline bg-surface-subtle',
                      isEditing
                        ? 'cursor-pointer hover:border-brand-primary'
                        : 'cursor-not-allowed',
                    ]"
                  >
                    <input
                      class="sr-only"
                      type="radio"
                      v-bind="field"
                      :disabled="!isEditing"
                      :value="status.value"
                    />
                    <span class="font-bold text-content">{{ status.label }}</span>
                  </label>
                </Field>
              </div>
              <ErrorMessage
                class="mt-3 block text-sm font-medium text-status-danger"
                name="accountStatus"
              />
            </fieldset>
          </section>

          <section
            v-if="hasAcademicProfile"
            class="border-t border-outline pt-8"
            aria-labelledby="academic-links-title"
          >
            <h2 id="academic-links-title" class="text-xl font-bold text-content">
              Vínculos acadêmicos
            </h2>
            <p class="mt-2 text-sm leading-6 text-content-muted">
              {{
                selectedUserType === 'aluno'
                  ? 'Aluno possui um curso, período atual e matérias vinculadas.'
                  : 'Professor pode possuir vários cursos e matérias, sem período acadêmico.'
              }}
            </p>

            <div
              class="mt-6 grid gap-5"
              :class="selectedUserType === 'aluno' ? 'lg:grid-cols-3' : 'lg:grid-cols-2'"
            >
              <AppMultiSelect
                data-testid="details-course-select"
                :disabled="!isEditing"
                label="Cursos"
                name="courseIds"
                :options="courseOptions"
                required
                :selection-limit="courseSelectionLimit"
                @change="updateCourseSelection($event, values.courseSubjectIds, setFieldValue)"
              />
              <AppMultiSelect
                v-if="selectedUserType === 'aluno'"
                data-testid="details-period-select"
                :disabled="!isEditing"
                label="Período atual"
                name="academicPeriodIds"
                :options="periodOptions"
                required
                :selection-limit="1"
              />
              <AppMultiSelect
                data-testid="details-subject-select"
                :disabled="!isEditing || selectedCourseIds.length === 0 || subjectsLoading"
                empty-text="Nenhuma matéria cadastrada para os cursos selecionados."
                label="Matérias"
                name="courseSubjectIds"
                :options="subjectOptions"
                :placeholder="subjectsLoading ? 'Carregando matérias...' : 'Selecione as matérias'"
                required
              />
            </div>

            <div
              v-if="subjectsError"
              class="mt-4 rounded-xl border border-status-danger bg-status-danger-soft p-4 text-sm text-content"
              role="alert"
            >
              {{ subjectsError }}
            </div>
          </section>

          <section class="border-t border-outline pt-8" aria-labelledby="account-history-title">
            <h2 id="account-history-title" class="text-xl font-bold text-content">
              Informações da conta
            </h2>
            <dl class="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div class="rounded-xl border border-outline bg-surface-subtle p-4">
                <dt class="text-xs font-bold uppercase tracking-[0.12em] text-content-muted">ID</dt>
                <dd class="mt-2 font-semibold text-content">{{ user.id }}</dd>
              </div>
              <div class="rounded-xl border border-outline bg-surface-subtle p-4">
                <dt class="text-xs font-bold uppercase tracking-[0.12em] text-content-muted">
                  Primeiro acesso
                </dt>
                <dd class="mt-2 font-semibold text-content">
                  {{ user.mustChangePassword ? 'Troca de senha pendente' : 'Concluído' }}
                </dd>
              </div>
              <div class="rounded-xl border border-outline bg-surface-subtle p-4">
                <dt class="text-xs font-bold uppercase tracking-[0.12em] text-content-muted">
                  Criado em
                </dt>
                <dd class="mt-2 text-sm font-semibold text-content">
                  {{ formatDateTime(user.createdAt) }}
                </dd>
              </div>
              <div class="rounded-xl border border-outline bg-surface-subtle p-4">
                <dt class="text-xs font-bold uppercase tracking-[0.12em] text-content-muted">
                  Atualizado em
                </dt>
                <dd class="mt-2 text-sm font-semibold text-content">
                  {{ formatDateTime(user.updatedAt) }}
                </dd>
              </div>
            </dl>
          </section>

          <div
            v-if="saveError"
            class="rounded-xl border border-status-danger bg-status-danger-soft p-4 text-sm text-content"
            role="alert"
          >
            {{ saveError }}
          </div>

          <div
            v-if="isEditing"
            class="flex flex-col-reverse gap-3 border-t border-outline pt-6 sm:flex-row sm:justify-between"
          >
            <AppButton variant="ghost" @click="showUser">Cancelar</AppButton>
            <AppButton
              data-testid="save-user-changes"
              :loading="isSaving"
              loading-label="Salvando alterações..."
              type="submit"
            >
              Salvar alterações
            </AppButton>
          </div>
        </AppForm>
      </template>
    </div>
  </section>
</template>
