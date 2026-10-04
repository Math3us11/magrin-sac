<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { computed, onMounted, reactive, ref } from 'vue'
import { ErrorMessage, Field, type GenericObject } from 'vee-validate'
import { useRouter } from 'vue-router'

import AppButton from '@/components/basic/AppButton.vue'
import AppForm from '@/components/basic/AppForm.vue'
import AppInput from '@/components/basic/AppInput.vue'
import AppMultiSelect from '@/components/basic/AppMultiSelect.vue'
import { useDocumentTitle } from '@/composables/useDocumentTitle'
import { arrowLeftIcon, arrowRightIcon, keyRoundIcon, userPlusIcon } from '@/icons'
import { ApiError } from '@/services/api'
import {
  createUser,
  getUserRegistrationOptions,
  getUserRegistrationSubjects,
} from '@/services/users'
import type {
  AcademicPeriod,
  CreateUserPayload,
  RegistrationCourse,
  RegistrationSubject,
} from '@/types/user-registration'
import {
  createAcademicDetailsValidationSchema,
  personalDataValidationSchema,
  profileValidationSchema,
  type AcademicDetailsFormValues,
  type PersonalDataFormValues,
  type ProfileFormValues,
} from '@/validations/user-registration.schema'

type AccountStatus = 'active' | 'inactive'
type UserType = '' | 'administrator' | 'student' | 'teacher'

interface CourseSubjectOption {
  courseId: string
  courseLabel: string
  subjectLabel: string
  value: string
}

interface RegistrationDraft {
  accountStatus: AccountStatus
  academicPeriodIds: string[]
  birthDate: string
  courseIds: string[]
  courseSubjectIds: string[]
  cpf: string
  email: string
  name: string
  phone: string
  temporaryPassword: string
  temporaryPasswordConfirmation: string
  userType: UserType
}

function createEmptyRegistrationDraft(): RegistrationDraft {
  return {
    accountStatus: 'active',
    academicPeriodIds: [],
    birthDate: '',
    courseIds: [],
    courseSubjectIds: [],
    cpf: '',
    email: '',
    name: '',
    phone: '',
    temporaryPassword: '',
    temporaryPasswordConfirmation: '',
    userType: '',
  }
}

const router = useRouter()

useDocumentTitle('Cadastrar usuário | Sistema de Agendamento')

const currentStep = ref(1)
const phoneMasks = ['(##) ####-####', '(##) #####-####']
const draft = reactive<RegistrationDraft>(createEmptyRegistrationDraft())

const profileOptions = [
  {
    description: 'Vínculo acadêmico sujeito à futura validação institucional.',
    label: 'Aluno',
    value: 'student',
  },
  {
    description: 'Receberá cursos, matérias e disponibilidade de agenda.',
    label: 'Professor',
    value: 'teacher',
  },
  {
    description: 'Acesso privilegiado às rotinas internas de manutenção.',
    label: 'Administrador',
    value: 'administrator',
  },
] as const

const courseCatalog = ref<RegistrationCourse[]>([])
const academicPeriodCatalog = ref<AcademicPeriod[]>([])
const registrationSubjects = ref<RegistrationSubject[]>([])
const catalogsLoading = ref(true)
const catalogsError = ref('')
const subjectsLoading = ref(false)
const subjectsError = ref('')
const isSaving = ref(false)
const saveError = ref('')
const registrationCompleted = ref(false)
let subjectsRequestSequence = 0

const courseOptions = computed(() =>
  courseCatalog.value.map(({ id, name }) => ({ label: name, value: String(id) })),
)
const periodOptions = computed(() =>
  academicPeriodCatalog.value.map(({ id, name }) => ({ label: name, value: String(id) })),
)
const courseSubjectOptions = computed<CourseSubjectOption[]>(() =>
  registrationSubjects.value.map(({ courseId, courseName, courseSubjectId, subjectName }) => ({
    courseId: String(courseId),
    courseLabel: courseName,
    subjectLabel: subjectName,
    value: String(courseSubjectId),
  })),
)

