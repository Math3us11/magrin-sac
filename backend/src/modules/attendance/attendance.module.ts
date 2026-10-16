import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Appointment } from '../../models/appointment.model.js';
import { AttendanceStatusHistory } from '../../models/attendance-status-history.model.js';
import { Attendance } from '../../models/attendance.model.js';
import { Availability } from '../../models/availability.model.js';
import { SystemOptionItem } from '../../models/system-option-item.model.js';
import { User } from '../../models/user.model.js';
import { AuthModule } from '../auth/auth.module.js';
import { AdminAttendanceController } from './admin-attendance.controller.js';
import { AttendanceService } from './attendance.service.js';
import { ProfessorAttendanceController } from './professor-attendance.controller.js';

@Module({
  controllers: [AdminAttendanceController, ProfessorAttendanceController],
  imports: [
    AuthModule,
    SequelizeModule.forFeature([
      Appointment,
      Attendance,
      AttendanceStatusHistory,
      Availability,
      SystemOptionItem,
      User,
    ]),
  ],
  providers: [AttendanceService],
})
export class AttendanceModule {}
