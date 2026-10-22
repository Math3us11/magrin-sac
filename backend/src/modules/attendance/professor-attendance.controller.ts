import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../decorators/current-user.decorator.js';
import { RequirePermissions } from '../../decorators/require-permissions.decorator.js';
import { PermissionGuard } from '../../guards/permission.guard.js';
import { RequestOriginGuard } from '../../guards/request-origin.guard.js';
import { SessionAuthGuard } from '../../guards/session-auth.guard.js';
import type { AuthenticatedUser } from '../../types/authenticated-user.type.js';
import { AttendanceService } from './attendance.service.js';
import type { AttendanceDetailResponseDto } from './dto/attendance-detail-response.dto.js';
import type { ListAttendanceHistoryResponseDto } from './dto/list-attendance-history-response.dto.js';
import { ListAttendancesQueryDto } from './dto/list-attendances.dto.js';
import type { ListAttendancesResponseDto } from './dto/list-attendances-response.dto.js';
import { RegisterAttendanceDto } from './dto/register-attendance.dto.js';
import type { RegisterAttendanceResponseDto } from './dto/register-attendance-response.dto.js';
import { UpdateAttendanceStatusDto } from './dto/update-attendance-status.dto.js';
import type { UpdateAttendanceStatusResponseDto } from './dto/update-attendance-status-response.dto.js';

@Controller('professor')
@UseGuards(SessionAuthGuard, PermissionGuard, RequestOriginGuard)
@RequirePermissions('attendance.manage.assigned')
export class ProfessorAttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Get('attendances')
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListAttendancesQueryDto,
  ): Promise<ListAttendancesResponseDto> {
    return this.attendanceService.listAssigned(query, user.id);
  }

  @Get('attendances/:attendanceId')
  detail(
    @CurrentUser() user: AuthenticatedUser,
    @Param('attendanceId', ParseIntPipe) attendanceId: number,
  ): Promise<AttendanceDetailResponseDto> {
    return this.attendanceService.getAssigned(attendanceId, user.id);
  }

  @Put('appointments/:appointmentId/attendance')
  register(
    @CurrentUser() user: AuthenticatedUser,
    @Param('appointmentId', ParseIntPipe) appointmentId: number,
    @Body() input: RegisterAttendanceDto,
  ): Promise<RegisterAttendanceResponseDto> {
    return this.attendanceService.registerAssigned(appointmentId, input, user.id);
  }

  @Get('attendances/:attendanceId/history')
  history(
    @CurrentUser() user: AuthenticatedUser,
    @Param('attendanceId', ParseIntPipe) attendanceId: number,
  ): Promise<ListAttendanceHistoryResponseDto> {
    return this.attendanceService.listAssignedHistory(attendanceId, user.id);
  }

  @Patch('attendances/:attendanceId/status')
  updateStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('attendanceId', ParseIntPipe) attendanceId: number,
    @Body() input: UpdateAttendanceStatusDto,
  ): Promise<UpdateAttendanceStatusResponseDto> {
    return this.attendanceService.updateAssignedStatus(attendanceId, input, user.id);
  }
}
