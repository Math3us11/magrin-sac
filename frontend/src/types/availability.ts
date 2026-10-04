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
