import type { UserType } from '../../../models/user.model.js';
import type { AuthenticatedUser } from '../../../types/authenticated-user.type.js';

export class CurrentUserDto implements AuthenticatedUser {
  declare birthDate: string | null;
  declare email: string;
  declare id: number;
  declare mustChangePassword: boolean;
  declare name: string;
  declare userType: UserType;
}
