import { pinia } from '@/stores'
import { useNotificationStore } from '@/stores/notification'
import type { NotificationType } from '@/types/notification'

export const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api'

type ErrorPayload = {
  error?: { message?: unknown }
  message?: unknown
  type?: unknown
}

type ApiNotificationOptions = {
  error?: boolean
  success?: boolean
}

export type ApiRequestOptions = RequestInit & {
  notification?: ApiNotificationOptions | boolean
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly type: NotificationType,
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

function extractNotificationType(payload: unknown): NotificationType | null {
  if (!payload || typeof payload !== 'object') return null

  const type = (payload as ErrorPayload).type
  return type === 'success' || type === 'info' || type === 'warning' || type === 'error'
    ? type
    : null
}

function inferErrorNotificationType(status: number): NotificationType {
  if (status === 404) return 'info'
  if ([400, 401, 403, 409, 422, 429].includes(status)) return 'warning'
  return 'error'
}

function shouldNotify(
  notification: ApiRequestOptions['notification'],
  kind: keyof ApiNotificationOptions,
): boolean {
  if (notification === false) return false
  if (notification === true || notification === undefined) return true
  return notification[kind] ?? true
}

export function notifyApiFeedback(
  payload: unknown,
  response: Pick<Response, 'ok' | 'status'>,
  notification: ApiRequestOptions['notification'] = true,
): void {
  const message = extractErrorMessage(payload)
  const kind = response.ok ? 'success' : 'error'

  if (!message || !shouldNotify(notification, kind)) return

  useNotificationStore(pinia).notify({
    message,
    type:
      extractNotificationType(payload) ??
      (response.ok ? 'success' : inferErrorNotificationType(response.status)),
  })
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

export async function apiRequest<T>(path: string, init: ApiRequestOptions = {}): Promise<T> {
  const { notification, ...requestInit } = init
  const headers = new Headers(requestInit.headers)
  headers.set('Accept', 'application/json')

  if (requestInit.body && !(requestInit.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }

  let response: Response

  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      ...requestInit,
      credentials: 'include',
      headers,
    })
  } catch {
    const message = 'Não foi possível conectar ao sistema. Tente novamente em instantes.'
    const type = inferErrorNotificationType(0)

    if (shouldNotify(notification, 'error')) {
      useNotificationStore(pinia).notify({ message, type })
    }

    throw new ApiError(0, message, type)
  }

  const payload = await parseResponse(response)
  notifyApiFeedback(payload, response, notification)

  if (!response.ok) {
    const message = extractErrorMessage(payload) ?? 'Não foi possível concluir a solicitação.'
    const type = extractNotificationType(payload) ?? inferErrorNotificationType(response.status)

    if (!extractErrorMessage(payload) && shouldNotify(notification, 'error')) {
      useNotificationStore(pinia).notify({ message, type })
    }

    throw new ApiError(response.status, message, type)
  }

  return payload as T
}
