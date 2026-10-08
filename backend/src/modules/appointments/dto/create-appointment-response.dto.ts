import type { AppointmentStatus } from '../../../models/appointment.model.js';
import type { AppointmentModality } from '../../../types/appointment-modality.type.js';

export class CreatedAppointmentResponseDto {
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

export class CreateAppointmentResponseDto {
  declare appointment: CreatedAppointmentResponseDto;
  declare message: string;
}
