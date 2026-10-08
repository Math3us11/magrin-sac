import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { RequirePermissions } from '../../decorators/require-permissions.decorator.js';
import { PermissionGuard } from '../../guards/permission.guard.js';
import { RequestOriginGuard } from '../../guards/request-origin.guard.js';
import { SessionAuthGuard } from '../../guards/session-auth.guard.js';
import { AppointmentsService } from './appointments.service.js';
import { ListAdminAppointmentsQueryDto } from './dto/list-admin-appointments.dto.js';
import type { ListAdminAppointmentsResponseDto } from './dto/list-admin-appointments-response.dto.js';

@Controller('admin/appointments')
@UseGuards(SessionAuthGuard, PermissionGuard, RequestOriginGuard)
@RequirePermissions('appointments.read.any')
export class AdminAppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Get()
  list(@Query() query: ListAdminAppointmentsQueryDto): Promise<ListAdminAppointmentsResponseDto> {
    return this.appointmentsService.listAll(query);
  }
}
