import { apiRequest } from '@/services/api'
import type { RegisterAttendancePayload, RegisterAttendanceResponse } from '@/types/attendance'

export function registerAssignedAttendance(
  appointmentId: number,
  payload: RegisterAttendancePayload,
): Promise<RegisterAttendanceResponse> {
  return apiRequest<RegisterAttendanceResponse>(
    `/professor/appointments/${appointmentId}/attendance`,
    { body: JSON.stringify(payload), method: 'PUT' },
  )
}

export function registerAdminAttendance(
  appointmentId: number,
  payload: RegisterAttendancePayload,
): Promise<RegisterAttendanceResponse> {
  return apiRequest<RegisterAttendanceResponse>(`/admin/appointments/${appointmentId}/attendance`, {
    body: JSON.stringify(payload),
    method: 'PUT',
  })
}
