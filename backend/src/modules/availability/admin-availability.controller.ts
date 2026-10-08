import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { RequirePermissions } from '../../decorators/require-permissions.decorator.js';
import { PermissionGuard } from '../../guards/permission.guard.js';
import { RequestOriginGuard } from '../../guards/request-origin.guard.js';
import { SessionAuthGuard } from '../../guards/session-auth.guard.js';
import { AvailabilityService } from './availability.service.js';
import { ListAdminAvailabilityQueryDto } from './dto/list-admin-availability.dto.js';
import type { ListAdminAvailabilityResponseDto } from './dto/list-admin-availability-response.dto.js';

@Controller('admin/availability')
@UseGuards(SessionAuthGuard, PermissionGuard, RequestOriginGuard)
@RequirePermissions('availability.read.any')
export class AdminAvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  @Get()
  list(@Query() query: ListAdminAvailabilityQueryDto): Promise<ListAdminAvailabilityResponseDto> {
    return this.availabilityService.listAll(query);
  }
}
