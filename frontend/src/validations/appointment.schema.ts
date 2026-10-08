import { mixed, object, string, type InferType } from 'yup'

import { getInstitutionDateTime } from '@/config/date-time'
import type { AvailabilityModality } from '@/types/availability'

const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/

type AppointmentValidationWindow = {
  date: string
  endsAt: string
  modalities: AvailabilityModality[]
  startsAt: string
}

export function createAppointmentValidationSchema(
  window: AppointmentValidationWindow,
  now = new Date(),
) {
  const current = getInstitutionDateTime(now)
  const time = (label: string) =>
    string()
      .required(`Informe o horário de ${label}.`)
      .matches(timePattern, `Informe um horário de ${label} válido.`)

  return object({
    details: string().trim().default(''),
    endTime: time('término')
      .test(
        'inside-window',
        `O término deve estar dentro da janela, até ${window.endsAt}.`,
        (value) => !value || !timePattern.test(value) || value <= window.endsAt,
      )
      .test('after-start', 'O término deve ser posterior ao início.', function validateEnd(value) {
        const startTime = this.parent.startTime as string | undefined
        return !value || !startTime || !timePattern.test(startTime) || value > startTime
      }),
    modality: mixed<AvailabilityModality>()
      .oneOf(window.modalities, 'Selecione uma modalidade permitida para esta janela.')
      .required('Selecione a modalidade do atendimento.'),
    startTime: time('início')
      .test(
        'inside-window',
        `O início deve estar dentro da janela, a partir de ${window.startsAt}.`,
        (value) =>
          !value || !timePattern.test(value) || (value >= window.startsAt && value < window.endsAt),
      )
      .test(
        'future-time',
        'O horário de início deve estar no futuro.',
        (value) =>
          !value ||
          !timePattern.test(value) ||
          window.date > current.date ||
          (window.date === current.date && value > current.time),
      ),
    subject: string()
      .trim()
      .required('Informe o assunto do atendimento.')
      .max(150, 'O assunto deve ter no máximo 150 caracteres.'),
  })
}

export type AppointmentFormValues = InferType<ReturnType<typeof createAppointmentValidationSchema>>
