import { describe, expect, it } from 'vitest'

import {
  PASSWORD_MIN_LENGTH,
  firstAccessPasswordValidationSchema,
  loginValidationSchema,
  newPasswordRule,
} from '@/validations/auth.schema'

describe('schemas de autenticação', () => {
  it('normaliza o e-mail informado no login', async () => {
    const values = await loginValidationSchema.validate({
      email: '  ADMIN@EXAMPLE.COM  ',
      password: 'senha-existente',
    })

    expect(values.email).toBe('admin@example.com')
  })

  it('exige ao menos oito caracteres para uma nova senha', async () => {
    await expect(newPasswordRule.validate('1234567')).rejects.toThrow(
      'A senha deve ter pelo menos ' + PASSWORD_MIN_LENGTH + ' caracteres.',
    )
    await expect(newPasswordRule.validate('12345678')).resolves.toBe('12345678')
  })

  it('exige confirmação idêntica na definição da senha inicial', async () => {
    await expect(
      firstAccessPasswordValidationSchema.validate({
        newPassword: 'nova-senha-segura',
        passwordConfirmation: 'outra-senha',
      }),
    ).rejects.toThrow('As senhas devem ser iguais.')

    await expect(
      firstAccessPasswordValidationSchema.validate({
        newPassword: 'nova-senha-segura',
        passwordConfirmation: 'nova-senha-segura',
      }),
    ).resolves.toEqual({
      newPassword: 'nova-senha-segura',
      passwordConfirmation: 'nova-senha-segura',
    })
  })
})
