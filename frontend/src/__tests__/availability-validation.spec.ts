import { describe, expect, it } from 'vitest'

import {
  createAvailabilityValidationSchema,
  createWeeklyAvailabilityValidationSchema,
} from '@/validations/availability.schema'

const schema = createAvailabilityValidationSchema(new Date('2026-10-03T16:00:00.000Z'))
const weeklySchema = createWeeklyAvailabilityValidationSchema()

describe('validação de disponibilidade', () => {
  it('aceita início e fim livres quando o intervalo futuro é válido', async () => {
    await expect(
      schema.validate({
        date: '2026-10-04',
        endTime: '15:17',
        modalities: ['online'],
        startTime: '13:02',
      }),
    ).resolves.toMatchObject({ startTime: '13:02', endTime: '15:17' })
  })

  it('rejeita término anterior ao início e modalidade vazia', async () => {
    await expect(
      schema.validate(
        {
          date: '2026-10-04',
          endTime: '09:00',
          modalities: [],
          startTime: '10:00',
        },
        { abortEarly: false },
      ),
    ).rejects.toMatchObject({
      errors: expect.arrayContaining([
        'O término deve ser posterior ao início.',
        'Selecione pelo menos uma modalidade.',
      ]),
    })
  })

  it('usa o horário de Porto Velho para recusar períodos que já começaram', async () => {
    await expect(
      schema.validate({
        date: '2026-10-03',
        endTime: '12:30',
        modalities: ['presencial'],
        startTime: '11:59',
      }),
    ).rejects.toThrow('O horário de início deve estar no futuro.')
  })

  it('valida dias e janela do gerador semanal', async () => {
    await expect(
      weeklySchema.validate({
        modalities: ['presencial', 'online'],
        weekdays: [1, 2, 3, 4, 5],
        windows: [
          { endTime: '12:00', startTime: '08:00' },
          { endTime: '18:00', startTime: '14:00' },
        ],
      }),
    ).resolves.toMatchObject({ weekdays: [1, 2, 3, 4, 5] })
  })

  it('rejeita janela semanal invertida ou sem dias selecionados', async () => {
    await expect(
      weeklySchema.validate(
        {
          modalities: ['presencial'],
          weekdays: [],
          windows: [{ endTime: '08:00', startTime: '12:00' }],
        },
        { abortEarly: false },
      ),
    ).rejects.toMatchObject({
      errors: expect.arrayContaining([
        'O término deve ser posterior ao início.',
        'Selecione pelo menos um dia da semana.',
      ]),
    })
  })
})
