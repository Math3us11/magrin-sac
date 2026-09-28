import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectConnection, InjectModel } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import type { AuthConfig } from '../../config/auth.config.js';
import { JwtSessionService } from '../../helpers/jwt/jwt.service.js';
import { PasswordHashService } from '../../helpers/password/password.service.js';
import { AuthSession } from '../../models/auth-session.model.js';
import { User } from '../../models/user.model.js';
import type { AuthenticatedSession } from '../../types/authenticated-session.type.js';
import type { CurrentUserDto } from './dto/current-user.dto.js';
import type { LoginDto } from './dto/login.dto.js';

const INVALID_CREDENTIALS_MESSAGE = 'E-mail ou senha inválidos.';
const INVALID_SESSION_MESSAGE = 'Sessão inválida ou expirada.';
const SAFE_USER_ATTRIBUTES = ['id', 'name', 'email', 'birthDate', 'userType', 'isActive'] as const;

export type LoginResult = {
  token: string;
  user: CurrentUserDto;
};

@Injectable()
export class AuthService {
  private readonly authConfig: AuthConfig;

  constructor(
    @InjectModel(User) private readonly userModel: typeof User,
    @InjectModel(AuthSession) private readonly authSessionModel: typeof AuthSession,
    @InjectConnection() private readonly sequelize: Sequelize,
    private readonly jwtSessionService: JwtSessionService,
    private readonly passwordHashService: PasswordHashService,
    configService: ConfigService,
  ) {
    this.authConfig = configService.getOrThrow<AuthConfig>('auth');
  }

  async login(input: LoginDto): Promise<LoginResult> {
    const user = await this.userModel.unscoped().findOne({
      attributes: [...SAFE_USER_ATTRIBUTES, 'passwordHash'],
      where: { email: input.email },
    });
    const passwordMatches = await this.passwordHashService.matches(
      input.password,
      user?.passwordHash,
    );

    if (!user || !user.isActive || !passwordMatches) {
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    const userDto = this.toCurrentUser(user);
    const now = new Date();
    const absoluteExpiresAt = new Date(now.getTime() + this.authConfig.jwt.ttlSeconds * 1000);
    const tokenId = this.jwtSessionService.createTokenId();

    return this.sequelize.transaction(async (transaction) => {
      const session = await this.authSessionModel.create(
        {
          absoluteExpiresAt,
          createdBy: user.id,
          lastActivityAt: now,
          reauthenticatedAt: now,
          tokenId,
          updatedBy: user.id,
          userId: user.id,
        },
        { transaction },
      );
      const token = await this.jwtSessionService.sign({
        sessionId: session.id,
        tokenId,
        userId: user.id,
      });

      return { token, user: userDto };
    });
  }

  async authenticate(token: string): Promise<AuthenticatedSession> {
    const payload = await this.jwtSessionService.read(token);
    const session = await this.authSessionModel.findOne({
      where: {
        id: payload.sessionId,
        revokedAt: null,
        tokenId: payload.tokenId,
        userId: payload.userId,
      },
    });
    const now = new Date();

    if (!session || session.absoluteExpiresAt.getTime() <= now.getTime()) {
      throw new UnauthorizedException(INVALID_SESSION_MESSAGE);
    }

    const user = await this.userModel.findByPk(payload.userId, {
      attributes: [...SAFE_USER_ATTRIBUTES],
    });

    if (!user?.isActive) throw new UnauthorizedException(INVALID_SESSION_MESSAGE);

    await session.update(
      { lastActivityAt: now, updatedBy: user.id },
      { fields: ['lastActivityAt', 'updatedBy'] },
    );

    return {
      sessionId: session.id,
      user: this.toCurrentUser(user),
    };
  }

  async logout(token: string | null): Promise<void> {
    if (!token) return;

    try {
      const payload = await this.jwtSessionService.read(token);
      const now = new Date();

      await this.authSessionModel.update(
        { revokedAt: now, updatedBy: payload.userId },
        {
          where: {
            id: payload.sessionId,
            revokedAt: null,
            tokenId: payload.tokenId,
            userId: payload.userId,
          },
        },
      );
    } catch (error) {
      if (error instanceof UnauthorizedException) return;
      throw error;
    }
  }

  private toCurrentUser(user: User): CurrentUserDto {
    return {
      birthDate: user.birthDate,
      email: user.email,
      id: user.id,
      name: user.name,
      userType: user.userType,
    };
  }
}
