import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const usersServiceMocks = vi.hoisted(() => ({
  createUser: vi.fn(),
  deleteUser: vi.fn(),
  getUser: vi.fn(),
  getUserRegistrationOptions: vi.fn(),
  getUserRegistrationSubjects: vi.fn(),
  listUsers: vi.fn(),
  updateUser: vi.fn(),
}))

vi.mock('@/services/users', () => usersServiceMocks)

import UserCreateView from '@/views/administration/UserCreateView.vue'
import UserDetailsView from '@/views/administration/UserDetailsView.vue'
import UsersView from '@/views/administration/UsersView.vue'
import { useLoadingStore } from '@/stores/loading'

const registrationCourses = [
  {
    code: 'ciencia-computacao',
    educationLevel: 'graduacao' as const,
    id: 11,
    name: 'Ciência da Computação',
  },
  {
    code: 'medicina',
    educationLevel: 'graduacao' as const,
    id: 12,
    name: 'Medicina',
  },
]

const registrationSubjects = [
  {
    courseId: 11,
    courseName: 'Ciência da Computação',
    courseSubjectId: 101,
    subjectCode: 'algoritmos-programacao',
    subjectId: 1001,
    subjectName: 'Algoritmos e Programação',
  },
  {
    courseId: 12,
    courseName: 'Medicina',
    courseSubjectId: 102,
    subjectCode: 'anatomia',
    subjectId: 1002,
    subjectName: 'Anatomia',
  },
  {
    courseId: 12,
    courseName: 'Medicina',
    courseSubjectId: 103,
    subjectCode: 'bioetica',
    subjectId: 1003,
    subjectName: 'Bioética',
  },
]

function createAdministrationRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/administracao/usuarios',
        name: 'administration-users',
        component: UsersView,
      },
      {
        path: '/administracao/usuarios/novo',
        name: 'administration-users-new',
        component: UserCreateView,
      },
      {
        path: '/administracao/usuarios/:userId',
        name: 'administration-users-view',
        component: UserDetailsView,
        props: { mode: 'view' },
      },
      {
        path: '/administracao/usuarios/:userId/editar',
        name: 'administration-users-edit',
        component: UserDetailsView,
        props: { mode: 'edit' },
      },
    ],
  })
}

async function openSelect(wrapper: ReturnType<typeof mount>, testId: string) {
  const trigger = wrapper.get(`[data-testid="${testId}"]`)
  await trigger.trigger('pointerdown')
  await trigger.trigger('click')
}

