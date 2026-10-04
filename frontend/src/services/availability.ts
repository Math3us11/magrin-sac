import { apiRequest } from '@/services/api'
import type {
  CreateAvailabilityPayload,
  CreateAvailabilityResponse,
  ListOwnAvailabilityResponse,
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
