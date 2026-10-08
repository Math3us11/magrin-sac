import type { AvailabilityModality } from '@/types/availability'

export type AppointmentStatus = 'ausencia' | 'cancelado' | 'concluido' | 'confirmado'

export type CreateAppointmentPayload = {
  availabilityId: number
  details?: string
  endsAt: string
  modality: AvailabilityModality
  startsAt: string
  subject: string
}

export type CreatedAppointment = {
  details: string | null
  endsAt: string
  id: number
  modality: AvailabilityModality
  professor: {
    id: number
    name: string
  }
  protocol: string
  startsAt: string
  status: AppointmentStatus
  subject: string
}

export type CreateAppointmentResponse = {
  appointment: CreatedAppointment
  message: string
}

export type AdminAppointmentItem = {
  endsAt: string
  id: number
  modality: AvailabilityModality
  professor: {
    id: number
    name: string
  }
  protocol: string
  startsAt: string
  status: AppointmentStatus
  student: {
    id: number
    name: string
  }
  subject: string
}

export type ListAdminAppointmentsParams = {
  from: string
  status?: AppointmentStatus
  to: string
}

export type ListAdminAppointmentsResponse = {
  appointments: AdminAppointmentItem[]
  range: {
    from: string
    to: string
  }
}

export type OwnAppointmentsScope = 'history' | 'upcoming'

export type OwnAppointmentItem = Omit<CreatedAppointment, 'details'> & {
  cancelledAt: string | null
  cancellationReason: string | null
  details: string | null
}

export type ListOwnAppointmentsParams = {
  from?: string
  modality?: AvailabilityModality
  page?: number
  pageSize?: number
  scope?: OwnAppointmentsScope
  status?: AppointmentStatus
  to?: string
}

export type ListOwnAppointmentsResponse = {
  appointments: OwnAppointmentItem[]
  page?: number
  pageSize?: number
  range?: { from: string; to: string }
  total: number
}
