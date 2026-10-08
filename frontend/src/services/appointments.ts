import { apiRequest } from '@/services/api'
import type {
  CreateAppointmentPayload,
  CreateAppointmentResponse,
  ListAdminAppointmentsParams,
  ListAdminAppointmentsResponse,
  ListOwnAppointmentsParams,
  ListOwnAppointmentsResponse,
} from '@/types/appointment'

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