describe('UsersView', () => {
  beforeEach(() => {
    usersServiceMocks.createUser.mockReset()
    usersServiceMocks.deleteUser.mockReset()
    usersServiceMocks.getUser.mockReset()
    usersServiceMocks.getUserRegistrationOptions.mockReset()
    usersServiceMocks.getUserRegistrationSubjects.mockReset()
    usersServiceMocks.listUsers.mockReset()
    usersServiceMocks.updateUser.mockReset()
    usersServiceMocks.listUsers.mockResolvedValue({
      page: 1,
      pageSize: 20,
      total: 1,
      users: [
        {
          createdAt: '2026-10-03T12:00:00.000Z',
          email: 'admin@example.com',
          id: 1,
          isActive: true,
          mustChangePassword: false,
          name: 'Administrador Teste',
          userType: 'administrador',
        },
      ],
    })
    usersServiceMocks.getUserRegistrationOptions.mockResolvedValue({
      academicPeriods: [
        { id: 201, name: '1º período', value: '1' },
        { id: 202, name: '2º período', value: '2' },
      ],
      courses: registrationCourses,
    })
    usersServiceMocks.getUserRegistrationSubjects.mockImplementation(
      async (courseIds: number[]) => ({
        subjects: registrationSubjects.filter(({ courseId }) => courseIds.includes(courseId)),
      }),
    )
    usersServiceMocks.createUser.mockResolvedValue({ message: 'Usuário criado com sucesso.' })
    usersServiceMocks.deleteUser.mockResolvedValue({ message: 'Usuário excluído com sucesso.' })
    usersServiceMocks.getUser.mockResolvedValue({
      academic: {
        academicPeriod: { id: 201, name: '1º período', value: '1' },
        courseIds: [11],
        courses: [{ id: 11, name: 'Ciência da Computação' }],
        courseSubjectIds: [101],
        subjects: [
          {
            courseId: 11,
            courseName: 'Ciência da Computação',
            courseSubjectId: 101,
            subjectId: 1001,
            subjectName: 'Algoritmos e Programação',
          },
        ],
      },
      birthDate: '2001-02-03',
      cpf: '11111111111',
      createdAt: '2026-10-01T12:00:00.000Z',
      email: 'aluno@example.com',
      id: 2,
      isActive: true,
      mustChangePassword: false,
      name: 'Aluno Teste',
      phone: '65999999999',
      updatedAt: '2026-10-02T12:00:00.000Z',
      userType: 'aluno',
    })
    usersServiceMocks.updateUser.mockResolvedValue({
      message: 'Usuário atualizado com sucesso.',
    })
  })

  it('apresenta a futura listagem e inicia o cadastro administrativo', async () => {
    const router = createAdministrationRouter()
    await router.push({ name: 'administration-users' })
    await router.isReady()

    const wrapper = mount(UsersView, {
      global: { plugins: [createPinia(), router] },
    })
    await flushPromises()

    expect(wrapper.get('h1').text()).toBe('Gerenciamento de usuários')
    expect(wrapper.text()).toContain('Usuários cadastrados')
    expect(wrapper.text()).toContain('Administrador Teste')
    expect(wrapper.text()).toContain('admin@example.com')
    expect(wrapper.text()).toContain('1 registro encontrado')
    expect(wrapper.findAll('th')).toHaveLength(6)
    expect(wrapper.findAll('th')[0]?.text()).toBe('Ações')
    expect(wrapper.findAll('article')).toHaveLength(3)
    expect(wrapper.find('[aria-label="Visualizar Administrador Teste"]').exists()).toBe(true)
    expect(wrapper.find('[aria-label="Editar Administrador Teste"]').exists()).toBe(true)
    expect(wrapper.find('[aria-label="Excluir Administrador Teste"]').exists()).toBe(true)
    expect(usersServiceMocks.listUsers).toHaveBeenCalledWith({
      isActive: undefined,
      page: 1,
      pageSize: 20,
      search: undefined,
      userType: undefined,
    })

    await wrapper.get('[data-testid="create-user-trigger"]').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.name).toBe('administration-users-new')
  })

  it('mantém o loading global ativo durante a consulta de usuários', async () => {
    let resolveRequest!: (value: {
      page: number
      pageSize: number
      total: number
      users: []
    }) => void
    usersServiceMocks.listUsers.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveRequest = resolve
      }),
    )
    const router = createAdministrationRouter()
    const pinia = createPinia()
    const loading = useLoadingStore(pinia)
    await router.push({ name: 'administration-users' })
    await router.isReady()

    const wrapper = mount(UsersView, {
      global: { plugins: [pinia, router] },
    })

    expect(loading.active).toBe(true)
    expect(loading.description).toBe('Carregando usuários...')

    resolveRequest({ page: 1, pageSize: 20, total: 0, users: [] })
    await flushPromises()

    expect(loading.active).toBe(false)
    wrapper.unmount()
  })

  it('abre a visualização completa a partir da ação da listagem', async () => {
    const router = createAdministrationRouter()
    await router.push({ name: 'administration-users' })
    await router.isReady()
    const wrapper = mount(UsersView, {
      global: { plugins: [createPinia(), router] },
    })
    await flushPromises()

    await wrapper.get('[aria-label="Visualizar Administrador Teste"]').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.name).toBe('administration-users-view')
    expect(router.currentRoute.value.params.userId).toBe('1')
  })

  it('exige a senha do administrador para excluir e recarrega a listagem', async () => {
    const router = createAdministrationRouter()
    await router.push({ name: 'administration-users' })
    await router.isReady()
    const wrapper = mount(UsersView, {
      global: { plugins: [createPinia(), router], stubs: { Teleport: true } },
    })
    await flushPromises()

    await wrapper.get('[aria-label="Excluir Administrador Teste"]').trigger('click')

    expect(wrapper.get('[role="dialog"]').text()).toContain('Excluir usuário?')
    expect(wrapper.get('[data-testid="confirm-dialog-confirm"]').attributes()).toHaveProperty(
      'disabled',
    )

    await wrapper.get('input[name="deleteConfirmationPassword"]').setValue('admin-password')
    await wrapper.get('[data-testid="confirm-dialog-confirm"]').trigger('click')
    await vi.waitFor(() => expect(usersServiceMocks.deleteUser).toHaveBeenCalledOnce())

    expect(usersServiceMocks.deleteUser).toHaveBeenCalledWith(1, 'admin-password')
    expect(usersServiceMocks.listUsers).toHaveBeenCalledTimes(2)
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
  })

  it('apresenta os detalhes em campos desabilitados e permite entrar na edição', async () => {
    const router = createAdministrationRouter()
    await router.push({ name: 'administration-users-view', params: { userId: 2 } })
    await router.isReady()
    const wrapper = mount(UserDetailsView, {
      props: { mode: 'view' },
      global: { plugins: [createPinia(), router] },
    })
    await flushPromises()

    expect(wrapper.get('h1').text()).toBe('Visualizar usuário')
    expect(wrapper.get('input[name="name"]').attributes()).toHaveProperty('disabled')
    expect(wrapper.get('input[name="email"]').attributes()).toHaveProperty('disabled')
    expect(wrapper.text()).toContain('Algoritmos e Programação')
    expect(wrapper.find('[data-testid="save-user-changes"]').exists()).toBe(false)

    await wrapper.get('[data-testid="edit-user"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('administration-users-edit')
  })

  it('edita o usuário pela mesma view respeitando o vínculo acadêmico', async () => {
    const router = createAdministrationRouter()
    await router.push({ name: 'administration-users-edit', params: { userId: 2 } })
    await router.isReady()
    const wrapper = mount(UserDetailsView, {
      props: { mode: 'edit' },
      global: { plugins: [createPinia(), router] },
    })
    await flushPromises()

    expect(wrapper.get('h1').text()).toBe('Editar usuário')
    await wrapper.get('input[name="name"]').setValue('Aluno Atualizado')
    await wrapper.get('form').trigger('submit')
    await vi.waitFor(() => expect(usersServiceMocks.updateUser).toHaveBeenCalledOnce())

    expect(usersServiceMocks.updateUser).toHaveBeenCalledWith(
      2,
      expect.objectContaining({
        academic: {
          academicPeriodId: 201,
          courseIds: [11],
          courseSubjectIds: [101],
        },
        name: 'Aluno Atualizado',
        userType: 'aluno',
      }),
    )
    expect(router.currentRoute.value.name).toBe('administration-users-view')
  })

  it('consulta usuários com busca, filtros e paginação controlados pela tela', async () => {
    usersServiceMocks.listUsers.mockResolvedValue({
      page: 1,
      pageSize: 20,
      total: 45,
      users: [
        {
          createdAt: '2026-10-03T12:00:00.000Z',
          email: 'professora@example.com',
          id: 2,
          isActive: true,
          mustChangePassword: false,
          name: 'Ana Professora',
          userType: 'professor',
        },
      ],
    })
    const router = createAdministrationRouter()
    await router.push({ name: 'administration-users' })
    await router.isReady()

    const wrapper = mount(UsersView, {
      global: { plugins: [createPinia(), router] },
    })
    await flushPromises()

    await wrapper.get('[data-testid="table-search"]').setValue('Ana')
    await flushPromises()

    expect(usersServiceMocks.listUsers).toHaveBeenCalledTimes(1)

    await wrapper.get('form[role="search"]').trigger('submit')
    await flushPromises()

    expect(usersServiceMocks.listUsers).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 1, search: 'Ana' }),
    )

    await wrapper.get('[data-testid="table-filter-userType"]').setValue('professor')
    await flushPromises()
    expect(usersServiceMocks.listUsers).toHaveBeenLastCalledWith(
      expect.objectContaining({ search: 'Ana', userType: 'professor' }),
    )

    await wrapper.get('[data-testid="table-page-2"]').trigger('click')
    expect(usersServiceMocks.listUsers).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 2, search: 'Ana', userType: 'professor' }),
    )
  })

  it('exige telefone com DDD antes de avançar no cadastro', async () => {
    const router = createAdministrationRouter()
    await router.push({ name: 'administration-users-new' })
    await router.isReady()

    const wrapper = mount(UserCreateView, {
      global: { plugins: [router], stubs: { Teleport: true } },
    })

    expect(wrapper.get('input[name="phone"]').attributes()).toHaveProperty('required')

    await wrapper.get('input[name="name"]').setValue('Usuário sem telefone')
    await wrapper.get('input[name="cpf"]').setValue('33333333333')
    await wrapper.get('input[name="birthDate"]').setValue('2000-01-01')
    await wrapper.get('input[name="email"]').setValue('sem.telefone@instituicao.edu.br')
    await wrapper.get('form').trigger('submit')

    await vi.waitFor(() => expect(wrapper.text()).toContain('Informe o telefone.'))
    expect(wrapper.get('h2').text()).toBe('Dados pessoais')
  })

  it('adapta as etapas ao perfil de professor e apresenta a revisão', async () => {
    const router = createAdministrationRouter()
    await router.push({ name: 'administration-users-new' })
    await router.isReady()

    const wrapper = mount(UserCreateView, {
      global: { plugins: [router], stubs: { Teleport: true } },
    })

    expect(wrapper.get('h1').text()).toBe('Cadastrar usuário')
    expect(wrapper.text()).toContain('Dados pessoais')
    expect(wrapper.findAll('nav li')).toHaveLength(4)

    await wrapper.get('input[name="name"]').setValue('Ada Lovelace')
    await wrapper.get('input[name="cpf"]').setValue('00000000000')
    await wrapper.get('input[name="birthDate"]').setValue('2000-01-01')
    await wrapper.get('input[name="email"]').setValue('ada@instituicao.edu.br')
    await wrapper.get('input[name="phone"]').setValue('65999999999')
    await wrapper.get('form').trigger('submit')
    await vi.waitFor(() => expect(wrapper.text()).toContain('Tipo de usuário'))

    await wrapper.get('input[value="teacher"]').setValue(true)
    await wrapper.get('input[name="temporaryPassword"]').setValue('senha-temporaria')
    await wrapper.get('input[name="temporaryPasswordConfirmation"]').setValue('senha-temporaria')
    await wrapper.get('form').trigger('submit')
    await vi.waitFor(() => expect(wrapper.get('h2').text()).toBe('Vínculo acadêmico'))

    expect(wrapper.findAll('nav li')).toHaveLength(4)
    expect(wrapper.find('input[value="201"]').exists()).toBe(false)
    await vi.waitFor(() => expect(usersServiceMocks.getUserRegistrationOptions).toHaveBeenCalled())
    await openSelect(wrapper, 'course-select')
    await wrapper.get('input[value="11"]').setValue(true)
    await vi.waitFor(() =>
      expect(usersServiceMocks.getUserRegistrationSubjects).toHaveBeenCalledWith([11]),
    )
    await openSelect(wrapper, 'subject-select')
    expect(wrapper.find('input[value="102"]').exists()).toBe(false)
    await wrapper.get('input[value="101"]').setValue(true)
    await wrapper.get('form').trigger('submit')
    await vi.waitFor(() => expect(wrapper.text()).toContain('Revisão do cadastro'))

    expect(wrapper.text()).toContain('Ada Lovelace')
    expect(wrapper.text()).toContain('Professor')
    expect(wrapper.text()).toContain('Ciência da Computação')
    expect(wrapper.text()).toContain('Algoritmos e Programação')
    expect(wrapper.text()).not.toContain('Período atual')
    expect(wrapper.text()).toContain('Senha temporária definida')
    expect(wrapper.get('[data-testid="save-user"]').text()).toContain('Salvar usuário')

    await wrapper.get('[data-testid="save-user"]').trigger('click')
    await vi.waitFor(() =>
      expect(wrapper.find('[data-testid="registration-success"]').exists()).toBe(true),
    )

    expect(usersServiceMocks.createUser).toHaveBeenCalledWith(
      expect.objectContaining({
        academic: expect.objectContaining({ courseIds: [11], courseSubjectIds: [101] }),
        isActive: true,
        temporaryPassword: 'senha-temporaria',
        userType: 'professor',
      }),
    )
    expect(wrapper.find('[data-testid="back-after-create"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="register-another-user"]').exists()).toBe(true)

    await wrapper.get('[data-testid="register-another-user"]').trigger('click')

    expect(wrapper.get('h2').text()).toBe('Dados pessoais')
    expect((wrapper.get('input[name="name"]').element as HTMLInputElement).value).toBe('')
    expect(wrapper.find('[data-testid="registration-success"]').exists()).toBe(false)
  })

  it('mantém quatro etapas e limita aluno a um vínculo por seletor', async () => {
    const router = createAdministrationRouter()
    await router.push({ name: 'administration-users-new' })
    await router.isReady()

    const wrapper = mount(UserCreateView, {
      global: { plugins: [router], stubs: { Teleport: true } },
    })

    await wrapper.get('input[name="name"]').setValue('Grace Hopper')
    await wrapper.get('input[name="cpf"]').setValue('11111111111')
    await wrapper.get('input[name="birthDate"]').setValue('2001-02-03')
    await wrapper.get('input[name="email"]').setValue('grace@instituicao.edu.br')
    await wrapper.get('input[name="phone"]').setValue('65999999999')
    await wrapper.get('form').trigger('submit')
    await vi.waitFor(() => expect(wrapper.text()).toContain('Tipo de usuário'))

    await wrapper.get('input[value="student"]').setValue(true)
    await wrapper.get('input[name="temporaryPassword"]').setValue('senha-temporaria')
    await wrapper.get('input[name="temporaryPasswordConfirmation"]').setValue('senha-temporaria')
    await wrapper.get('form').trigger('submit')
    await vi.waitFor(() => expect(wrapper.get('h2').text()).toBe('Vínculo acadêmico'))

    expect(wrapper.findAll('nav li')).toHaveLength(4)
    await vi.waitFor(() => expect(usersServiceMocks.getUserRegistrationOptions).toHaveBeenCalled())
    await openSelect(wrapper, 'course-select')
    await wrapper.get('input[value="11"]').setValue(true)
    await openSelect(wrapper, 'course-select')
    await wrapper.get('input[value="12"]').setValue(true)
    expect(wrapper.get('[data-testid="course-select"]').text()).toContain('Medicina')
    await vi.waitFor(() =>
      expect(usersServiceMocks.getUserRegistrationSubjects).toHaveBeenCalledWith([12]),
    )
    await openSelect(wrapper, 'subject-select')
    await wrapper.get('input[value="102"]').setValue(true)
    await wrapper.get('input[value="103"]').setValue(true)
    await openSelect(wrapper, 'period-select')
    await wrapper.get('input[value="202"]').setValue(true)
    await wrapper.get('form').trigger('submit')
    await vi.waitFor(() => expect(wrapper.text()).toContain('Revisão do cadastro'))

    expect(wrapper.text()).toContain('Aluno')
    expect(wrapper.text()).toContain('Medicina')
    expect(wrapper.text()).toContain('Anatomia')
    expect(wrapper.text()).toContain('Bioética')
    expect(wrapper.text()).toContain('2º período')
  })

  it('impede avançar quando a confirmação da senha temporária é diferente', async () => {
    const router = createAdministrationRouter()
    await router.push({ name: 'administration-users-new' })
    await router.isReady()

    const wrapper = mount(UserCreateView, {
      global: { plugins: [router], stubs: { Teleport: true } },
    })

    await wrapper.get('input[name="name"]').setValue('Margaret Hamilton')
    await wrapper.get('input[name="cpf"]').setValue('22222222222')
    await wrapper.get('input[name="birthDate"]').setValue('2000-05-05')
    await wrapper.get('input[name="email"]').setValue('margaret@instituicao.edu.br')
    await wrapper.get('input[name="phone"]').setValue('65999999999')
    await wrapper.get('form').trigger('submit')
    await vi.waitFor(() => expect(wrapper.text()).toContain('Tipo de usuário'))

    await wrapper.get('input[value="teacher"]').setValue(true)
    await wrapper.get('input[name="temporaryPassword"]').setValue('senha-temporaria')
    await wrapper.get('input[name="temporaryPasswordConfirmation"]').setValue('outra-senha')
    await wrapper.get('form').trigger('submit')

    await vi.waitFor(() =>
      expect(wrapper.text()).toContain('As senhas temporárias devem ser iguais.'),
    )
    expect(wrapper.get('h2').text()).toBe('Perfil de acesso')
  })

  it('permite voltar do cadastro à listagem', async () => {
    const router = createAdministrationRouter()
    await router.push({ name: 'administration-users-new' })
    await router.isReady()

    const wrapper = mount(UserCreateView, {
      global: { plugins: [router] },
    })

    await wrapper.get('[data-testid="back-to-users"]').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.name).toBe('administration-users')
  })
})
