import { apiRequest } from '@/services/api'
import type {
  CreateAvailabilityPayload,
  CreateAvailabilityResponse,
  ListAdminAvailabilityParams,
  ListAdminAvailabilityResponse,
  ListOwnAvailabilityResponse,
  ListStudentAvailabilityParams,
  ListStudentAvailabilityResponse,
} from '@/types/availability'

export function listOwnAvailabilities(): Promise<ListOwnAvailabilityResponse> {
  return apiRequest<ListOwnAvailabilityResponse>('/professor/availability', {
    notification: { error: false, success: false },
  })
}

export function createAvailabilities(
  payload: CreateAvailabilityPayload,
): Promise<CreateAvailabilityResponse> {
  return apiRequest<CreateAvailabilityResponse>('/professor/availability', {
    body: JSON.stringify(payload),
    method: 'POST',
  })
}

export function listStudentAvailabilities(
  params: ListStudentAvailabilityParams,
): Promise<ListStudentAvailabilityResponse> {
  const query = new URLSearchParams({ from: params.from, to: params.to })
  if (params.modality) query.set('modality', params.modality)

  return apiRequest<ListStudentAvailabilityResponse>(`/availability?${query.toString()}`, {
    notification: { error: false, success: false },
  })
}

export function listAdminAvailabilities(
  params: ListAdminAvailabilityParams,
): Promise<ListAdminAvailabilityResponse> {
  const query = new URLSearchParams({ from: params.from, to: params.to })
  if (params.modality) query.set('modality', params.modality)
  if (params.state) query.set('state', params.state)

  return apiRequest<ListAdminAvailabilityResponse>(`/admin/availability?${query.toString()}`, {
    notification: { error: false, success: false },
  })
}
