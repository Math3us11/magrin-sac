import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ALLOW_PASSWORD_CHANGE_PENDING_KEY } from '../decorators/allow-password-change-pending.decorator.js';
import { SessionCookieService } from '../helpers/cookie/cookie.service.js';
import { AuthService } from '../modules/auth/auth.service.js';
import type { AuthenticatedRequest } from '../types/authenticated-session.type.js';

@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(
    private readonly authService: AuthService,
    private readonly sessionCookieService: SessionCookieService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.sessionCookieService.read(request);

    if (!token) throw new UnauthorizedException('Sessão inválida ou expirada.');

    request.auth = await this.authService.authenticate(token);

    const allowsPendingPasswordChange = this.reflector.getAllAndOverride<boolean>(
      ALLOW_PASSWORD_CHANGE_PENDING_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (request.auth.user.mustChangePassword && !allowsPendingPasswordChange) {
      throw new ForbiddenException('Defina uma nova senha antes de continuar.');
    }

    return true;
  }
}
