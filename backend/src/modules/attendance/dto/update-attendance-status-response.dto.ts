import type { AttendanceResolutionStatus } from '../../../models/attendance.model.js';

export class UpdateAttendanceStatusResponseDto {
  declare attendance: {
    id: number;
    resolutionStatus: AttendanceResolutionStatus;
    updatedAt: string;
    updatedBy: number;
  };
  declare message: string;
}
