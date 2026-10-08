import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { AvailabilityModality } from '../../models/availability-modality.model.js';
import { Availability } from '../../models/availability.model.js';
import { SystemOptionItem } from '../../models/system-option-item.model.js';
import { SystemOption } from '../../models/system-option.model.js';
import { User } from '../../models/user.model.js';
import { AuthModule } from '../auth/auth.module.js';
import { AdminAvailabilityController } from './admin-availability.controller.js';
import { AvailabilityController } from './availability.controller.js';
import { AvailabilityService } from './availability.service.js';

@Module({
  controllers: [AdminAvailabilityController, AvailabilityController],
  imports: [
    AuthModule,
    SequelizeModule.forFeature([
      Availability,
      AvailabilityModality,
      SystemOption,
      SystemOptionItem,
      User,
    ]),
  ],
  providers: [AvailabilityService],
})
export class AvailabilityModule {}
