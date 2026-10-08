export type AvailabilityModality = 'online' | 'presencial'
export type AvailabilityState = 'ativa' | 'bloqueada' | 'cancelada'

export type AvailabilityDraft = {
  date: string
  endTime: string
  id: string
  modalities: AvailabilityModality[]
  startTime: string
}

export type AvailabilityItem = {
  endsAt: string
  id: number
  modalities: AvailabilityModality[]
  startsAt: string
  state: AvailabilityState
}

export type AvailabilitySummary = {
  available: number
  blocked: number
  reserved: number
}

export type CreateAvailabilityPayload = {
  items: Array<Pick<AvailabilityDraft, 'date' | 'endTime' | 'modalities' | 'startTime'>>
}

export type CreateAvailabilityResponse = {
  availabilities: AvailabilityItem[]
  message: string
}

export type ListOwnAvailabilityResponse = {
  availabilities: AvailabilityItem[]
  summary: AvailabilitySummary
}

export type FreeAvailabilityInterval = {
  endsAt: string
  startsAt: string
}

export type StudentAvailabilityItem = {
  endsAt: string
  freeIntervals: FreeAvailabilityInterval[]
  id: number
  modalities: AvailabilityModality[]
  professor: {
    id: number
    name: string
  }
  startsAt: string
}

export type ListStudentAvailabilityParams = {
  from: string
  modality?: AvailabilityModality
  to: string
}

export type ListStudentAvailabilityResponse = {
  availabilities: StudentAvailabilityItem[]
  range: {
    from: string
    to: string
  }
}

export type AdminAvailabilityItem = AvailabilityItem & {
  professor: {
    id: number
    isActive: boolean
    name: string
  }
}

export type ListAdminAvailabilityParams = {
  from: string
  modality?: AvailabilityModality
  state?: AvailabilityState
  to: string
}

export type ListAdminAvailabilityResponse = {
  availabilities: AdminAvailabilityItem[]
  range: {
    from: string
    to: string
  }
  summary: {
    active: number
    blocked: number
    cancelled: number
  }
}
