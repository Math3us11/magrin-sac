export type UserType = 'aluno' | 'professor' | 'administrador'

export type AuthenticatedUser = {
  birthDate: string | null
  email: string
  id: number
  mustChangePassword: boolean
  name: string
  userType: UserType
}

export type LoginCredentials = {
  email: string
  password: string
}

export type LoginResponse = {
  user: AuthenticatedUser
}
