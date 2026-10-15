import { Body, Controller, Get, Param, ParseIntPipe, Put, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../decorators/current-user.decorator.js';
import { RequirePermissions } from '../../decorators/require-permissions.decorator.js';
import { PermissionGuard } from '../../guards/permission.guard.js';
import { RequestOriginGuard } from '../../guards/request-origin.guard.js';
import { SessionAuthGuard } from '../../guards/session-auth.guard.js';
import type { AuthenticatedUser } from '../../types/authenticated-user.type.js';
import { AttendanceService } from './attendance.service.js';
import type { ListAttendanceHistoryResponseDto } from './dto/list-attendance-history-response.dto.js';
import { RegisterAttendanceDto } from './dto/register-attendance.dto.js';
import type { RegisterAttendanceResponseDto } from './dto/register-attendance-response.dto.js';

@Controller('admin')
@UseGuards(SessionAuthGuard, PermissionGuard, RequestOriginGuard)
@RequirePermissions('attendance.manage.any')
export class AdminAttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Put('appointments/:appointmentId/attendance')
  register(
    @CurrentUser() user: AuthenticatedUser,
    @Param('appointmentId', ParseIntPipe) appointmentId: number,
    @Body() input: RegisterAttendanceDto,
  ): Promise<RegisterAttendanceResponseDto> {
    return this.attendanceService.registerAny(appointmentId, input, user.id);
  }

  @Get('attendances/:attendanceId/history')
  history(
    @CurrentUser() user: AuthenticatedUser,
    @Param('attendanceId', ParseIntPipe) attendanceId: number,
  ): Promise<ListAttendanceHistoryResponseDto> {
    return this.attendanceService.listAnyHistory(attendanceId, user.id);
  }
}
