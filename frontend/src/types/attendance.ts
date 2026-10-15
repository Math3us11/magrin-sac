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
