export type AttendanceOccurrence = 'ausencia' | 'realizado'
export type AttendanceResolutionStatus = 'em_tratativa' | 'nao_resolvido' | 'resolvido'

export type RegisterAttendancePayload = {
  continuityResponsible?: string
  dueDate?: string
  internalNotes?: string
  nextStep?: string
  occurrence: AttendanceOccurrence
  referral?: string
  resolutionStatus?: AttendanceResolutionStatus
  solution?: string
  unresolvedReason?: string
}

export type RegisterAttendanceResponse = {
  attendance: {
    appointmentId: number
    id: number
    occurrence: AttendanceOccurrence
    recordedAt: string
    resolutionStatus: AttendanceResolutionStatus | null
  }
  message: string
}

export type AttendancePerson = { id: number; name: string }

export type AttendanceAppointment = {
  details?: string | null
  endsAt: string
  id: number
  modality: 'online' | 'presencial'
  professor: AttendancePerson
  protocol: string
  startsAt: string
  student: AttendancePerson
  subject: string
}

export type AttendanceListItem = {
  appointment: AttendanceAppointment
  continuityResponsible: string | null
  dueDate: string | null
  id: number
  occurrence: AttendanceOccurrence
  recordedAt: string
  resolutionStatus: AttendanceResolutionStatus | null
  updatedAt: string
}

export type AttendanceHistoryItem = {
  actor: AttendancePerson
  changedAt: string
  changeReason: string | null
  id: number
  occurrence: AttendanceOccurrence
  resolutionStatus: AttendanceResolutionStatus | null
}

export type AttendanceDetail = Omit<AttendanceListItem, 'appointment'> & {
  appointment: AttendanceAppointment & { details: string | null }
  internalNotes: string | null
  nextStep: string | null
  referral: string | null
  solution: string | null
  unresolvedReason: string | null
  updatedBy: AttendancePerson
}

export type AttendanceDetailResponse = {
  attendance: AttendanceDetail
  history: AttendanceHistoryItem[]
}

export type ListAttendancesParams = {
  from: string
  occurrence?: AttendanceOccurrence
  resolutionStatus?: AttendanceResolutionStatus
  to: string
}

export type ListAttendancesResponse = {
  attendances: AttendanceListItem[]
  range: { from: string; to: string }
}

export type UpdateAttendanceStatusPayload = {
  changeReason: string
  continuityResponsible?: string
  dueDate?: string
  internalNotes?: string
  nextStep?: string
  referral?: string
  resolutionStatus: AttendanceResolutionStatus
  solution?: string
  unresolvedReason?: string
}

export type UpdateAttendanceStatusResponse = {
  attendance: {
    id: number
    resolutionStatus: AttendanceResolutionStatus
    updatedAt: string
    updatedBy: number
  }
  message: string
}
