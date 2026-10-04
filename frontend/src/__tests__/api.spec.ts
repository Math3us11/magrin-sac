import { afterEach, describe, expect, it, vi } from 'vitest'

const credentialEncryptionMocks = vi.hoisted(() => ({
  encryptCredential: vi.fn(
    async (
      _plaintext: string,
      purpose:
        'first-access-password' | 'login' | 'user-deletion-confirmation' | 'user-registration',
    ) => ({
      algorithm: 'RSA-OAEP-256+A256GCM' as const,
      ciphertext: 'encrypted-password',
      encryptedKey: 'encrypted-aes-key',
      iv: 'random-iv',
      issuedAt: 1_800_000_000_000,
      keyId: 'public-key-id',
      purpose,
    }),
  ),
}))

vi.mock('@/services/credential-encryption', () => credentialEncryptionMocks)

import { ApiError } from '@/services/api'
import { createAvailabilities, listOwnAvailabilities } from '@/services/availability'
import { completeFirstAccessPassword, createSession } from '@/services/auth'
import {
  createUser,
  deleteUser,
  getUser,
  getUserRegistrationOptions,
  getUserRegistrationSubjects,
  listUsers,
  updateUser,
} from '@/services/users'

afterEach(() => {
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

describe('serviço de disponibilidades', () => {
  it('consulta a agenda própria e publica o lote normalizado', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            availabilities: [],
            summary: { available: 0, blocked: 0, reserved: 0 },
          }),
          { headers: { 'Content-Type': 'application/json' }, status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            availabilities: [],
            message: 'Disponibilidade publicada com sucesso.',
          }),
          { headers: { 'Content-Type': 'application/json' }, status: 201 },
        ),
      )
    vi.stubGlobal('fetch', fetchMock)

    await listOwnAvailabilities()
    await createAvailabilities({
      items: [
        {
          date: '2099-10-03',
          endTime: '14:45',
          modalities: ['presencial', 'online'],
          startTime: '14:00',
        },
      ],
    })

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      '/api/professor/availability',
      expect.objectContaining({ credentials: 'include' }),
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/professor/availability',
      expect.objectContaining({
        body: JSON.stringify({
          items: [
            {
              date: '2099-10-03',
              endTime: '14:45',
              modalities: ['presencial', 'online'],
              startTime: '14:00',
            },
          ],
        }),
        credentials: 'include',
        method: 'POST',
      }),
    )
  })
})

describe('serviço de autenticação', () => {
  it('envia credenciais com cookies habilitados e não expõe o token ao JavaScript', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          user: {
            birthDate: null,
            email: 'admin@example.com',
            id: 1,
            mustChangePassword: false,
            name: 'Administrador',
            userType: 'administrador',
          },
        }),
        { headers: { 'Content-Type': 'application/json' }, status: 200 },
      ),
    )
    vi.stubGlobal('fetch', fetchMock)

    const response = await createSession({
      email: 'admin@example.com',
      password: 'test-password',
    })

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/auth/login',
      expect.objectContaining({
        body: expect.not.stringContaining('test-password'),
        credentials: 'include',
        method: 'POST',
      }),
    )
    expect(credentialEncryptionMocks.encryptCredential).toHaveBeenCalledWith(
      'test-password',
      'login',
    )
    expect(response.user.userType).toBe('administrador')
    expect(response).not.toHaveProperty('token')
  })

  it('converte o erro seguro do backend em ApiError', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ message: 'E-mail ou senha inválidos.' }), {
          headers: { 'Content-Type': 'application/json' },
          status: 401,
        }),
      ),
    )

    const error = await createSession({
      email: 'admin@example.com',
      password: 'wrong-password',
    }).catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(ApiError)
    if (!(error instanceof ApiError)) throw new TypeError('ApiError esperado no teste.')
    expect(error.status).toBe(401)
  })

  it('envia a nova senha do primeiro acesso cifrada e vinculada à sessão', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ message: 'Senha definida com sucesso.' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await completeFirstAccessPassword('new-secure-password')

    expect(credentialEncryptionMocks.encryptCredential).toHaveBeenCalledWith(
      'new-secure-password',
      'first-access-password',
    )
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/auth/first-access/password',
      expect.objectContaining({
        body: expect.not.stringContaining('new-secure-password'),
        credentials: 'include',
        method: 'POST',
      }),
    )
  })
})

describe('serviço de usuários', () => {
  it('consulta a listagem paginada de usuários', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ page: 2, pageSize: 10, total: 0, users: [] }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await listUsers({
      isActive: false,
      page: 2,
      pageSize: 10,
      search: 'professor',
      userType: 'professor',
    })

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/admin/users?page=2&pageSize=10&search=professor&userType=professor&isActive=false',
      expect.objectContaining({ credentials: 'include' }),
    )
  })

  it('confirma a exclusão administrativa sem expor a senha no payload', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ message: 'Usuário excluído com sucesso.' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await deleteUser(12, 'admin-password')

    expect(credentialEncryptionMocks.encryptCredential).toHaveBeenCalledWith(
      'admin-password',
      'user-deletion-confirmation',
    )
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/admin/users/12',
      expect.objectContaining({
        body: expect.not.stringContaining('admin-password'),
        credentials: 'include',
        method: 'DELETE',
      }),
    )
  })

  it('consulta os catálogos e serializa os cursos selecionados na busca de matérias', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ academicPeriods: [], courses: [] }), {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ subjects: [] }), {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        }),
      )
    vi.stubGlobal('fetch', fetchMock)

    await getUserRegistrationOptions()
    await getUserRegistrationSubjects([11, 12])

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      '/api/admin/users/registration-options',
      expect.objectContaining({ credentials: 'include' }),
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/admin/users/registration-options/subjects?courseIds=11&courseIds=12',
      expect.objectContaining({ credentials: 'include' }),
    )
  })

  it('envia o cadastro por POST com a senha temporária criptografada', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ message: 'Usuário criado com sucesso.' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 201,
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await createUser({
      academic: { academicPeriodId: 71, courseIds: [1], courseSubjectIds: [10] },
      birthDate: '2001-02-03',
      cpf: '111.111.111-11',
      email: 'aluno@example.com',
      isActive: true,
      name: 'Aluno Teste',
      phone: '65999999999',
      temporaryPassword: 'senha-temporaria',
      userType: 'aluno',
    })

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/admin/users',
      expect.objectContaining({
        body: expect.not.stringContaining('senha-temporaria'),
        credentials: 'include',
        method: 'POST',
      }),
    )
    expect(credentialEncryptionMocks.encryptCredential).toHaveBeenCalledWith(
      'senha-temporaria',
      'user-registration',
    )
  })

  it('consulta e atualiza os detalhes de um usuário sem enviar credenciais', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: 12, name: 'Aluno Teste' }), {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ message: 'Usuário atualizado com sucesso.' }), {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        }),
      )
    vi.stubGlobal('fetch', fetchMock)

    await getUser(12)
    await updateUser(12, {
      academic: { academicPeriodId: 71, courseIds: [1], courseSubjectIds: [10] },
      birthDate: '2001-02-03',
      cpf: '11111111111',
      email: 'aluno@example.com',
      isActive: false,
      name: 'Aluno Teste',
      phone: '65999999999',
      userType: 'aluno',
    })

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      '/api/admin/users/12',
      expect.objectContaining({ credentials: 'include' }),
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/admin/users/12',
      expect.objectContaining({
        body: expect.not.stringContaining('password'),
        credentials: 'include',
        method: 'PATCH',
      }),
    )
  })
})
