import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRED_PERMISSIONS_METADATA } from '../decorators/require-permissions.decorator.js';
import { PermissionService } from '../modules/auth/permission.service.js';
import type { AuthenticatedRequest } from '../types/authenticated-session.type.js';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly permissionService: PermissionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      REQUIRED_PERMISSIONS_METADATA,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions?.length) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.auth?.user;

    if (!user) throw new ForbiddenException('Você não possui permissão para esta operação.');

    const permissions = await this.permissionService.resolveForUserType(user.userType);
    const availablePermissions = new Set(permissions.codes);

    if (requiredPermissions.every((permission) => availablePermissions.has(permission))) {
      return true;
    }

    throw new ForbiddenException('Você não possui permissão para esta operação.');
  }
}
