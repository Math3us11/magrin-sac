export const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api'

type ErrorPayload = {
  error?: { message?: unknown }
  message?: unknown
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

function extractErrorMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null

  const errorPayload = payload as ErrorPayload
  const message = errorPayload.error?.message ?? errorPayload.message

  if (typeof message === 'string') return message
  if (Array.isArray(message) && message.every((item) => typeof item === 'string')) {
    return message.join(' ')
  }

  return null
}

async function parseResponse(response: Response): Promise<unknown> {
  if (response.status === 204) return undefined

  const contentType = response.headers.get('content-type')
  if (!contentType?.includes('application/json')) return undefined

  try {
    return await response.json()
  } catch {
    return undefined
  }
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  headers.set('Accept', 'application/json')

  if (init.body && !(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }

  let response: Response

  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      ...init,
      credentials: 'include',
      headers,
    })
  } catch {
    throw new ApiError(0, 'Não foi possível conectar ao sistema. Tente novamente em instantes.')
  }

  const payload = await parseResponse(response)

  if (!response.ok) {
    throw new ApiError(
      response.status,
      extractErrorMessage(payload) ?? 'Não foi possível concluir a solicitação.',
    )
  }

  return payload as T
}
