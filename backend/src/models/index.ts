import type { ModelCtor } from 'sequelize-typescript';
import { AuthSession } from './auth-session.model.js';
import { IntegrationEndpoint } from './integration-endpoint.model.js';
import { MenuItem } from './menu-item.model.js';
import { Permission } from './permission.model.js';
import { SystemOptionItem } from './system-option-item.model.js';
import { SystemOption } from './system-option.model.js';
import { SystemParameter } from './system-parameter.model.js';
import { UserTypePermission } from './user-type-permission.model.js';
import { User } from './user.model.js';

export const sequelizeModels = [
  User,
  AuthSession,
  SystemParameter,
  IntegrationEndpoint,
  SystemOption,
  SystemOptionItem,
  Permission,
  UserTypePermission,
  MenuItem,
] satisfies ModelCtor[];
