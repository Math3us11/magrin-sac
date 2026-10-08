import type { AvailabilityState } from '../../../models/availability.model.js';
import type { AppointmentModality } from '../../../types/appointment-modality.type.js';

export class AdminAvailabilityItemResponseDto {
  declare endsAt: string;
  declare id: number;
  declare modalities: AppointmentModality[];
  declare professor: {
    id: number;
    isActive: boolean;
    name: string;
  };
  declare startsAt: string;
  declare state: AvailabilityState;
}

export class ListAdminAvailabilityResponseDto {
  declare availabilities: AdminAvailabilityItemResponseDto[];
  declare range: {
    from: string;
    to: string;
  };
  declare summary: {
    active: number;
    blocked: number;
    cancelled: number;
  };
}