const hasAcademicProfile = computed(
  () => draft.userType === 'student' || draft.userType === 'teacher',
)
const steps = computed(() => [
  { label: 'Dados pessoais', number: 1 },
  { label: 'Perfil de acesso', number: 2 },
  {
    label: hasAcademicProfile.value ? 'Vínculo acadêmico' : 'Configuração',
    number: 3,
  },
  { label: 'Revisão', number: 4 },
])
const isReviewStep = computed(() => currentStep.value === steps.value.length)
const academicDetailsValidationSchema = computed(() =>
  createAcademicDetailsValidationSchema(draft.userType === 'teacher' ? 'teacher' : 'student'),
)
const courseSelectionLimit = computed(() => (draft.userType === 'student' ? 1 : undefined))
const selectedProfile = computed(
  () => profileOptions.find((profile) => profile.value === draft.userType)?.label ?? 'Não definido',
)
const selectedAccountStatus = computed(() =>
  draft.accountStatus === 'active' ? 'Ativa' : 'Inativa',
)
const selectedCourses = computed(() =>
  courseOptions.value.filter((course) => draft.courseIds.includes(course.value)),
)
const selectedCourseSubjects = computed(() =>
  courseSubjectOptions.value.filter((subject) => draft.courseSubjectIds.includes(subject.value)),
)
const selectedCurrentPeriod = computed(() =>
  periodOptions.value.find((period) => draft.academicPeriodIds.includes(period.value)),
)
const filteredSubjectOptions = computed(() =>
  courseSubjectOptions.value.map((subject) => ({
    label:
      draft.courseIds.length > 1
        ? `${subject.subjectLabel} · ${subject.courseLabel}`
        : subject.subjectLabel,
    value: subject.value,
  })),
)

function requestErrorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback
}

async function loadRegistrationOptions() {
  catalogsLoading.value = true
  catalogsError.value = ''

  try {
    const response = await getUserRegistrationOptions()
    courseCatalog.value = response.courses
    academicPeriodCatalog.value = response.academicPeriods

    const availableCourseIds = new Set(response.courses.map(({ id }) => String(id)))
    const availablePeriodIds = new Set(response.academicPeriods.map(({ id }) => String(id)))
    draft.courseIds = draft.courseIds.filter((id) => availableCourseIds.has(id))
    draft.academicPeriodIds = draft.academicPeriodIds.filter((id) => availablePeriodIds.has(id))

    if (draft.courseIds.length > 0) {
      await loadRegistrationSubjects(draft.courseIds)
    }
  } catch (error) {
    catalogsError.value = requestErrorMessage(
      error,
      'Não foi possível carregar os cursos e períodos. Tente novamente.',
    )
  } finally {
    catalogsLoading.value = false
  }
}

async function loadRegistrationSubjects(courseIds: string[]) {
  const requestSequence = ++subjectsRequestSequence

  if (courseIds.length === 0) {
    registrationSubjects.value = []
    draft.courseSubjectIds = []
    subjectsError.value = ''
    subjectsLoading.value = false
    return
  }

  subjectsLoading.value = true
  subjectsError.value = ''

  try {
    const response = await getUserRegistrationSubjects(courseIds.map(Number))

    if (requestSequence !== subjectsRequestSequence) return

    registrationSubjects.value = response.subjects
    const availableSubjectIds = new Set(
      response.subjects.map(({ courseSubjectId }) => String(courseSubjectId)),
    )
    draft.courseSubjectIds = draft.courseSubjectIds.filter((id) => availableSubjectIds.has(id))
  } catch (error) {
    if (requestSequence !== subjectsRequestSequence) return

    registrationSubjects.value = []
    draft.courseSubjectIds = []
    subjectsError.value = requestErrorMessage(
      error,
      'Não foi possível carregar as matérias. Tente novamente.',
    )
  } finally {
    if (requestSequence === subjectsRequestSequence) subjectsLoading.value = false
  }
}

onMounted(() => {
  void loadRegistrationOptions()
})

