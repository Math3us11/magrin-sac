import { array, mixed, number, object, string, type InferType } from 'yup'

import { getInstitutionDateTime } from '@/config/date-time'
import type { AvailabilityModality } from '@/types/availability'

const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/
const datePattern = /^\d{4}-\d{2}-\d{2}$/

function isValidIsoDate(value: string): boolean {
  if (!datePattern.test(value)) return false

  const date = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

export function createAvailabilityValidationSchema(now = new Date()) {
  const current = getInstitutionDateTime(now)
  const time = (label: string) =>
    string()
      .required(`Informe o horário de ${label}.`)
      .matches(timePattern, `Informe um horário de ${label} válido.`)

  return object({
    date: string()
      .required('Informe a data da disponibilidade.')
      .test('valid-date', 'Informe uma data válida.', (value) => !value || isValidIsoDate(value))
      .test(
        'future-date',
        'A disponibilidade não pode ser criada em uma data passada.',
        (value) => !value || !isValidIsoDate(value) || value >= current.date,
      ),
    endTime: time('término').test(
      'after-start',
      'O término deve ser posterior ao início.',
      function validateEndTime(value) {
        const startTime = this.parent.startTime as string | undefined
        return !value || !startTime || !timePattern.test(startTime) || value > startTime
      },
    ),
    modalities: array()
      .of(mixed<AvailabilityModality>().oneOf(['online', 'presencial']).required())
      .min(1, 'Selecione pelo menos uma modalidade.')
      .required('Selecione pelo menos uma modalidade.'),
    startTime: time('início').test(
      'future-time',
      'O horário de início deve estar no futuro.',
      function validateStartTime(value) {
        const date = this.parent.date as string | undefined
        return !value || !date || date > current.date || date < current.date || value > current.time
      },
    ),
  })
}

export function createWeeklyAvailabilityValidationSchema() {
  const time = (label: string) =>
    string()
      .required(`Informe o horário de ${label}.`)
      .matches(timePattern, `Informe um horário de ${label} válido.`)

  return object({
    modalities: array()
      .of(mixed<AvailabilityModality>().oneOf(['online', 'presencial']).required())
      .min(1, 'Selecione pelo menos uma modalidade.')
      .required('Selecione pelo menos uma modalidade.'),
    weekdays: array()
      .of(number().integer().min(1).max(7).required())
      .min(1, 'Selecione pelo menos um dia da semana.')
      .test(
        'unique-weekdays',
        'Os dias da semana não podem se repetir.',
        (value) => !value || new Set(value).size === value.length,
      )
      .required('Selecione pelo menos um dia da semana.'),
    windows: array()
      .of(
        object({
          endTime: time('término').test(
            'after-start',
            'O término deve ser posterior ao início.',
            function validateEndTime(value) {
              const startTime = this.parent.startTime as string | undefined
              return !value || !startTime || !timePattern.test(startTime) || value > startTime
            },
          ),
          startTime: time('início'),
        }),
      )
      .min(1, 'Adicione pelo menos uma janela de atendimento.')
      .required('Adicione pelo menos uma janela de atendimento.'),
  })
}

export type AvailabilityFormValues = InferType<
  ReturnType<typeof createAvailabilityValidationSchema>
>
export type WeeklyAvailabilityFormValues = InferType<
  ReturnType<typeof createWeeklyAvailabilityValidationSchema>
>
