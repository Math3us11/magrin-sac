import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { fileURLToPath } from 'node:url';
import appConfig from './config/app.config.js';
import authConfig from './config/auth.config.js';
import databaseConfig from './config/database.config.js';
import { environmentValidationSchema } from './config/env.validation.js';
import { DatabaseModule } from './database/database.module.js';
import { HealthModule } from './health/health.module.js';
import { AppointmentsModule } from './modules/appointments/appointments.module.js';
import { AttendanceModule } from './modules/attendance/attendance.module.js';
import { AuditModule } from './modules/audit/audit.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { AvailabilityModule } from './modules/availability/availability.module.js';
import { DashboardModule } from './modules/dashboard/dashboard.module.js';
import { NavigationModule } from './modules/navigation/navigation.module.js';
import { NotificationsModule } from './modules/notifications/notifications.module.js';
import { UsersModule } from './modules/users/users.module.js';

const ROOT_ENV_FILE = fileURLToPath(new URL('../../.env', import.meta.url));

@Module({
  imports: [
    ConfigModule.forRoot({
      cache: true,
      envFilePath: ROOT_ENV_FILE,
      isGlobal: true,
      load: [appConfig, authConfig, databaseConfig],
      validationSchema: environmentValidationSchema,
    }),
    DatabaseModule,
    HealthModule,
    AuthModule,
    UsersModule,
    AvailabilityModule,
    AppointmentsModule,
    AttendanceModule,
    DashboardModule,
    NavigationModule,
    NotificationsModule,
    AuditModule,
  ],
})
export class AppModule {}
