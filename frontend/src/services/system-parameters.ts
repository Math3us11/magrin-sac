import { apiRequest } from '@/services/api'
import type {
  ListSystemParametersResponse,
  SystemParameterName,
  UpdateSystemParameterPayload,
  UpdateSystemParameterResponse,
} from '@/types/system-parameter'

export function listSystemParameters(): Promise<ListSystemParametersResponse> {
  return apiRequest<ListSystemParametersResponse>('/admin/system-parameters', {
    notification: { error: false, success: false },
  })
}

export function updateSystemParameter(
  name: SystemParameterName,
  payload: UpdateSystemParameterPayload,
): Promise<UpdateSystemParameterResponse> {
  return apiRequest<UpdateSystemParameterResponse>(
    `/admin/system-parameters/${encodeURIComponent(name)}`,
    {
      body: JSON.stringify(payload),
      method: 'PATCH',
      notification: { error: false },
    },
  )
}
