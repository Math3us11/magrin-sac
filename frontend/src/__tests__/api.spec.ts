import { afterEach, describe, expect, it, vi } from 'vitest'

import { ApiError } from '@/services/api'
import { createSession } from '@/services/auth'

afterEach(() => {
  vi.unstubAllGlobals()
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
      expect.objectContaining({ credentials: 'include', method: 'POST' }),
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
})
