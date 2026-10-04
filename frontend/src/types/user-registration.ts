export type RegistrationCourse = {
  code: string
  educationLevel: 'graduacao' | 'pos_graduacao'
  id: number
  name: string
}

export type AcademicPeriod = {
  id: number
  name: string
  value: string
}

export type RegistrationOptionsResponse = {
  academicPeriods: AcademicPeriod[]
  courses: RegistrationCourse[]
}

export type RegistrationSubject = {
  courseId: number
  courseName: string
  courseSubjectId: number
  subjectCode: string
  subjectId: number
  subjectName: string
}

export type RegistrationSubjectsResponse = {
  subjects: RegistrationSubject[]
}

export type CreateUserPayload = {
  academic?: {
    academicPeriodId?: number
    courseIds: number[]
    courseSubjectIds: number[]
  }
  birthDate: string
  cpf: string
  email: string
  isActive: boolean
  name: string
  phone: string
  temporaryPassword: string
  userType: 'aluno' | 'professor' | 'administrador'
}

export type CreateUserResponse = {
  message: string
}
