import { apiRequest } from '@/services/api'
import { encryptCredential } from '@/services/credential-encryption'
import type {
  AuthenticatedUser,
  LoginCredentials,
  LoginResponse,
  SessionPolicy,
} from '@/types/auth'

export type FirstAccessPasswordResponse = {
  message: string
}

export async function createSession(
  credentials: LoginCredentials,
  options: { quiet?: boolean } = {},
): Promise<LoginResponse> {
  const credential = await encryptCredential(credentials.password, 'login')

  return apiRequest<LoginResponse>('/auth/login', {
    body: JSON.stringify({ credential, email: credentials.email }),
    method: 'POST',
    ...(options.quiet ? { notification: false } : {}),
  })
}

export function deleteSession(options: { quiet?: boolean } = {}): Promise<void> {
  return apiRequest<void>('/auth/logout', {
    method: 'POST',
    ...(options.quiet ? { notification: false } : {}),
  })
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

export function getSessionPolicy(): Promise<SessionPolicy> {
  return apiRequest<SessionPolicy>('/me/session', { notification: false })
}
