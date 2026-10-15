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
import { CredentialEncryptionService } from '../../helpers/credential-encryption/credential-encryption.service.js';
import { PermissionGuard } from '../../guards/permission.guard.js';
import { RequestOriginGuard } from '../../guards/request-origin.guard.js';
import { SessionAuthGuard } from '../../guards/session-auth.guard.js';
import type { AuthenticatedUser } from '../../types/authenticated-user.type.js';
import { AppointmentsService } from './appointments.service.js';
import { CancelAdminAppointmentDto } from './dto/cancel-appointment.dto.js';
import type { CancelAppointmentResponseDto } from './dto/cancel-appointment-response.dto.js';
import { ListAdminAppointmentsQueryDto } from './dto/list-admin-appointments.dto.js';
import type { ListAdminAppointmentsResponseDto } from './dto/list-admin-appointments-response.dto.js';

@Controller('admin/appointments')
@UseGuards(SessionAuthGuard, PermissionGuard, RequestOriginGuard)
@RequirePermissions('appointments.read.any')
export class AdminAppointmentsController {
  constructor(
    private readonly appointmentsService: AppointmentsService,
    private readonly credentialEncryptionService: CredentialEncryptionService,
  ) {}

  @Get()
  list(@Query() query: ListAdminAppointmentsQueryDto): Promise<ListAdminAppointmentsResponseDto> {
    return this.appointmentsService.listAll(query);
  }

  @Post(':appointmentId/cancel')
  @RequirePermissions('appointments.cancel.any')
  @HttpCode(HttpStatus.OK)
  cancel(
    @CurrentUser() user: AuthenticatedUser,
    @Param('appointmentId', ParseIntPipe) appointmentId: number,
    @Body() input: CancelAdminAppointmentDto,
  ): Promise<CancelAppointmentResponseDto> {
    const confirmationPassword = this.credentialEncryptionService.decrypt(input.credential, {
      maxLength: 128,
      minLength: 1,
      purpose: 'appointment-admin-cancellation',
    });

    return this.appointmentsService.cancelAny(
      appointmentId,
      input.reason,
      user.id,
      confirmationPassword,
    );
  }
}
