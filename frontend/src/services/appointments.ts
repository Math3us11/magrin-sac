import { apiRequest } from '@/services/api'
import { encryptCredential } from '@/services/credential-encryption'
import type {
  CancelAppointmentResponse,
  CreateAppointmentPayload,
  CreateAppointmentResponse,
  ListAdminAppointmentsParams,
  ListAdminAppointmentsResponse,
  ListOwnAppointmentsParams,
  ListOwnAppointmentsResponse,
} from '@/types/appointment'

export function cancelOwnAppointment(
  appointmentId: number,
  reason: string,
): Promise<CancelAppointmentResponse> {
  return apiRequest<CancelAppointmentResponse>(`/appointments/${appointmentId}/cancel`, {
    body: JSON.stringify({ reason }),
    method: 'POST',
  })
}

export function cancelAssignedAppointment(
  appointmentId: number,
  reason: string,
): Promise<CancelAppointmentResponse> {
  return apiRequest<CancelAppointmentResponse>(`/professor/appointments/${appointmentId}/cancel`, {
    body: JSON.stringify({ reason }),
    method: 'POST',
  })
}

export async function cancelAdminAppointment(
  appointmentId: number,
  reason: string,
  password: string,
): Promise<CancelAppointmentResponse> {
  const credential = await encryptCredential(password, 'appointment-admin-cancellation')

  return apiRequest<CancelAppointmentResponse>(`/admin/appointments/${appointmentId}/cancel`, {
    body: JSON.stringify({ credential, reason }),
    method: 'POST',
  })
}

export function listAssignedAppointments(
  params: ListAdminAppointmentsParams,
): Promise<ListAdminAppointmentsResponse> {
  const query = new URLSearchParams({ from: params.from, to: params.to })
  if (params.status) query.set('status', params.status)

  return apiRequest<ListAdminAppointmentsResponse>(`/professor/appointments?${query.toString()}`, {
    notification: { error: false, success: false },
  })
}

export function createAppointment(
  payload: CreateAppointmentPayload,
): Promise<CreateAppointmentResponse> {
  return apiRequest<CreateAppointmentResponse>('/appointments', {
    body: JSON.stringify(payload),
    method: 'POST',
  })
}

export function listAdminAppointments(
  params: ListAdminAppointmentsParams,
): Promise<ListAdminAppointmentsResponse> {
  const query = new URLSearchParams({ from: params.from, to: params.to })
  if (params.status) query.set('status', params.status)

  return apiRequest<ListAdminAppointmentsResponse>(`/admin/appointments?${query.toString()}`, {
    notification: { error: false, success: false },
  })
}

export function listOwnAppointments(
  params: ListOwnAppointmentsParams,
): Promise<ListOwnAppointmentsResponse> {
  const query = new URLSearchParams()
  if (params.from) query.set('from', params.from)
  if (params.to) query.set('to', params.to)
  if (params.scope) query.set('scope', params.scope)
  if (params.status) query.set('status', params.status)
  if (params.modality) query.set('modality', params.modality)
  if (params.page) query.set('page', String(params.page))
  if (params.pageSize) query.set('pageSize', String(params.pageSize))

  return apiRequest<ListOwnAppointmentsResponse>(`/appointments/mine?${query.toString()}`, {
    notification: { error: false, success: false },
  })
}
