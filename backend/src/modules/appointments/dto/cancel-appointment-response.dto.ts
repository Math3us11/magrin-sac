import type { AppointmentStatus } from '../../../models/appointment.model.js';

export class CancelAppointmentResponseDto {
  declare appointment: {
    cancelledAt: string;
    cancelledBy: number;
    cancellationReason: string;
    id: number;
    status: AppointmentStatus;
  };
  declare message: string;
}
