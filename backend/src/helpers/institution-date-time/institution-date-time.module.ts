import { Module } from '@nestjs/common';
import { InstitutionDateTimeService } from './institution-date-time.service.js';

@Module({
  exports: [InstitutionDateTimeService],
  providers: [InstitutionDateTimeService],
})
export class InstitutionDateTimeModule {}
