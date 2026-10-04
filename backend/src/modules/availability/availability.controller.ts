import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../decorators/current-user.decorator.js';
import { RequirePermissions } from '../../decorators/require-permissions.decorator.js';
import { PermissionGuard } from '../../guards/permission.guard.js';
import { RequestOriginGuard } from '../../guards/request-origin.guard.js';
import { SessionAuthGuard } from '../../guards/session-auth.guard.js';
import type { AuthenticatedUser } from '../../types/authenticated-user.type.js';
import { AvailabilityService } from './availability.service.js';
import type {
  CreateAvailabilityResponseDto,
  ListOwnAvailabilityResponseDto,
} from './dto/availability-response.dto.js';
import { CreateAvailabilityBatchDto } from './dto/create-availability.dto.js';

@Controller('professor/availability')
@UseGuards(SessionAuthGuard, PermissionGuard, RequestOriginGuard)
@RequirePermissions('availability.manage.own')
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  @Get()
  listOwn(@CurrentUser() user: AuthenticatedUser): Promise<ListOwnAvailabilityResponseDto> {
    return this.availabilityService.listOwn(user.id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  createBatch(
    @CurrentUser() user: AuthenticatedUser,
    @Body() input: CreateAvailabilityBatchDto,
  ): Promise<CreateAvailabilityResponseDto> {
    return this.availabilityService.createBatch(input, user.id);
  }
}
