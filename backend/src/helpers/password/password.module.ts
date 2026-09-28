import { Module } from '@nestjs/common';
import { PasswordHashService } from './password.service.js';

@Module({
  exports: [PasswordHashService],
  providers: [PasswordHashService],
})
export class PasswordModule {}
