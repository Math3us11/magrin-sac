import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import {
  AttendanceOccurrence,
  AttendanceResolutionStatus,
} from '../../../models/attendance.model.js';

function trimText({ value }: { value: unknown }): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

export class RegisterAttendanceDto {
  @IsEnum(AttendanceOccurrence)
  declare occurrence: AttendanceOccurrence;

  @IsOptional()
  @IsEnum(AttendanceResolutionStatus)
  declare resolutionStatus?: AttendanceResolutionStatus;

  @IsOptional()
  @Transform(trimText)
  @IsString()
  @MaxLength(5000)
  declare internalNotes?: string;

  @IsOptional()
  @Transform(trimText)
  @IsString()
  @MaxLength(5000)
  declare solution?: string;

  @IsOptional()
  @Transform(trimText)
  @IsString()
  @MaxLength(5000)
  declare referral?: string;

  @IsOptional()
  @Transform(trimText)
  @IsString()
  @MaxLength(5000)
  declare unresolvedReason?: string;

  @IsOptional()
  @Transform(trimText)
  @IsString()
  @MaxLength(150)
  declare continuityResponsible?: string;

  @IsOptional()
  @Transform(trimText)
  @IsString()
  @MaxLength(5000)
  declare nextStep?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'O prazo deve usar o formato AAAA-MM-DD.' })
  declare dueDate?: string;
}
