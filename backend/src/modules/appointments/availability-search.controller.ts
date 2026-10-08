import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { RequirePermissions } from '../../decorators/require-permissions.decorator.js';
import { PermissionGuard } from '../../guards/permission.guard.js';
import { RequestOriginGuard } from '../../guards/request-origin.guard.js';
import { SessionAuthGuard } from '../../guards/session-auth.guard.js';
import { AppointmentsService } from './appointments.service.js';
import { ListAvailabilityQueryDto } from './dto/list-availability-query.dto.js';
import type { ListAvailabilityResponseDto } from './dto/list-availability-response.dto.js';

@Controller('availability')
@UseGuards(SessionAuthGuard, PermissionGuard, RequestOriginGuard)
@RequirePermissions('appointments.create')
export class AvailabilitySearchController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Get()
  list(@Query() query: ListAvailabilityQueryDto): Promise<ListAvailabilityResponseDto> {
    return this.appointmentsService.listAvailability(query);
  }
}
