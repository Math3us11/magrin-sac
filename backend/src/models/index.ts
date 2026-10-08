import type { ModelCtor } from 'sequelize-typescript';
import { AuthSession } from './auth-session.model.js';
import { Appointment } from './appointment.model.js';
import { AvailabilityModality } from './availability-modality.model.js';
import { Availability } from './availability.model.js';
import { Course } from './course.model.js';
import { CourseSubject } from './course-subject.model.js';
import { IntegrationEndpoint } from './integration-endpoint.model.js';
import { MenuItem } from './menu-item.model.js';
import { Notification } from './notification.model.js';
import { Permission } from './permission.model.js';
import { SystemOptionItem } from './system-option-item.model.js';
import { SystemOption } from './system-option.model.js';
import { SystemParameter } from './system-parameter.model.js';
import { Subject } from './subject.model.js';
import { UserTypePermission } from './user-type-permission.model.js';
import { User } from './user.model.js';
import { UserSubject } from './user-subject.model.js';

export const sequelizeModels = [
  User,
  AuthSession,
  Appointment,
  Availability,
  AvailabilityModality,
  Notification,
  SystemParameter,
  IntegrationEndpoint,
  SystemOption,
  SystemOptionItem,
  Permission,
  UserTypePermission,
  MenuItem,
  Course,
  Subject,
  CourseSubject,
  UserSubject,
] satisfies ModelCtor[];
