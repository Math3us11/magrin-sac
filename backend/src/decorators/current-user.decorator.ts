import { createParamDecorator, type ExecutionContext, UnauthorizedException } from '@nestjs/common';
import type { AuthenticatedRequest } from '../types/authenticated-session.type.js';
import type { AuthenticatedUser } from '../types/authenticated-user.type.js';

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUser => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    if (!request.auth) throw new UnauthorizedException('Sessão inválida ou expirada.');

    return request.auth.user;
  },
);
