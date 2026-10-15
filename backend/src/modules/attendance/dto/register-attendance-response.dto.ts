import type {
  AttendanceOccurrence,
  AttendanceResolutionStatus,
} from '../../../models/attendance.model.js';

export class RegisterAttendanceResponseDto {
  declare attendance: {
    appointmentId: number;
    id: number;
    occurrence: AttendanceOccurrence;
    recordedAt: string;
    resolutionStatus: AttendanceResolutionStatus | null;
  };
  declare message: string;
}
