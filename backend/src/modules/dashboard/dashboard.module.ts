import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Appointment } from '../../models/appointment.model.js';
import { Attendance } from '../../models/attendance.model.js';
import { Availability } from '../../models/availability.model.js';
import { AuthModule } from '../auth/auth.module.js';
import { AdminDashboardController } from './admin-dashboard.controller.js';
import { DashboardService } from './dashboard.service.js';
import { ProfessorDashboardController } from './professor-dashboard.controller.js';

@Module({
  controllers: [AdminDashboardController, ProfessorDashboardController],
  imports: [AuthModule, SequelizeModule.forFeature([Appointment, Attendance, Availability])],
  providers: [DashboardService],
})
export class DashboardModule {}
