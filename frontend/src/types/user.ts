export type UserListItem = {
  createdAt: string
  email: string
  id: number
  isActive: boolean
  mustChangePassword: boolean
  name: string
  userType: 'administrador' | 'aluno' | 'professor'
}

export type ListUsersResponse = {
  page: number
  pageSize: number
  total: number
  users: UserListItem[]
}

export type ListUsersParams = {
  isActive?: boolean
  page?: number
  pageSize?: number
  search?: string
  userType?: UserListItem['userType']
}

export type UserAcademicCourse = {
  id: number
  name: string
}

export type UserAcademicSubject = {
  courseId: number
  courseName: string
  courseSubjectId: number
  subjectId: number
  subjectName: string
}

export type UserAcademicPeriod = {
  id: number
  name: string
  value: string
}

export type UserAcademicDetails = {
  academicPeriod: UserAcademicPeriod | null
  courseIds: number[]
  courses: UserAcademicCourse[]
  courseSubjectIds: number[]
  subjects: UserAcademicSubject[]
}

export type UserDetails = {
  academic: UserAcademicDetails | null
  birthDate: string | null
  cpf: string
  createdAt: string
  email: string
  id: number
  isActive: boolean
  mustChangePassword: boolean
  name: string
  phone: string | null
  updatedAt: string
  userType: UserListItem['userType']
}

export type UpdateUserPayload = Omit<
  import('@/types/user-registration').CreateUserPayload,
  'temporaryPassword'
>

export type UpdateUserResponse = {
  message: string
}

export type DeleteUserResponse = {
  message: string
}
