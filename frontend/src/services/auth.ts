import { apiRequest } from '@/services/api'
import { encryptCredential } from '@/services/credential-encryption'
import type { AuthenticatedUser, LoginCredentials, LoginResponse } from '@/types/auth'

export type FirstAccessPasswordResponse = {
  message: string
}

export async function createSession(credentials: LoginCredentials): Promise<LoginResponse> {
  const credential = await encryptCredential(credentials.password, 'login')

  return apiRequest<LoginResponse>('/auth/login', {
    body: JSON.stringify({ credential, email: credentials.email }),
    method: 'POST',
  })
}

export function deleteSession(): Promise<void> {
  return apiRequest<void>('/auth/logout', { method: 'POST' })
}

export async function completeFirstAccessPassword(
  newPassword: string,
): Promise<FirstAccessPasswordResponse> {
  const credential = await encryptCredential(newPassword, 'first-access-password')

  return apiRequest<FirstAccessPasswordResponse>('/auth/first-access/password', {
    body: JSON.stringify({ credential }),
    method: 'POST',
    notification: false,
  })
}

export function getCurrentUser(): Promise<AuthenticatedUser> {
  return apiRequest<AuthenticatedUser>('/me', { notification: false })
}
