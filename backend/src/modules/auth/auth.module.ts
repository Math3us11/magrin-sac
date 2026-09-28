import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { RequestOriginGuard } from '../../guards/request-origin.guard.js';
import { SessionAuthGuard } from '../../guards/session-auth.guard.js';
import { HelpersModule } from '../../helpers/helpers.module.js';
import { AuthSession } from '../../models/auth-session.model.js';
import { User } from '../../models/user.model.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';

@Module({
  controllers: [AuthController],
  exports: [AuthService, HelpersModule, SessionAuthGuard],
  imports: [HelpersModule, SequelizeModule.forFeature([AuthSession, User])],
  providers: [AuthService, RequestOriginGuard, SessionAuthGuard],
})
export class AuthModule {}
