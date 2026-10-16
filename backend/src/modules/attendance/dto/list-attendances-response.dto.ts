import type { AppointmentModality } from '../../../types/appointment-modality.type.js';
import type {
  AttendanceOccurrence,
  AttendanceResolutionStatus,
} from '../../../models/attendance.model.js';

export class AttendanceListItemResponseDto {
  declare appointment: {
    endsAt: string;
    id: number;
    modality: AppointmentModality;
    professor: { id: number; name: string };
    protocol: string;
    startsAt: string;
    student: { id: number; name: string };
    subject: string;
  };
  declare continuityResponsible: string | null;
  declare dueDate: string | null;
  declare id: number;
  declare occurrence: AttendanceOccurrence;
  declare recordedAt: string;
  declare resolutionStatus: AttendanceResolutionStatus | null;
  declare updatedAt: string;
}

export class ListAttendancesResponseDto {
  declare attendances: AttendanceListItemResponseDto[];
  declare range: { from: string; to: string };
}
