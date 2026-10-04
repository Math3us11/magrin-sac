import { apiRequest } from '@/services/api'
import { encryptCredential } from '@/services/credential-encryption'
import type {
  CreateUserPayload,
  CreateUserResponse,
  RegistrationOptionsResponse,
  RegistrationSubjectsResponse,
} from '@/types/user-registration'
import type {
  DeleteUserResponse,
  ListUsersParams,
  ListUsersResponse,
  UpdateUserPayload,
  UpdateUserResponse,
  UserDetails,
} from '@/types/user'

export function listUsers(params: ListUsersParams = {}): Promise<ListUsersResponse> {
  const searchParams = new URLSearchParams({
    page: String(params.page ?? 1),
    pageSize: String(params.pageSize ?? 20),
  })

  if (params.search) searchParams.set('search', params.search)
  if (params.userType) searchParams.set('userType', params.userType)
  if (params.isActive !== undefined) searchParams.set('isActive', String(params.isActive))

  return apiRequest<ListUsersResponse>(`/admin/users?${searchParams.toString()}`)
}

export async function createUser(payload: CreateUserPayload): Promise<CreateUserResponse> {
  const { temporaryPassword, ...user } = payload
  const encryptedTemporaryPassword = await encryptCredential(temporaryPassword, 'user-registration')

  return apiRequest<CreateUserResponse>('/admin/users', {
    body: JSON.stringify({ ...user, temporaryPassword: encryptedTemporaryPassword }),
    method: 'POST',
  })
}

export function getUser(userId: number): Promise<UserDetails> {
  return apiRequest<UserDetails>(`/admin/users/${userId}`)
}

export function updateUser(
  userId: number,
  payload: UpdateUserPayload,
): Promise<UpdateUserResponse> {
  return apiRequest<UpdateUserResponse>(`/admin/users/${userId}`, {
    body: JSON.stringify(payload),
    method: 'PATCH',
  })
}

export async function deleteUser(
  userId: number,
  confirmationPassword: string,
): Promise<DeleteUserResponse> {
  const credential = await encryptCredential(confirmationPassword, 'user-deletion-confirmation')

  return apiRequest<DeleteUserResponse>(`/admin/users/${userId}`, {
    body: JSON.stringify({ credential }),
    method: 'DELETE',
    notification: { error: false, success: true },
  })
}

export function getUserRegistrationOptions(): Promise<RegistrationOptionsResponse> {
  return apiRequest<RegistrationOptionsResponse>('/admin/users/registration-options')
}

export function getUserRegistrationSubjects(
  courseIds: number[],
): Promise<RegistrationSubjectsResponse> {
  const searchParams = new URLSearchParams()

  for (const courseId of courseIds) {
    searchParams.append('courseIds', String(courseId))
  }

  return apiRequest<RegistrationSubjectsResponse>(
    `/admin/users/registration-options/subjects?${searchParams.toString()}`,
  )
}
