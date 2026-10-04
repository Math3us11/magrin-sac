import type { UserType } from '../models/user.model.js';

export type AuthenticatedUser = {
  birthDate: string | null;
  email: string;
  id: number;
  mustChangePassword: boolean;
  name: string;
  userType: UserType;
};
