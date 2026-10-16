import type { AppointmentModality } from '../../../types/appointment-modality.type.js';
import type {
  AttendanceOccurrence,
  AttendanceResolutionStatus,
} from '../../../models/attendance.model.js';
import type { ListAttendanceHistoryResponseDto } from './list-attendance-history-response.dto.js';

export class AttendanceDetailResponseDto {
  declare attendance: {
    appointment: {
      details: string | null;
      endsAt: string;
      id: number;
      modality: AppointmentModality;
      professor: { id: number; name: string };
      protocol: string;
      startsAt: string;
      student: { id: number; name: string };
      subject: string;
    };
    continuityResponsible: string | null;
    dueDate: string | null;
    id: number;
    internalNotes: string | null;
    nextStep: string | null;
    occurrence: AttendanceOccurrence;
    recordedAt: string;
    referral: string | null;
    resolutionStatus: AttendanceResolutionStatus | null;
    solution: string | null;
    unresolvedReason: string | null;
    updatedAt: string;
    updatedBy: { id: number; name: string };
  };
  declare history: ListAttendanceHistoryResponseDto['history'];
}
