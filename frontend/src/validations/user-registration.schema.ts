import { array, object, ref, string, type InferType } from 'yup'

const requiredText = (label: string, limit = 120) =>
  string()
    .trim()
    .required(`Informe ${label}.`)
    .max(limit, `${label} deve ter no máximo ${limit} caracteres.`)

export const personalDataValidationSchema = object({
  birthDate: string().required('Informe a data de nascimento.'),
  cpf: string()
    .required('Informe o CPF.')
    .test(
      'cpf-length',
      'O CPF deve ter 11 números.',
      (value) => !value || value.replace(/\D/g, '').length === 11,
    ),
  email: string()
    .trim()
    .lowercase()
    .required('Informe o e-mail.')
    .email('Digite um e-mail válido.')
    .max(254, 'O e-mail deve ter no máximo 254 caracteres.'),
  name: requiredText('o nome completo'),
  phone: string()
    .required('Informe o telefone.')
    .test('phone-length', 'Informe um telefone com DDD.', (value) => {
      if (!value) return true

      const digits = value.replace(/\D/g, '')
      return digits.length === 10 || digits.length === 11
    }),
})

export const profileValidationSchema = object({
  accountStatus: string()
    .oneOf(['active', 'inactive'], 'Selecione a situação inicial da conta.')
    .required('Selecione a situação inicial da conta.'),
  temporaryPassword: string()
    .required('Defina uma senha temporária.')
    .min(8, 'A senha temporária deve ter pelo menos 8 caracteres.')
    .max(128, 'A senha temporária deve ter no máximo 128 caracteres.'),
  temporaryPasswordConfirmation: string()
    .required('Confirme a senha temporária.')
    .oneOf([ref('temporaryPassword')], 'As senhas temporárias devem ser iguais.'),
  userType: string()
    .oneOf(['student', 'teacher', 'administrator'], 'Selecione um tipo de usuário.')
    .required('Selecione um tipo de usuário.'),
})

export function createAcademicDetailsValidationSchema(userType: 'student' | 'teacher') {
  const courseIds = array().of(string().required()).min(1, 'Selecione pelo menos um curso.')

  return object({
    courseIds:
      userType === 'student'
        ? courseIds.max(1, 'O aluno deve possuir somente um curso neste cadastro.')
        : courseIds,
    courseSubjectIds: array().of(string().required()).min(1, 'Selecione pelo menos uma matéria.'),
    academicPeriodIds:
      userType === 'student'
        ? array()
            .of(string().required())
            .min(1, 'Selecione o período atual do aluno.')
            .max(1, 'Selecione somente um período atual.')
        : array().of(string().required()).default([]),
  })
}

export function createUserDetailsValidationSchema(
  userType: 'administrador' | 'aluno' | 'professor',
) {
  const profileSchema = object({
    accountStatus: string()
      .oneOf(['active', 'inactive'], 'Selecione a situação da conta.')
      .required('Selecione a situação da conta.'),
    userType: string()
      .oneOf(['administrador', 'aluno', 'professor'], 'Selecione um tipo de usuário.')
      .required('Selecione um tipo de usuário.'),
  })

  if (userType === 'administrador') {
    return personalDataValidationSchema.concat(profileSchema)
  }

  return personalDataValidationSchema
    .concat(profileSchema)
    .concat(createAcademicDetailsValidationSchema(userType === 'aluno' ? 'student' : 'teacher'))
}

export type PersonalDataFormValues = InferType<typeof personalDataValidationSchema>
export type ProfileFormValues = InferType<typeof profileValidationSchema>
export interface AcademicDetailsFormValues {
  academicPeriodIds?: Array<string | undefined>
  courseIds?: Array<string | undefined>
  courseSubjectIds?: Array<string | undefined>
}
