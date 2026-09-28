import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import type { AppConfig } from '../config/app.config.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

@Injectable()
export class RequestOriginGuard implements CanActivate {
  private readonly allowedOrigin: string;

  constructor(configService: ConfigService) {
    const appConfig = configService.getOrThrow<AppConfig>('app');
    this.allowedOrigin = new URL(appConfig.corsOrigin).origin;
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    if (SAFE_METHODS.has(request.method.toUpperCase())) return true;

    const requestOrigin = request.get('origin');

    try {
      if (requestOrigin && new URL(requestOrigin).origin === this.allowedOrigin) return true;
    } catch {
      // A resposta abaixo é intencionalmente genérica.
    }

    throw new ForbiddenException('Origem da requisição não autorizada.');
  }
}
