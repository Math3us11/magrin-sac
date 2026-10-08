import type { AppointmentModality } from '../../../types/appointment-modality.type.js';

export class FreeIntervalResponseDto {
  declare endsAt: string;
  declare startsAt: string;
}

export class AvailableAppointmentWindowResponseDto {
  declare endsAt: string;
  declare freeIntervals: FreeIntervalResponseDto[];
  declare id: number;
  declare modalities: AppointmentModality[];
  declare professor: {
    id: number;
    name: string;
  };
  declare startsAt: string;
}

export class ListAvailabilityResponseDto {
  declare availabilities: AvailableAppointmentWindowResponseDto[];
  declare range: {
    from: string;
    to: string;
  };
}
