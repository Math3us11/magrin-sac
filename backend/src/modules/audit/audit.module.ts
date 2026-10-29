import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { AuditLog } from '../../models/audit-log.model.js';
import { User } from '../../models/user.model.js';
import { AuthModule } from '../auth/auth.module.js';
import { AdminAuditController } from './admin-audit.controller.js';
import { AuditService } from './audit.service.js';

@Module({
  controllers: [AdminAuditController],
  exports: [AuditService],
  imports: [AuthModule, SequelizeModule.forFeature([AuditLog, User])],
  providers: [AuditService],
})
export class AuditModule {}
