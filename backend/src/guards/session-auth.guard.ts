import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { SessionCookieService } from '../helpers/cookie/cookie.service.js';
import { AuthService } from '../modules/auth/auth.service.js';
import type { AuthenticatedRequest } from '../types/authenticated-session.type.js';

@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(
    private readonly authService: AuthService,
    private readonly sessionCookieService: SessionCookieService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.sessionCookieService.read(request);

    if (!token) throw new UnauthorizedException('Sessão inválida ou expirada.');

    request.auth = await this.authService.authenticate(token);
    return true;
  }
}
