import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { MenuItem } from '../../models/menu-item.model.js';
import type { UserType } from '../../models/user.model.js';
import { PermissionService } from '../auth/permission.service.js';
import type { NavigationItemDto } from './dto/navigation-item.dto.js';
import type { NavigationResponseDto } from './dto/navigation-response.dto.js';

const MENU_ATTRIBUTES = [
  'code',
  'iconKey',
  'id',
  'isActive',
  'label',
  'parentId',
  'permissionId',
  'routeName',
  'sortOrder',
] as const;

@Injectable()
export class NavigationService {
  constructor(
    @InjectModel(MenuItem) private readonly menuItemModel: typeof MenuItem,
    private readonly permissionService: PermissionService,
  ) {}

  async getForUserType(userType: UserType): Promise<NavigationResponseDto> {
    const permissions = await this.permissionService.resolveForUserType(userType);
    const permissionIds = new Set(permissions.ids);
    const menuItems = await this.menuItemModel.findAll({
      attributes: [...MENU_ATTRIBUTES],
      order: [
        ['sortOrder', 'ASC'],
        ['id', 'ASC'],
      ],
      where: { isActive: true },
    });
    const allowedItems = menuItems.filter(
      ({ permissionId }) => permissionId === null || permissionIds.has(permissionId),
    );
    const childrenByParent = new Map<number | null, MenuItem[]>();

    for (const item of allowedItems) {
      const siblings = childrenByParent.get(item.parentId) ?? [];
      siblings.push(item);
      childrenByParent.set(item.parentId, siblings);
    }

    const buildItem = (
      item: MenuItem,
      ancestorIds: ReadonlySet<number>,
    ): NavigationItemDto | null => {
      if (ancestorIds.has(item.id)) return null;

      const nextAncestorIds = new Set(ancestorIds);
      nextAncestorIds.add(item.id);
      const children = (childrenByParent.get(item.id) ?? [])
        .map((child) => buildItem(child, nextAncestorIds))
        .filter((child): child is NavigationItemDto => child !== null);

      if (item.routeName === null && children.length === 0) return null;

      return {
        children,
        code: item.code,
        iconKey: item.iconKey,
        id: item.id,
        label: item.label,
        routeName: item.routeName,
      };
    };

    const items = (childrenByParent.get(null) ?? [])
      .map((item) => buildItem(item, new Set()))
      .filter((item): item is NavigationItemDto => item !== null);

    return { items, permissions: permissions.codes };
  }
}
