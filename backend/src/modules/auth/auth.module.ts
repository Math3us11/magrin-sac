import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { RequestOriginGuard } from '../../guards/request-origin.guard.js';
import { PermissionGuard } from '../../guards/permission.guard.js';
import { SessionAuthGuard } from '../../guards/session-auth.guard.js';
import { HelpersModule } from '../../helpers/helpers.module.js';
import { AuthSession } from '../../models/auth-session.model.js';
import { Permission } from '../../models/permission.model.js';
import { UserTypePermission } from '../../models/user-type-permission.model.js';
import { User } from '../../models/user.model.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { PermissionService } from './permission.service.js';

@Module({
  controllers: [AuthController],
  exports: [
    AuthService,
    HelpersModule,
    PermissionGuard,
    PermissionService,
    RequestOriginGuard,
    SessionAuthGuard,
  ],
  imports: [
    HelpersModule,
    SequelizeModule.forFeature([AuthSession, Permission, User, UserTypePermission]),
  ],
  providers: [
    AuthService,
    PermissionGuard,
    PermissionService,
    RequestOriginGuard,
    SessionAuthGuard,
  ],
})
export class AuthModule {}
