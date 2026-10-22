import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../decorators/current-user.decorator.js';
import { RequirePermissions } from '../../decorators/require-permissions.decorator.js';
import { PermissionGuard } from '../../guards/permission.guard.js';
import { RequestOriginGuard } from '../../guards/request-origin.guard.js';
import { SessionAuthGuard } from '../../guards/session-auth.guard.js';
import type { AuthenticatedUser } from '../../types/authenticated-user.type.js';
import { AppointmentsService } from './appointments.service.js';
import { CancelAppointmentDto } from './dto/cancel-appointment.dto.js';
import type { CancelAppointmentResponseDto } from './dto/cancel-appointment-response.dto.js';
import { ListAdminAppointmentsQueryDto } from './dto/list-admin-appointments.dto.js';
import type { ListAdminAppointmentsResponseDto } from './dto/list-admin-appointments-response.dto.js';

@Controller('professor/appointments')
@UseGuards(SessionAuthGuard, PermissionGuard, RequestOriginGuard)
export class ProfessorAppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Get()
  @RequirePermissions('appointments.read.assigned')
  listAssigned(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListAdminAppointmentsQueryDto,
  ): Promise<ListAdminAppointmentsResponseDto> {
    return this.appointmentsService.listAssigned(query, user.id);
  }

  @Post(':appointmentId/cancel')
  @RequirePermissions('appointments.cancel.assigned')
  @HttpCode(HttpStatus.OK)
  cancelAssigned(
    @CurrentUser() user: AuthenticatedUser,
    @Param('appointmentId', ParseIntPipe) appointmentId: number,
    @Body() input: CancelAppointmentDto,
  ): Promise<CancelAppointmentResponseDto> {
    return this.appointmentsService.cancelAssigned(appointmentId, input.reason, user.id);
  }
}
