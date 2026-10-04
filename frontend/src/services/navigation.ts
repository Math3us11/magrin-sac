import { apiRequest } from '@/services/api'
import type { NavigationResponse } from '@/types/navigation'

export function getCurrentNavigation(): Promise<NavigationResponse> {
  return apiRequest<NavigationResponse>('/me/navigation')
}
