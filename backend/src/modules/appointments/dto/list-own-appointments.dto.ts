import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Matches, Max, Min } from 'class-validator';
import { AppointmentStatus } from '../../../models/appointment.model.js';
import { AppointmentModality } from '../../../types/appointment-modality.type.js';

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export enum OwnAppointmentsScope {
  HISTORY = 'history',
  UPCOMING = 'upcoming',
}

export class ListOwnAppointmentsQueryDto {
  @IsOptional()
  @IsEnum(OwnAppointmentsScope)
  declare scope?: OwnAppointmentsScope;

  @IsOptional()
  @Matches(ISO_DATE_PATTERN, { message: 'from deve usar o formato AAAA-MM-DD.' })
  declare from?: string;

  @IsOptional()
  @Matches(ISO_DATE_PATTERN, { message: 'to deve usar o formato AAAA-MM-DD.' })
  declare to?: string;

  @IsOptional()
  @IsEnum(AppointmentStatus)
  declare status?: AppointmentStatus;

  @IsOptional()
  @IsEnum(AppointmentModality)
  declare modality?: AppointmentModality;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  declare page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  declare pageSize?: number;
}
