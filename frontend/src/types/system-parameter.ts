export type SystemParameterName = 'APPOINTMENT_CANCELLATION_MIN_NOTICE_MINUTES'

export type SystemParameter = {
  description: string
  fallback: number
  label: string
  max: number
  min: number
  name: SystemParameterName
  unit: 'minutes'
  updatedAt: string | null
  updatedBy: { id: number; name: string } | null
  usingFallback: boolean
  value: number
}

export type ListSystemParametersResponse = {
  parameters: SystemParameter[]
}

export type UpdateSystemParameterPayload = {
  reason: string
  value: number
}

export type UpdateSystemParameterResponse = {
  message: string
  parameter: SystemParameter
}
