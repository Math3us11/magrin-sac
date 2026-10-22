import type {
  AttendanceOccurrence,
  AttendanceResolutionStatus,
} from '../../../models/attendance.model.js';

export class ListAttendanceHistoryResponseDto {
  declare history: Array<{
    actor: { id: number; name: string };
    changedAt: string;
    changeReason: string | null;
    id: number;
    occurrence: AttendanceOccurrence;
    resolutionStatus: AttendanceResolutionStatus | null;
  }>;
}
