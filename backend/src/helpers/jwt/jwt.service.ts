import { randomUUID } from 'node:crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService as NestJwtService } from '@nestjs/jwt';

const SESSION_TOKEN_USE = 'session';
const INVALID_SESSION_MESSAGE = 'Sessão inválida ou expirada.';

export type SignSessionTokenInput = {
  sessionId: number;
  tokenId: string;
  userId: number;
};

export type VerifiedSessionToken = {
  expiresAt: Date;
  issuedAt: Date;
  sessionId: number;
  tokenId: string;
  userId: number;
};

type SessionJwtPayload = {
  exp?: unknown;
  iat?: unknown;
  jti?: unknown;
  sid?: unknown;
  sub?: unknown;
  token_use?: unknown;
};

function parsePositiveInteger(value: unknown): number | null {
  if (typeof value !== 'string' || !/^\d+$/.test(value)) return null;

  const parsed = Number.parseInt(value, 10);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function parseUnixTimestamp(value: unknown): Date | null {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0) return null;
  return new Date(value * 1000);
}

@Injectable()
export class JwtSessionService {
  constructor(private readonly jwtService: NestJwtService) {}

  createTokenId(): string {
    return randomUUID();
  }

  async sign(input: SignSessionTokenInput): Promise<string> {
    if (
      !Number.isSafeInteger(input.userId) ||
      input.userId <= 0 ||
      !Number.isSafeInteger(input.sessionId) ||
      input.sessionId <= 0 ||
      input.tokenId.trim() === ''
    ) {
      throw new TypeError('Invalid session token input.');
    }

    return this.jwtService.signAsync(
      {
        sid: String(input.sessionId),
        token_use: SESSION_TOKEN_USE,
      },
      {
        jwtid: input.tokenId,
        subject: String(input.userId),
      },
    );
  }

  async read(token: string): Promise<VerifiedSessionToken> {
    try {
      const payload = await this.jwtService.verifyAsync<SessionJwtPayload>(token);
      const userId = parsePositiveInteger(payload.sub);
      const sessionId = parsePositiveInteger(payload.sid);
      const issuedAt = parseUnixTimestamp(payload.iat);
      const expiresAt = parseUnixTimestamp(payload.exp);

      if (
        payload.token_use !== SESSION_TOKEN_USE ||
        typeof payload.jti !== 'string' ||
        payload.jti.trim() === '' ||
        userId === null ||
        sessionId === null ||
        issuedAt === null ||
        expiresAt === null
      ) {
        throw new Error('Invalid session claims.');
      }

      return {
        expiresAt,
        issuedAt,
        sessionId,
        tokenId: payload.jti,
        userId,
      };
    } catch {
      throw new UnauthorizedException(INVALID_SESSION_MESSAGE);
    }
  }
}
