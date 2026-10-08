import { IsEnum, IsOptional, Matches } from 'class-validator';
import { AppointmentStatus } from '../../../models/appointment.model.js';

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export class ListAdminAppointmentsQueryDto {
  @Matches(ISO_DATE_PATTERN, { message: 'from deve usar o formato AAAA-MM-DD.' })
  declare from: string;

  @Matches(ISO_DATE_PATTERN, { message: 'to deve usar o formato AAAA-MM-DD.' })
  declare to: string;

  @IsOptional()
  @IsEnum(AppointmentStatus)
  declare status?: AppointmentStatus;
}
