import type { EducationLevel } from '../../../models/course.model.js';

export class RegistrationCourseDto {
  declare code: string;
  declare educationLevel: EducationLevel;
  declare id: number;
  declare name: string;
}

export class AcademicPeriodDto {
  declare id: number;
  declare name: string;
  declare value: string;
}

export class RegistrationOptionsResponseDto {
  declare academicPeriods: AcademicPeriodDto[];
  declare courses: RegistrationCourseDto[];
}

export class RegistrationSubjectDto {
  declare courseId: number;
  declare courseName: string;
  declare courseSubjectId: number;
  declare subjectCode: string;
  declare subjectId: number;
  declare subjectName: string;
}

export class RegistrationSubjectsResponseDto {
  declare subjects: RegistrationSubjectDto[];
}
