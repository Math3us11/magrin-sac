import type { AppointmentStatus } from '../../../models/appointment.model.js';
import type { AppointmentModality } from '../../../types/appointment-modality.type.js';

export class AdminAppointmentItemResponseDto {
  declare endsAt: string;
  declare id: number;
  declare modality: AppointmentModality;
  declare professor: { id: number; name: string };
  declare protocol: string;
  declare startsAt: string;
  declare status: AppointmentStatus;
  declare student: { id: number; name: string };
  declare subject: string;
}

export class ListAdminAppointmentsResponseDto {
  declare appointments: AdminAppointmentItemResponseDto[];
  declare range: { from: string; to: string };
}
