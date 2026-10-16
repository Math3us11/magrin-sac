import { apiRequest } from '@/services/api'
import type {
  AttendanceDetailResponse,
  ListAttendancesParams,
  ListAttendancesResponse,
  RegisterAttendancePayload,
  RegisterAttendanceResponse,
  UpdateAttendanceStatusPayload,
  UpdateAttendanceStatusResponse,
} from '@/types/attendance'

type AttendanceScope = 'admin' | 'professor'

function scopePath(scope: AttendanceScope): string {
  return scope === 'admin' ? '/admin' : '/professor'
}

function attendanceQuery(params: ListAttendancesParams): string {
  const query = new URLSearchParams({ from: params.from, to: params.to })
  if (params.occurrence) query.set('occurrence', params.occurrence)
  if (params.resolutionStatus) query.set('resolutionStatus', params.resolutionStatus)
  return query.toString()
}

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

export function listAttendances(
  scope: AttendanceScope,
  params: ListAttendancesParams,
): Promise<ListAttendancesResponse> {
  return apiRequest<ListAttendancesResponse>(
    `${scopePath(scope)}/attendances?${attendanceQuery(params)}`,
    { notification: { error: false, success: false } },
  )
}

export function getAttendance(
  scope: AttendanceScope,
  attendanceId: number,
): Promise<AttendanceDetailResponse> {
  return apiRequest<AttendanceDetailResponse>(`${scopePath(scope)}/attendances/${attendanceId}`, {
    notification: { error: false, success: false },
  })
}

export function updateAttendanceStatus(
  scope: AttendanceScope,
  attendanceId: number,
  payload: UpdateAttendanceStatusPayload,
): Promise<UpdateAttendanceStatusResponse> {
  return apiRequest<UpdateAttendanceStatusResponse>(
    `${scopePath(scope)}/attendances/${attendanceId}/status`,
    { body: JSON.stringify(payload), method: 'PATCH' },
  )
}
