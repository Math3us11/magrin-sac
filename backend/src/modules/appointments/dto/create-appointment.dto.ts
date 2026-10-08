import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { AppointmentModality } from '../../../types/appointment-modality.type.js';

function trimText({ value }: { value: unknown }): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

export class CreateAppointmentDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  declare availabilityId: number;

  @IsISO8601({ strict: true, strictSeparator: true })
  declare startsAt: string;

  @IsISO8601({ strict: true, strictSeparator: true })
  declare endsAt: string;

  @IsEnum(AppointmentModality)
  declare modality: AppointmentModality;

  @Transform(trimText)
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  declare subject: string;

  @IsOptional()
  @Transform(trimText)
  @IsString()
  declare details?: string;
}
