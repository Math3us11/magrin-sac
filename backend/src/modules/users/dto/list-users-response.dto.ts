import type { UserType } from '../../../models/user.model.js';

export class UserListItemDto {
  declare createdAt: Date;
  declare email: string;
  declare id: number;
  declare isActive: boolean;
  declare mustChangePassword: boolean;
  declare name: string;
  declare userType: UserType;
}

export class ListUsersResponseDto {
  declare page: number;
  declare pageSize: number;
  declare total: number;
  declare users: UserListItemDto[];
}
