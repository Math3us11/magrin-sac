import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { SystemParameter } from '../../models/system-parameter.model.js';
import { User } from '../../models/user.model.js';
import { AuditModule } from '../audit/audit.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { AdminParametersController } from './admin-parameters.controller.js';
import { ParametersService } from './parameters.service.js';

@Module({
  controllers: [AdminParametersController],
  imports: [AuditModule, AuthModule, SequelizeModule.forFeature([SystemParameter, User])],
  providers: [ParametersService],
})
export class ParametersModule {}
