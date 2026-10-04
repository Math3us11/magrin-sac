import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AllowPasswordChangePending } from '../../decorators/allow-password-change-pending.decorator.js';
import { CurrentUser } from '../../decorators/current-user.decorator.js';
import { RequestOriginGuard } from '../../guards/request-origin.guard.js';
import { SessionAuthGuard } from '../../guards/session-auth.guard.js';
import { SessionCookieService } from '../../helpers/cookie/cookie.service.js';
import type { CredentialPublicKeyDto } from '../../helpers/credential-encryption/credential-encryption.dto.js';
import { CredentialEncryptionService } from '../../helpers/credential-encryption/credential-encryption.service.js';
import type { AuthenticatedUser } from '../../types/authenticated-user.type.js';
import { AuthService } from './auth.service.js';
import type { CurrentUserDto } from './dto/current-user.dto.js';
import { FirstAccessPasswordDto } from './dto/first-access-password.dto.js';
import { LoginDto } from './dto/login.dto.js';
import type { LoginResponseDto } from './dto/login-response.dto.js';

@Controller()
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly credentialEncryptionService: CredentialEncryptionService,
    private readonly sessionCookieService: SessionCookieService,
  ) {}

  @Get('auth/credential-key')
  @Header('Cache-Control', 'no-store')
  getCredentialKey(): CredentialPublicKeyDto {
    return this.credentialEncryptionService.getPublicKey();
  }

  @Post('auth/login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RequestOriginGuard)
  async login(
    @Body() input: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<LoginResponseDto> {
    const password = this.credentialEncryptionService.decrypt(input.credential, {
      maxLength: 128,
      minLength: 1,
      purpose: 'login',
    });
    const result = await this.authService.login({ email: input.email, password });
    this.sessionCookieService.write(response, result.token);

    return { user: result.user };
  }

  @Post('auth/logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(RequestOriginGuard)
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    await this.authService.logout(this.sessionCookieService.read(request));
    this.sessionCookieService.clear(response);
  }

  @Post('auth/first-access/password')
  @HttpCode(HttpStatus.OK)
  @AllowPasswordChangePending()
  @UseGuards(SessionAuthGuard, RequestOriginGuard)
  async completeFirstAccess(
    @CurrentUser() user: AuthenticatedUser,
    @Body() input: FirstAccessPasswordDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ message: string }> {
    const newPassword = this.credentialEncryptionService.decrypt(input.credential, {
      maxLength: 128,
      minLength: 8,
      purpose: 'first-access-password',
    });
    const result = await this.authService.completeFirstAccess(user.id, newPassword);
    this.sessionCookieService.clear(response);

    return result;
  }

  @Get('me')
  @AllowPasswordChangePending()
  @UseGuards(SessionAuthGuard)
  me(@CurrentUser() user: AuthenticatedUser): CurrentUserDto {
    return user;
  }
}