function returnToUsers() {
  void router.push({ name: 'administration-users' })
}

function registerAnotherUser() {
  Object.assign(draft, createEmptyRegistrationDraft())
  registrationSubjects.value = []
  saveError.value = ''
  registrationCompleted.value = false
  subjectsError.value = ''
  subjectsLoading.value = false
  subjectsRequestSequence += 1
  currentStep.value = 1
}

function previousStep() {
  currentStep.value = Math.max(1, currentStep.value - 1)
}

function savePersonalData(values: GenericObject) {
  Object.assign(draft, values as PersonalDataFormValues)
  currentStep.value = 2
}

function saveProfile(values: GenericObject) {
  const profile = values as ProfileFormValues
  const nextUserType = profile.userType as UserType

  if (draft.userType !== nextUserType) {
    draft.academicPeriodIds = []
    draft.courseIds = []
    draft.courseSubjectIds = []
    registrationSubjects.value = []
    subjectsRequestSequence += 1
    subjectsLoading.value = false
    subjectsError.value = ''
  }

  draft.accountStatus = profile.accountStatus as AccountStatus
  draft.temporaryPassword = profile.temporaryPassword
  draft.temporaryPasswordConfirmation = profile.temporaryPasswordConfirmation
  draft.userType = nextUserType
  currentStep.value = 3
}

function saveAcademicDetails(values: GenericObject) {
  const details = values as AcademicDetailsFormValues
  draft.courseIds = (details.courseIds ?? []).filter(Boolean) as string[]
  draft.courseSubjectIds = (details.courseSubjectIds ?? []).filter(Boolean) as string[]
  draft.academicPeriodIds =
    draft.userType === 'student'
      ? ((details.academicPeriodIds ?? []).filter(Boolean) as string[])
      : []
  currentStep.value = 4
}

function advanceAdministratorDetails() {
  currentStep.value = 4
}

function updateCourseSelection(courseIds: string[]) {
  draft.courseIds = courseIds
  void loadRegistrationSubjects(courseIds)
}

function updateCurrentPeriodSelection(academicPeriodIds: string[]) {
  draft.academicPeriodIds = academicPeriodIds
}

function updateCourseSubjectSelection(courseSubjectIds: string[]) {
  draft.courseSubjectIds = courseSubjectIds
}

