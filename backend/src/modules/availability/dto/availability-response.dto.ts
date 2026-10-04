import type { AvailabilityState } from '../../../models/availability.model.js';
import type { AppointmentModality } from './create-availability.dto.js';

export class AvailabilityItemResponseDto {
  declare endsAt: string;
  declare id: number;
  declare modalities: AppointmentModality[];
  declare startsAt: string;
  declare state: AvailabilityState;
}

export class CreateAvailabilityResponseDto {
  declare availabilities: AvailabilityItemResponseDto[];
  declare message: string;
}

export class ListOwnAvailabilityResponseDto {
  declare availabilities: AvailabilityItemResponseDto[];
  declare summary: {
    available: number;
    blocked: number;
    reserved: number;
  };
}
