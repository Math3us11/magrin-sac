import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
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
import { CreateAppointmentDto } from './dto/create-appointment.dto.js';
import type { CreateAppointmentResponseDto } from './dto/create-appointment-response.dto.js';
import { ListOwnAppointmentsQueryDto } from './dto/list-own-appointments.dto.js';
import type { ListOwnAppointmentsResponseDto } from './dto/list-own-appointments-response.dto.js';

@Controller('appointments')
@UseGuards(SessionAuthGuard, PermissionGuard, RequestOriginGuard)
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Post()
  @RequirePermissions('appointments.create')
  @HttpCode(HttpStatus.CREATED)
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() input: CreateAppointmentDto,
  ): Promise<CreateAppointmentResponseDto> {
    return this.appointmentsService.create(input, user.id);
  }

  @Get('mine')
  @RequirePermissions('appointments.read.own')
  listMine(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListOwnAppointmentsQueryDto,
  ): Promise<ListOwnAppointmentsResponseDto> {
    return this.appointmentsService.listMine(query, user.id);
  }
}
