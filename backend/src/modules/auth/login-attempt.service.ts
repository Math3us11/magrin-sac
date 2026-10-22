import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';
import type { AuthConfig } from '../../config/auth.config.js';

type LoginAttemptState = {
  blockedUntil: number | null;
  failures: number;
  windowStartedAt: number;
};

const MAX_TRACKED_IDENTITIES = 10_000;
const TOO_MANY_ATTEMPTS_MESSAGE = 'Muitas tentativas de acesso. Aguarde antes de tentar novamente.';

@Injectable()
export class LoginAttemptService {
  private readonly attempts = new Map<string, LoginAttemptState>();
  private readonly maxFailures: number;
  private readonly windowMs: number;

  constructor(configService: ConfigService) {
    const config = configService.getOrThrow<AuthConfig['loginAttempts']>('auth.loginAttempts');
    this.maxFailures = config.maxFailures;
    this.windowMs = config.windowSeconds * 1000;
  }

  assertAllowed(identity: string): void {
    const key = this.toOpaqueKey(identity);
    const attempt = this.attempts.get(key);
    if (!attempt) return;

    const now = Date.now();
    if (attempt.blockedUntil !== null && attempt.blockedUntil > now) {
      throw new HttpException(TOO_MANY_ATTEMPTS_MESSAGE, HttpStatus.TOO_MANY_REQUESTS);
    }

    if (now - attempt.windowStartedAt >= this.windowMs) this.attempts.delete(key);
  }

  clear(identity: string): void {
    this.attempts.delete(this.toOpaqueKey(identity));
  }

  recordFailure(identity: string): void {
    const key = this.toOpaqueKey(identity);
    const now = Date.now();
    const previous = this.attempts.get(key);
    const attempt =
      !previous || now - previous.windowStartedAt >= this.windowMs
        ? { blockedUntil: null, failures: 0, windowStartedAt: now }
        : previous;

    attempt.failures += 1;
    if (attempt.failures >= this.maxFailures) attempt.blockedUntil = now + this.windowMs;

    this.ensureCapacity(now);
    this.attempts.set(key, attempt);

    if (attempt.blockedUntil !== null) {
      throw new HttpException(TOO_MANY_ATTEMPTS_MESSAGE, HttpStatus.TOO_MANY_REQUESTS);
    }
  }

  private ensureCapacity(now: number): void {
    if (this.attempts.size < MAX_TRACKED_IDENTITIES) return;

    for (const [key, attempt] of this.attempts) {
      const expiresAt = attempt.blockedUntil ?? attempt.windowStartedAt + this.windowMs;
      if (expiresAt <= now) this.attempts.delete(key);
    }

    if (this.attempts.size >= MAX_TRACKED_IDENTITIES) {
      const oldestKey = this.attempts.keys().next().value;
      if (oldestKey !== undefined) this.attempts.delete(oldestKey);
    }
  }

  private toOpaqueKey(identity: string): string {
    return createHash('sha256').update(identity.trim().toLowerCase()).digest('base64url');
  }
}
