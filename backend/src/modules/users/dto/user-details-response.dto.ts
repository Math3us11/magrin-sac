import type { UserType } from '../../../models/user.model.js';

export class UserAcademicCourseDto {
  declare id: number;
  declare name: string;
}

export class UserAcademicSubjectDto {
  declare courseId: number;
  declare courseName: string;
  declare courseSubjectId: number;
  declare subjectId: number;
  declare subjectName: string;
}

export class UserAcademicPeriodDto {
  declare id: number;
  declare name: string;
  declare value: string;
}

export class UserAcademicDetailsDto {
  declare academicPeriod: UserAcademicPeriodDto | null;
  declare courseIds: number[];
  declare courses: UserAcademicCourseDto[];
  declare courseSubjectIds: number[];
  declare subjects: UserAcademicSubjectDto[];
}

export class UserDetailsResponseDto {
  declare academic: UserAcademicDetailsDto | null;
  declare birthDate: string | null;
  declare cpf: string;
  declare createdAt: Date;
  declare email: string;
  declare id: number;
  declare isActive: boolean;
  declare mustChangePassword: boolean;
  declare name: string;
  declare phone: string | null;
  declare updatedAt: Date;
  declare userType: UserType;
}

export class UpdateUserResponseDto {
  declare message: string;
}
