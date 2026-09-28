import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { CookieOptions, Request, Response } from 'express';
import type { AuthConfig } from '../../config/auth.config.js';

@Injectable()
export class SessionCookieService {
  private readonly authConfig: AuthConfig;

  constructor(configService: ConfigService) {
    this.authConfig = configService.getOrThrow<AuthConfig>('auth');
  }

  clear(response: Response): void {
    response.clearCookie(this.authConfig.cookie.name, this.baseOptions());
  }

  read(request: Request): string | null {
    if (typeof request.cookies !== 'object' || request.cookies === null) return null;

    const token = (request.cookies as Record<string, unknown>)[this.authConfig.cookie.name];
    return typeof token === 'string' && token !== '' ? token : null;
  }

  write(response: Response, token: string): void {
    response.cookie(this.authConfig.cookie.name, token, {
      ...this.baseOptions(),
      maxAge: this.authConfig.jwt.ttlSeconds * 1000,
    });
  }

  private baseOptions(): CookieOptions {
    return {
      httpOnly: true,
      path: this.authConfig.cookie.path,
      sameSite: this.authConfig.cookie.sameSite,
      secure: this.authConfig.cookie.secure,
    };
  }
}
