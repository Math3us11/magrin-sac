import { apiRequest } from '@/services/api'
import type { AuthenticatedUser, LoginCredentials, LoginResponse } from '@/types/auth'

export function createSession(credentials: LoginCredentials): Promise<LoginResponse> {
  return apiRequest<LoginResponse>('/auth/login', {
    body: JSON.stringify(credentials),
    method: 'POST',
  })
}

export function deleteSession(): Promise<void> {
  return apiRequest<void>('/auth/logout', { method: 'POST' })
}

export function getCurrentUser(): Promise<AuthenticatedUser> {
  return apiRequest<AuthenticatedUser>('/me')
}
