import { describe, expect, it } from 'vitest'

import { institutionLocalToUtc } from '@/config/date-time'
import { createAppointmentValidationSchema } from '@/validations/appointment.schema'

const window = {
  date: '2099-10-07',
  endsAt: '12:00',
  modalities: ['presencial', 'online'] as const,
  startsAt: '08:00',
}

describe('appointment validation', () => {
  it('converte o horário institucional para o instante UTC do contrato', () => {
    expect(institutionLocalToUtc('2099-10-03', '10:00').toISOString()).toBe(
      '2099-10-03T14:00:00.000Z',
    )
  })

  it('aceita um subintervalo válido e normaliza os textos', async () => {
    const result = await createAppointmentValidationSchema({
      ...window,
      modalities: [...window.modalities],
    }).validate({
      details: '  Levar histórico acadêmico.  ',
      endTime: '10:30',
      modality: 'online',
      startTime: '09:00',
      subject: '  Orientação acadêmica  ',
    })

    expect(result).toEqual({
      details: 'Levar histórico acadêmico.',
      endTime: '10:30',
      modality: 'online',
      startTime: '09:00',
      subject: 'Orientação acadêmica',
    })
  })

  it('rejeita horários fora da janela e término anterior ao início', async () => {
    const schema = createAppointmentValidationSchema({
      ...window,
      modalities: [...window.modalities],
    })

    await expect(
      schema.validate(
        {
          details: '',
          endTime: '06:30',
          modality: 'presencial',
          startTime: '07:00',
          subject: 'Atendimento',
        },
        { abortEarly: false },
      ),
    ).rejects.toMatchObject({
      errors: expect.arrayContaining([
        'O início deve estar dentro da janela, a partir de 08:00.',
        'O término deve ser posterior ao início.',
      ]),
    })
  })

  it('rejeita modalidade não publicada e assunto vazio', async () => {
    const schema = createAppointmentValidationSchema({
      date: window.date,
      endsAt: window.endsAt,
      modalities: ['presencial'],
      startsAt: window.startsAt,
    })

    await expect(
      schema.validate(
        {
          details: '',
          endTime: '10:00',
          modality: 'online',
          startTime: '09:00',
          subject: '   ',
        },
        { abortEarly: false },
      ),
    ).rejects.toMatchObject({
      errors: expect.arrayContaining([
        'Selecione uma modalidade permitida para esta janela.',
        'Informe o assunto do atendimento.',
      ]),
    })
  })
})
