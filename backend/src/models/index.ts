import type { ModelCtor } from 'sequelize-typescript';
import { AuthSession } from './auth-session.model.js';
import { IntegrationEndpoint } from './integration-endpoint.model.js';
import { SystemOptionItem } from './system-option-item.model.js';
import { SystemOption } from './system-option.model.js';
import { SystemParameter } from './system-parameter.model.js';
import { User } from './user.model.js';

export const sequelizeModels = [
  User,
  AuthSession,
  SystemParameter,
  IntegrationEndpoint,
  SystemOption,
  SystemOptionItem,
] satisfies ModelCtor[];
