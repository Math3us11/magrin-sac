import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Appointment } from '../../models/appointment.model.js';
import { AvailabilityModality } from '../../models/availability-modality.model.js';
import { Availability } from '../../models/availability.model.js';
import { SystemOptionItem } from '../../models/system-option-item.model.js';
import { User } from '../../models/user.model.js';
import { AuthModule } from '../auth/auth.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { AdminAppointmentsController } from './admin-appointments.controller.js';
import { AppointmentsController } from './appointments.controller.js';
import { AppointmentsService } from './appointments.service.js';
import { AvailabilitySearchController } from './availability-search.controller.js';

@Module({
  controllers: [AdminAppointmentsController, AppointmentsController, AvailabilitySearchController],
  imports: [
    AuthModule,
    NotificationsModule,
    SequelizeModule.forFeature([
      Appointment,
      Availability,
      AvailabilityModality,
      SystemOptionItem,
      User,
    ]),
  ],
  providers: [AppointmentsService],
})
export class AppointmentsModule {}
