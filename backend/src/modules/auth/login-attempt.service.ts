import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomBytes } from 'node:crypto';
import type { AuthConfig } from '../../config/auth.config.js';

type LoginAttemptState = {
  blockedUntil: number | null;
  failures: number;
  // Evita repetir no log o mesmo bloqueio a cada tentativa recusada.
  rejectionLogged: boolean;
  windowStartedAt: number;
};

export type LoginAttemptContext = {
  clientIp: string;
  identity: string;
};

type SecurityEvent =
  'auth.login.account_blocked' | 'auth.login.client_blocked' | 'auth.login.rejected_while_blocked';

const MAX_TRACKED_KEYS = 10_000;
const TOO_MANY_ATTEMPTS_MESSAGE = 'Muitas tentativas de acesso. Aguarde antes de tentar novamente.';

@Injectable()
export class LoginAttemptService {
  private readonly attempts = new Map<string, LoginAttemptState>();
  private readonly logger = new Logger('SecurityEvents');
  private readonly maxFailures: number;
  private readonly maxFailuresPerClient: number;
  private readonly pseudonymKey: Buffer | string;
  private readonly windowMs: number;

  constructor(configService: ConfigService) {
    const config = configService.getOrThrow<AuthConfig['loginAttempts']>('auth.loginAttempts');
    this.maxFailures = config.maxFailures;
    this.maxFailuresPerClient = config.maxFailuresPerClient;
    this.windowMs = config.windowSeconds * 1000;
    // E-mails e IPs viram pseudônimos estáveis: o log permite correlacionar sem expor dados.
    this.pseudonymKey = configService.get<string>('auth.jwt.secret') ?? randomBytes(32);
  }

  // O bloqueio da conta vale por IP: falhas vindas de outro endereço não travam o titular.
  assertAllowed(context: LoginAttemptContext): void {
    const now = Date.now();
    const blocked = [this.accountKey(context), this.clientKey(context)].some((key) =>
      this.isBlocked(key, now),
    );

    if (blocked) {
      this.logEvent('auth.login.rejected_while_blocked', context, now);
      throw new HttpException(TOO_MANY_ATTEMPTS_MESSAGE, HttpStatus.TOO_MANY_REQUESTS);
    }
  }

  clear(context: LoginAttemptContext): void {
    // O contador do IP é preservado: um login válido não apaga tentativas em outras contas.
    this.attempts.delete(this.accountKey(context));
  }

  recordFailure(context: LoginAttemptContext): void {
    const now = Date.now();
    const accountBlocked = this.increment(this.accountKey(context), this.maxFailures, now);
    const clientBlocked = this.increment(this.clientKey(context), this.maxFailuresPerClient, now);

    if (accountBlocked) this.logEvent('auth.login.account_blocked', context, now);
    if (clientBlocked) this.logEvent('auth.login.client_blocked', context, now);

    const accountState = this.attempts.get(this.accountKey(context));
    const clientState = this.attempts.get(this.clientKey(context));
    if (accountState?.blockedUntil || clientState?.blockedUntil) {
      throw new HttpException(TOO_MANY_ATTEMPTS_MESSAGE, HttpStatus.TOO_MANY_REQUESTS);
    }
  }

  private accountKey(context: LoginAttemptContext): string {
    return `account:${this.pseudonym(context.identity.trim().toLowerCase())}:${this.pseudonym(context.clientIp)}`;
  }

  private clientKey(context: LoginAttemptContext): string {
    return `client:${this.pseudonym(context.clientIp)}`;
  }

  // Retorna true somente quando esta falha inicia um novo bloqueio.
  private increment(key: string, limit: number, now: number): boolean {
    const previous = this.attempts.get(key);
    const state =
      !previous || now - previous.windowStartedAt >= this.windowMs
        ? { blockedUntil: null, failures: 0, rejectionLogged: false, windowStartedAt: now }
        : previous;

    state.failures += 1;
    const startsBlock = state.blockedUntil === null && state.failures >= limit;
    if (startsBlock) state.blockedUntil = now + this.windowMs;

    this.ensureCapacity(now);
    this.attempts.set(key, state);
    return startsBlock;
  }

  private isBlocked(key: string, now: number): boolean {
    const state = this.attempts.get(key);
    if (!state) return false;

    if (state.blockedUntil !== null && state.blockedUntil > now) return true;
    if (now - state.windowStartedAt >= this.windowMs) this.attempts.delete(key);
    return false;
  }

  private logEvent(event: SecurityEvent, context: LoginAttemptContext, now: number): void {
    if (event === 'auth.login.rejected_while_blocked') {
      const states = [this.accountKey(context), this.clientKey(context)]
        .map((key) => this.attempts.get(key))
        .filter(
          (state): state is LoginAttemptState =>
            state !== undefined && state.blockedUntil !== null && state.blockedUntil > now,
        );
      if (states.every((state) => state.rejectionLogged)) return;
      states.forEach((state) => (state.rejectionLogged = true));
    }

    this.logger.warn(
      JSON.stringify({
        account: this.pseudonym(context.identity.trim().toLowerCase()),
        client: this.pseudonym(context.clientIp),
        event,
        occurredAt: new Date(now).toISOString(),
        windowSeconds: this.windowMs / 1000,
      }),
    );
  }

  private pseudonym(value: string): string {
    return createHmac('sha256', this.pseudonymKey)
      .update(`login-attempt:${value}`)
      .digest('base64url')
      .slice(0, 16);
  }

  private ensureCapacity(now: number): void {
    if (this.attempts.size < MAX_TRACKED_KEYS) return;

    for (const [key, attempt] of this.attempts) {
      const expiresAt = attempt.blockedUntil ?? attempt.windowStartedAt + this.windowMs;
      if (expiresAt <= now) this.attempts.delete(key);
    }

    if (this.attempts.size >= MAX_TRACKED_KEYS) {
      const oldestKey = this.attempts.keys().next().value;
      if (oldestKey !== undefined) this.attempts.delete(oldestKey);
    }
  }
}
