import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { AuthSession } from '../../models/auth-session.model.js';
import { Course } from '../../models/course.model.js';
import { CourseSubject } from '../../models/course-subject.model.js';
import { Subject } from '../../models/subject.model.js';
import { SystemOptionItem } from '../../models/system-option-item.model.js';
import { SystemOption } from '../../models/system-option.model.js';
import { UserSubject } from '../../models/user-subject.model.js';
import { User } from '../../models/user.model.js';
import { AuthModule } from '../auth/auth.module.js';
import { UsersController } from './users.controller.js';
import { UsersService } from './users.service.js';

@Module({
  controllers: [UsersController],
  imports: [
    AuthModule,
    SequelizeModule.forFeature([
      AuthSession,
      Course,
      CourseSubject,
      Subject,
      SystemOption,
      SystemOptionItem,
      User,
      UserSubject,
    ]),
  ],
  providers: [UsersService],
})
export class UsersModule {}
