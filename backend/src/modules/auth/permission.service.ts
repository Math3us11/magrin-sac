import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import { Permission } from '../../models/permission.model.js';
import { UserTypePermission } from '../../models/user-type-permission.model.js';
import type { UserType } from '../../models/user.model.js';

export type ResolvedPermissions = {
  codes: string[];
  ids: number[];
};

@Injectable()
export class PermissionService {
  constructor(
    @InjectModel(Permission) private readonly permissionModel: typeof Permission,
    @InjectModel(UserTypePermission)
    private readonly userTypePermissionModel: typeof UserTypePermission,
  ) {}

  async resolveForUserType(userType: UserType): Promise<ResolvedPermissions> {
    const mappings = await this.userTypePermissionModel.findAll({
      attributes: ['permissionId'],
      where: { userType },
    });
    const permissionIds = [...new Set(mappings.map(({ permissionId }) => permissionId))];

    if (permissionIds.length === 0) return { codes: [], ids: [] };

    const permissions = await this.permissionModel.findAll({
      attributes: ['code', 'id'],
      order: [['code', 'ASC']],
      where: { id: { [Op.in]: permissionIds } },
    });

    return {
      codes: permissions.map(({ code }) => code),
      ids: permissions.map(({ id }) => id),
    };
  }
}