async function saveUser() {
  if (isSaving.value || registrationCompleted.value || !draft.userType) return

  const userTypes: Record<Exclude<UserType, ''>, CreateUserPayload['userType']> = {
    administrator: 'administrador',
    student: 'aluno',
    teacher: 'professor',
  }
  const payload: CreateUserPayload = {
    birthDate: draft.birthDate,
    cpf: draft.cpf,
    email: draft.email,
    isActive: draft.accountStatus === 'active',
    name: draft.name,
    phone: draft.phone,
    temporaryPassword: draft.temporaryPassword,
    userType: userTypes[draft.userType],
  }

  if (hasAcademicProfile.value) {
    payload.academic = {
      academicPeriodId:
        draft.userType === 'student' ? Number(draft.academicPeriodIds[0]) : undefined,
      courseIds: draft.courseIds.map(Number),
      courseSubjectIds: draft.courseSubjectIds.map(Number),
    }
  }

  isSaving.value = true
  saveError.value = ''

  try {
    await createUser(payload)
    registrationCompleted.value = true
    draft.temporaryPassword = ''
    draft.temporaryPasswordConfirmation = ''
  } catch (error) {
    saveError.value = requestErrorMessage(
      error,
      'Não foi possível cadastrar o usuário. Tente novamente.',
    )
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <section class="relative isolate min-h-full overflow-hidden">
    <div
      class="institutional-glow pointer-events-none absolute inset-x-0 top-0 -z-10 h-80"
      aria-hidden="true"
    ></div>

    <div class="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
      <AppButton variant="ghost" data-testid="back-to-users" @click="returnToUsers">
        Voltar para usuários
        <template #icon>
          <Icon class="h-4 w-4" :icon="arrowLeftIcon" aria-hidden="true" />
        </template>
      </AppButton>

      <header class="mt-7 max-w-3xl">
        <p class="text-xs font-bold uppercase tracking-[0.16em] text-brand-primary">
          Administração · Usuários
        </p>
        <h1 class="mt-3 text-3xl font-bold tracking-tight text-content sm:text-4xl">
          Cadastrar usuário
        </h1>
        <p class="mt-4 text-base leading-7 text-content-muted">
          Preencha uma etapa de cada vez. O conteúdo muda conforme o perfil escolhido e, por ao
          final, o servidor validará e salvará o cadastro completo.
        </p>
      </header>

      <nav class="mt-8" aria-label="Etapas do cadastro">
        <ol class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <li v-for="step in steps" :key="step.number">
            <button
              class="flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left"
              :class="[
                currentStep === step.number
                  ? 'border-brand-primary bg-brand-primary-soft text-content'
                  : 'border-outline bg-surface text-content-muted',
                step.number < currentStep ? 'cursor-pointer' : 'cursor-default',
              ]"
              type="button"
              :aria-current="currentStep === step.number ? 'step' : undefined"
              :disabled="step.number >= currentStep"
              @click="currentStep = step.number"
            >
              <span
                class="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                :class="
                  step.number <= currentStep
                    ? 'bg-brand-primary text-on-primary'
                    : 'bg-surface-subtle text-content-muted'
                "
              >
                {{ step.number }}
              </span>
              <span class="text-sm font-semibold">{{ step.label }}</span>
            </button>
          </li>
        </ol>
      </nav>

      <div class="surface-card mt-6 rounded-2xl border border-outline bg-surface p-6 sm:p-8">
        <AppForm
          v-if="currentStep === 1"
          class="space-y-6"
          :initial-values="draft"
          :validation-schema="personalDataValidationSchema"
          @submit="savePersonalData"
        >
          <div>
            <p class="text-xs font-bold uppercase tracking-[0.14em] text-brand-primary">Etapa 1</p>
            <h2 class="mt-2 text-xl font-bold text-content">Dados pessoais</h2>
            <p class="mt-2 text-sm leading-6 text-content-muted">
              Informações básicas para identificar e contatar a pessoa usuária.
            </p>
          </div>

          <div class="grid gap-5 md:grid-cols-2">
            <AppInput
              class="md:col-span-2"
              autocomplete="name"
              label="Nome completo"
              :maxlength="120"
              name="name"
              placeholder="Digite o nome completo"
              required
            />
            <AppInput
              inputmode="numeric"
              label="CPF"
              mask="###.###.###-##"
              name="cpf"
              placeholder="000.000.000-00"
              required
            />
            <AppInput label="Data de nascimento" name="birthDate" required type="date" />
            <AppInput
              autocomplete="email"
              inputmode="email"
              label="E-mail"
              :maxlength="254"
              name="email"
              placeholder="nome@instituicao.edu.br"
              required
              type="email"
            />
            <AppInput
              autocomplete="tel"
              inputmode="tel"
              label="Telefone"
              :mask="phoneMasks"
              name="phone"
              placeholder="(00) 00000-0000"
              required
              type="tel"
            />
          </div>

          <div class="flex justify-end border-t border-outline pt-6">
            <AppButton type="submit">
              Continuar
              <template #icon>
                <Icon class="h-4 w-4" :icon="arrowRightIcon" aria-hidden="true" />
              </template>
            </AppButton>
          </div>
        </AppForm>

        <AppForm
          v-else-if="currentStep === 2"
          class="space-y-6"
          :initial-values="draft"
          :validation-schema="profileValidationSchema"
          @submit="saveProfile"
        >
          <div>
            <p class="text-xs font-bold uppercase tracking-[0.14em] text-brand-primary">Etapa 2</p>
            <h2 class="mt-2 text-xl font-bold text-content">Perfil de acesso</h2>
            <p class="mt-2 text-sm leading-6 text-content-muted">
              Essa escolha define as próximas informações e as permissões futuras da conta.
            </p>
          </div>

          <fieldset>
            <legend class="text-sm font-semibold text-content">
              Tipo de usuário <span class="text-status-danger" aria-hidden="true">*</span>
            </legend>
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
                  class="relative cursor-pointer rounded-2xl border p-5"
                  :class="
                    field.checked
                      ? 'border-brand-primary bg-brand-primary-soft'
                      : 'border-outline bg-surface-subtle hover:border-brand-primary'
                  "
                >
                  <input class="sr-only" type="radio" v-bind="field" :value="profile.value" />
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

          <fieldset>
            <legend class="text-sm font-semibold text-content">
              Situação inicial <span class="text-status-danger" aria-hidden="true">*</span>
            </legend>
            <div class="mt-3 grid gap-3 sm:grid-cols-2">
              <Field v-slot="{ field }" name="accountStatus" type="radio" value="active">
                <label
                  class="cursor-pointer rounded-xl border p-4"
                  :class="
                    field.checked
                      ? 'border-brand-primary bg-brand-primary-soft'
                      : 'border-outline bg-surface-subtle hover:border-brand-primary'
                  "
                >
                  <input class="sr-only" type="radio" v-bind="field" value="active" />
                  <span class="block font-bold text-content">Conta ativa</span>
                  <span class="mt-1 block text-sm text-content-muted">
                    Poderá acessar o sistema após concluir o primeiro acesso.
                  </span>
                </label>
              </Field>
              <Field v-slot="{ field }" name="accountStatus" type="radio" value="inactive">
                <label
                  class="cursor-pointer rounded-xl border p-4"
                  :class="
                    field.checked
                      ? 'border-brand-primary bg-brand-primary-soft'
                      : 'border-outline bg-surface-subtle hover:border-brand-primary'
                  "
                >
                  <input class="sr-only" type="radio" v-bind="field" value="inactive" />
                  <span class="block font-bold text-content">Conta inativa</span>
                  <span class="mt-1 block text-sm text-content-muted">
                    O cadastro será preparado sem liberar o acesso imediatamente.
                  </span>
                </label>
              </Field>
            </div>
            <ErrorMessage
              class="mt-3 block text-sm font-medium text-status-danger"
              name="accountStatus"
            />
          </fieldset>

          <div class="grid gap-5 md:grid-cols-2">
            <AppInput
              autocomplete="new-password"
              help-text="Use pelo menos 8 caracteres. A troca será obrigatória no primeiro acesso."
              label="Senha temporária"
              :maxlength="128"
              name="temporaryPassword"
              placeholder="Defina a senha inicial"
              required
              revealable
              type="password"
            />
            <AppInput
              autocomplete="new-password"
              label="Confirmar senha temporária"
              :maxlength="128"
              name="temporaryPasswordConfirmation"
              placeholder="Repita a senha inicial"
              required
              revealable
              type="password"
            />
          </div>

          <div class="rounded-xl border border-brand-secondary bg-brand-secondary-soft p-4">
            <div class="flex gap-3">
              <Icon
                class="mt-0.5 h-5 w-5 shrink-0 text-brand-secondary"
                :icon="keyRoundIcon"
                aria-hidden="true"
              />
              <p class="text-sm leading-6 text-content">
                A senha temporária nunca será exibida na revisão. A troca obrigatória no primeiro
                acesso será ligada ao backend posteriormente.
              </p>
            </div>
          </div>

          <div
            class="flex flex-col-reverse gap-3 border-t border-outline pt-6 sm:flex-row sm:justify-between"
          >
            <AppButton variant="ghost" @click="previousStep">Voltar</AppButton>
            <AppButton type="submit">
              Continuar
              <template #icon>
                <Icon class="h-4 w-4" :icon="arrowRightIcon" aria-hidden="true" />
              </template>
            </AppButton>
          </div>
        </AppForm>

        <AppForm
          v-else-if="currentStep === 3 && hasAcademicProfile"
          class="space-y-6"
          :initial-values="draft"
          :validation-schema="academicDetailsValidationSchema"
          @submit="saveAcademicDetails"
        >
          <div>
            <p class="text-xs font-bold uppercase tracking-[0.14em] text-brand-primary">Etapa 3</p>
            <h2 class="mt-2 text-xl font-bold text-content">Vínculo acadêmico</h2>
            <p class="mt-2 text-sm leading-6 text-content-muted">
              <template v-if="draft.userType === 'teacher'">
                Selecione os cursos e as matérias em que o professor poderá atuar.
              </template>
              <template v-else>
                Selecione o curso, o período atual e as matérias vinculadas ao aluno.
              </template>
            </p>
          </div>

          <div
            v-if="catalogsLoading"
            class="rounded-xl border border-brand-secondary bg-brand-secondary-soft p-4 text-sm leading-6 text-content"
            role="status"
          >
            Carregando cursos e períodos disponíveis no servidor...
          </div>
          <div
            v-else-if="catalogsError"
            class="flex flex-col gap-3 rounded-xl border border-status-danger bg-status-danger-soft p-4 text-sm leading-6 text-content sm:flex-row sm:items-center sm:justify-between"
            role="alert"
          >
            <span>{{ catalogsError }}</span>
            <AppButton variant="ghost" @click="loadRegistrationOptions">Tentar novamente</AppButton>
          </div>
          <div
            v-else
            class="rounded-xl border border-brand-secondary bg-brand-secondary-soft p-4 text-sm leading-6 text-content"
          >
            Cursos e períodos carregados do catálogo acadêmico. As matérias são atualizadas conforme
            os cursos selecionados.
          </div>

          <div
            class="grid gap-5"
            :class="draft.userType === 'student' ? 'lg:grid-cols-3' : 'lg:grid-cols-2'"
          >
            <AppMultiSelect
              data-testid="course-select"
              :disabled="catalogsLoading || Boolean(catalogsError)"
              help-text="Aluno seleciona uma opção; professor pode selecionar várias."
              label="Cursos"
              name="courseIds"
              :options="courseOptions"
              :placeholder="catalogsLoading ? 'Carregando cursos...' : 'Selecione os cursos'"
              required
              :selection-limit="courseSelectionLimit"
              @change="updateCourseSelection"
            />
            <AppMultiSelect
              v-if="draft.userType === 'student'"
              data-testid="period-select"
              :disabled="catalogsLoading || Boolean(catalogsError)"
              help-text="Representa o período atual do aluno e não limita as matérias disponíveis."
              label="Período atual"
              name="academicPeriodIds"
              :options="periodOptions"
              :placeholder="
                catalogsLoading ? 'Carregando períodos...' : 'Selecione o período atual'
              "
              required
              :selection-limit="1"
              @change="updateCurrentPeriodSelection"
            />
            <AppMultiSelect
              :disabled="
                draft.courseIds.length === 0 ||
                subjectsLoading ||
                Boolean(subjectsError) ||
                catalogsLoading
              "
              data-testid="subject-select"
              empty-text="Nenhuma matéria cadastrada para os cursos selecionados."
              help-text="A lista é filtrada pelos cursos, mas a escolha das matérias é manual."
              label="Matérias"
              name="courseSubjectIds"
              :options="filteredSubjectOptions"
              :placeholder="
                subjectsLoading
                  ? 'Carregando matérias...'
                  : draft.courseIds.length === 0
                    ? 'Selecione primeiro um curso'
                    : 'Selecione as matérias'
              "
              required
              @change="updateCourseSubjectSelection"
            />
          </div>

          <div
            v-if="subjectsError"
            class="flex flex-col gap-3 rounded-xl border border-status-danger bg-status-danger-soft p-4 text-sm leading-6 text-content sm:flex-row sm:items-center sm:justify-between"
            role="alert"
          >
            <span>{{ subjectsError }}</span>
            <AppButton variant="ghost" @click="loadRegistrationSubjects(draft.courseIds)">
              Tentar novamente
            </AppButton>
          </div>

          <div
            class="flex flex-col-reverse gap-3 border-t border-outline pt-6 sm:flex-row sm:justify-between"
          >
            <AppButton variant="ghost" @click="previousStep">Voltar</AppButton>
            <AppButton type="submit">
              Revisar cadastro
              <template #icon>
                <Icon class="h-4 w-4" :icon="arrowRightIcon" aria-hidden="true" />
              </template>
            </AppButton>
          </div>
        </AppForm>

        <section v-else-if="currentStep === 3" aria-labelledby="administrator-configuration-title">
          <p class="text-xs font-bold uppercase tracking-[0.14em] text-brand-primary">Etapa 3</p>
          <h2 id="administrator-configuration-title" class="mt-2 text-xl font-bold text-content">
            Configuração administrativa
          </h2>
          <p class="mt-2 max-w-2xl text-sm leading-6 text-content-muted">
            Permissões administrativas específicas serão definidas quando construirmos a matriz de
            manutenção. Neste protótipo, o perfil segue com o conjunto administrativo padrão.
          </p>

          <div
            class="mt-6 flex flex-col-reverse gap-3 border-t border-outline pt-6 sm:flex-row sm:justify-between"
          >
            <AppButton variant="ghost" @click="previousStep">Voltar</AppButton>
            <AppButton @click="advanceAdministratorDetails">
              Revisar cadastro
              <template #icon>
                <Icon class="h-4 w-4" :icon="arrowRightIcon" aria-hidden="true" />
              </template>
            </AppButton>
          </div>
        </section>

        <section v-else-if="isReviewStep" aria-labelledby="registration-review-title">
          <div
            v-if="registrationCompleted"
            class="mx-auto max-w-2xl py-8 text-center sm:py-12"
            data-testid="registration-success"
            role="status"
          >
            <div
              class="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-status-success-soft text-status-success"
              aria-hidden="true"
            >
              <Icon class="h-8 w-8" :icon="userPlusIcon" />
            </div>
            <p class="mt-6 text-xs font-bold uppercase tracking-[0.14em] text-brand-primary">
              Cadastro concluído
            </p>
            <h2 id="registration-review-title" class="mt-2 text-2xl font-bold text-content">
              O que você deseja fazer agora?
            </h2>
            <p class="mx-auto mt-3 max-w-lg text-sm leading-6 text-content-muted">
              Você pode iniciar um novo cadastro ou voltar para o gerenciamento de usuários.
            </p>
            <div class="mt-8 flex flex-col-reverse justify-center gap-3 sm:flex-row">
              <AppButton variant="ghost" data-testid="back-after-create" @click="returnToUsers">
                Voltar para usuários
              </AppButton>
              <AppButton data-testid="register-another-user" @click="registerAnotherUser">
                Cadastrar outro usuário
                <template #icon>
                  <Icon class="h-4 w-4" :icon="userPlusIcon" aria-hidden="true" />
                </template>
              </AppButton>
            </div>
          </div>

          <div v-else>
            <div>
              <p class="text-xs font-bold uppercase tracking-[0.14em] text-brand-primary">
                Etapa {{ currentStep }}
              </p>
              <h2 id="registration-review-title" class="mt-2 text-xl font-bold text-content">
                Revisão do cadastro
              </h2>
              <p class="mt-2 text-sm leading-6 text-content-muted">
                Confira como as informações serão organizadas antes da futura integração.
              </p>
            </div>

            <dl class="mt-7 grid gap-4 md:grid-cols-2">
              <div class="rounded-xl border border-outline bg-surface-subtle p-4">
                <dt class="text-xs font-bold uppercase tracking-[0.12em] text-content-muted">
                  Nome
                </dt>
                <dd class="mt-2 font-semibold text-content">{{ draft.name }}</dd>
              </div>
              <div class="rounded-xl border border-outline bg-surface-subtle p-4">
                <dt class="text-xs font-bold uppercase tracking-[0.12em] text-content-muted">
                  Perfil
                </dt>
                <dd class="mt-2 font-semibold text-content">{{ selectedProfile }}</dd>
                <dd class="mt-1 text-sm text-content-muted">Conta {{ selectedAccountStatus }}</dd>
              </div>
              <div class="rounded-xl border border-outline bg-surface-subtle p-4">
                <dt class="text-xs font-bold uppercase tracking-[0.12em] text-content-muted">
                  Contato
                </dt>
                <dd class="mt-2 text-sm font-semibold text-content">{{ draft.email }}</dd>
                <dd v-if="draft.phone" class="mt-1 text-sm text-content-muted">
                  {{ draft.phone }}
                </dd>
              </div>
              <div class="rounded-xl border border-outline bg-surface-subtle p-4">
                <dt class="text-xs font-bold uppercase tracking-[0.12em] text-content-muted">
                  Identificação
                </dt>
                <dd class="mt-2 text-sm font-semibold text-content">CPF {{ draft.cpf }}</dd>
                <dd class="mt-1 text-sm text-content-muted">Nascimento: {{ draft.birthDate }}</dd>
              </div>
            </dl>

            <div
              v-if="hasAcademicProfile"
              class="mt-4 grid gap-4"
              :class="draft.userType === 'student' ? 'lg:grid-cols-3' : 'lg:grid-cols-2'"
            >
              <div class="rounded-xl border border-outline bg-surface-subtle p-4">
                <h3 class="text-sm font-bold text-content">Cursos</h3>
                <ul class="mt-3 flex flex-wrap gap-2">
                  <li
                    v-for="course in selectedCourses"
                    :key="course.value"
                    class="rounded-full bg-brand-primary-soft px-3 py-1 text-xs font-semibold text-content"
                  >
                    {{ course.label }}
                  </li>
                </ul>
              </div>
              <div class="rounded-xl border border-outline bg-surface-subtle p-4">
                <h3 class="text-sm font-bold text-content">Matérias</h3>
                <ul class="mt-3 flex flex-wrap gap-2">
                  <li
                    v-for="subject in selectedCourseSubjects"
                    :key="subject.value"
                    class="rounded-full bg-brand-secondary-soft px-3 py-1 text-xs font-semibold text-content"
                  >
                    {{ subject.subjectLabel }}
                    <template v-if="draft.userType === 'teacher'">
                      · {{ subject.courseLabel }}</template
                    >
                  </li>
                </ul>
              </div>
              <div
                v-if="draft.userType === 'student'"
                class="rounded-xl border border-outline bg-surface-subtle p-4"
              >
                <h3 class="text-sm font-bold text-content">Período atual</h3>
                <p class="mt-3 text-sm font-semibold text-content">
                  {{ selectedCurrentPeriod?.label }}
                </p>
              </div>
            </div>

            <div class="mt-4 rounded-xl border border-outline bg-surface-subtle p-4">
              <h3 class="text-sm font-bold text-content">Primeiro acesso</h3>
              <p class="mt-2 text-sm text-content-muted">
                Senha temporária definida. A credencial não é exibida nesta revisão.
              </p>
            </div>

            <div
              v-if="saveError"
              class="mt-4 rounded-xl border border-status-danger bg-status-danger-soft p-4 text-sm leading-6 text-content"
              role="alert"
            >
              {{ saveError }}
            </div>
            <div
              class="mt-7 flex flex-col-reverse gap-3 border-t border-outline pt-6 sm:flex-row sm:items-center sm:justify-between"
            >
              <AppButton variant="ghost" @click="previousStep">Voltar</AppButton>
              <div class="text-right">
                <AppButton
                  :loading="isSaving"
                  loading-label="Salvando usuário..."
                  data-testid="save-user"
                  @click="saveUser"
                >
                  Salvar usuário
                </AppButton>
                <p class="mt-2 text-xs text-content-muted">
                  A senha será cifrada antes do envio e protegida com Argon2id no servidor.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  </section>
</template>
