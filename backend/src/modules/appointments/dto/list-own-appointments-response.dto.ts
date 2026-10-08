import type { AppointmentStatus } from '../../../models/appointment.model.js';
import type { AppointmentModality } from '../../../types/appointment-modality.type.js';

export class OwnAppointmentItemResponseDto {
  declare cancelledAt: string | null;
  declare cancellationReason: string | null;
  declare details: string | null;
  declare endsAt: string;
  declare id: number;
  declare modality: AppointmentModality;
  declare professor: { id: number; name: string };
  declare protocol: string;
  declare startsAt: string;
  declare status: AppointmentStatus;
  declare subject: string;
}

export class ListOwnAppointmentsResponseDto {
  declare appointments: OwnAppointmentItemResponseDto[];
  declare page?: number;
  declare pageSize?: number;
  declare range?: { from: string; to: string };
  declare total: number;
}
