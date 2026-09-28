import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { CurrentUser } from '../../decorators/current-user.decorator.js';
import { RequestOriginGuard } from '../../guards/request-origin.guard.js';
import { SessionAuthGuard } from '../../guards/session-auth.guard.js';
import { SessionCookieService } from '../../helpers/cookie/cookie.service.js';
import type { AuthenticatedUser } from '../../types/authenticated-user.type.js';
import { AuthService } from './auth.service.js';
import type { CurrentUserDto } from './dto/current-user.dto.js';
import { LoginDto } from './dto/login.dto.js';
import type { LoginResponseDto } from './dto/login-response.dto.js';

@Controller()
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly sessionCookieService: SessionCookieService,
  ) {}

  @Post('auth/login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RequestOriginGuard)
  async login(
    @Body() input: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<LoginResponseDto> {
    const result = await this.authService.login(input);
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

  @Get('me')
  @UseGuards(SessionAuthGuard)
  me(@CurrentUser() user: AuthenticatedUser): CurrentUserDto {
    return user;
  }
}
