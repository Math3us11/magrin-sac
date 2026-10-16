import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import { InstitutionDateTimeService } from '../../helpers/institution-date-time/institution-date-time.service.js';
import { Appointment, AppointmentStatus } from '../../models/appointment.model.js';
import {
  Attendance,
  AttendanceOccurrence,
  AttendanceResolutionStatus,
} from '../../models/attendance.model.js';
import { Availability } from '../../models/availability.model.js';
import type { DashboardQueryDto } from './dto/dashboard-query.dto.js';
import type { DashboardSummaryResponseDto } from './dto/dashboard-summary-response.dto.js';

const MAX_DASHBOARD_RANGE_DAYS = 366;

function addDateDays(value: string, amount: number): string {
  const date = new Date(`${value}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

@Injectable()
export class DashboardService {
  constructor(
    @InjectModel(Appointment) private readonly appointmentModel: typeof Appointment,
    @InjectModel(Attendance) private readonly attendanceModel: typeof Attendance,
    @InjectModel(Availability) private readonly availabilityModel: typeof Availability,
    private readonly institutionDateTime: InstitutionDateTimeService,
  ) {}

  summarizeAssigned(
    query: DashboardQueryDto,
    professorId: number,
  ): Promise<DashboardSummaryResponseDto> {
    return this.summarize(query, professorId);
  }

  summarizeAny(query: DashboardQueryDto): Promise<DashboardSummaryResponseDto> {
    return this.summarize(query);
  }

  private emptySummary(query: DashboardQueryDto): DashboardSummaryResponseDto {
    return {
      filters: { from: query.from, to: query.to },
      inProgress: 0,
      performed: 0,
      resolved: 0,
      unresolved: 0,
    };
  }

  private async summarize(
    query: DashboardQueryDto,
    professorId?: number,
  ): Promise<DashboardSummaryResponseDto> {
    const rangeStart = this.institutionDateTime.localToUtc(query.from, '00:00');
    const rangeEnd = this.institutionDateTime.localToUtc(addDateDays(query.to, 1), '00:00');

    if (rangeEnd <= rangeStart) {
      throw new BadRequestException('A data final deve ser igual ou posterior à data inicial.');
    }
    if ((rangeEnd.getTime() - rangeStart.getTime()) / 86_400_000 > MAX_DASHBOARD_RANGE_DAYS) {
      throw new BadRequestException('O período da consulta deve ter no máximo 366 dias.');
    }

    let availabilityIds: number[] | undefined;
    if (professorId !== undefined) {
      const availabilities = await this.availabilityModel.unscoped().findAll({
        attributes: ['id'],
        paranoid: false,
        where: { professorId },
      });
      availabilityIds = availabilities.map(({ id }) => id);
      if (availabilityIds.length === 0) return this.emptySummary(query);
    }

    const appointments = await this.appointmentModel.findAll({
      attributes: ['id'],
      where: {
        ...(availabilityIds ? { availabilityId: { [Op.in]: availabilityIds } } : {}),
        endsAt: { [Op.gt]: rangeStart },
        startsAt: { [Op.lt]: rangeEnd },
        status: { [Op.in]: [AppointmentStatus.COMPLETED, AppointmentStatus.ABSENT] },
      },
    });
    if (appointments.length === 0) return this.emptySummary(query);

    const attendances = await this.attendanceModel.findAll({
      attributes: ['occurrence', 'resolutionStatus'],
      where: { appointmentId: { [Op.in]: appointments.map(({ id }) => id) } },
    });

    return attendances.reduce<DashboardSummaryResponseDto>((summary, attendance) => {
      if (attendance.occurrence === AttendanceOccurrence.HELD) summary.performed += 1;
      if (attendance.resolutionStatus === AttendanceResolutionStatus.RESOLVED) {
        summary.resolved += 1;
      }
      if (attendance.resolutionStatus === AttendanceResolutionStatus.UNRESOLVED) {
        summary.unresolved += 1;
      }
      if (attendance.resolutionStatus === AttendanceResolutionStatus.IN_PROGRESS) {
        summary.inProgress += 1;
      }
      return summary;
    }, this.emptySummary(query));
  }
}
