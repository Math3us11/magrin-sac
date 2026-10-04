import { object, ref, string, type InferType } from 'yup'

export const PASSWORD_MIN_LENGTH = 8
export const PASSWORD_MAX_LENGTH = 128

export const loginValidationSchema = object({
  email: string()
    .trim()
    .lowercase()
    .required('Informe seu e-mail.')
    .email('Digite um e-mail válido.')
    .max(254, 'O e-mail deve ter no máximo 254 caracteres.'),
  password: string()
    .required('Informe sua senha.')
    .max(PASSWORD_MAX_LENGTH, `A senha deve ter no máximo ${PASSWORD_MAX_LENGTH} caracteres.`),
})

/**
 * Regra para criação e troca de senha. O login aceita credenciais existentes e,
 * por isso, valida apenas presença e limite técnico no schema acima.
 */
export const newPasswordRule = string()
  .required('Informe uma senha.')
  .min(PASSWORD_MIN_LENGTH, `A senha deve ter pelo menos ${PASSWORD_MIN_LENGTH} caracteres.`)
  .max(PASSWORD_MAX_LENGTH, `A senha deve ter no máximo ${PASSWORD_MAX_LENGTH} caracteres.`)

export const firstAccessPasswordValidationSchema = object({
  newPassword: newPasswordRule,
  passwordConfirmation: string()
    .required('Confirme a nova senha.')
    .oneOf([ref('newPassword')], 'As senhas devem ser iguais.'),
})

export type FirstAccessPasswordFormValues = InferType<typeof firstAccessPasswordValidationSchema>
export type LoginFormValues = InferType<typeof loginValidationSchema>
