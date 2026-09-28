import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { SessionCookieService } from '../dist/helpers/cookie/cookie.service.js';
import { JwtSessionService } from '../dist/helpers/jwt/jwt.service.js';
import { PasswordHashService } from '../dist/helpers/password/password.service.js';

const jwtOptions = {
  secret: 'test-only-secret-with-at-least-32-characters',
  signOptions: {
    algorithm: 'HS256',
    audience: 'magrin-sac-frontend',
    expiresIn: 300,
    issuer: 'magrin-sac-api',
  },
  verifyOptions: {
    algorithms: ['HS256'],
    audience: 'magrin-sac-frontend',
    issuer: 'magrin-sac-api',
  },
};

function createService() {
  const jwtService = new JwtService(jwtOptions);
  return { jwtService, service: new JwtSessionService(jwtService) };
}

test('sign e read preservam somente os identificadores da sessão', async () => {
  const { service } = createService();
  const tokenId = service.createTokenId();
  const token = await service.sign({ sessionId: 7, tokenId, userId: 3 });
  const payload = await service.read(token);

  assert.equal(token.split('.').length, 3);
  assert.equal(payload.userId, 3);
  assert.equal(payload.sessionId, 7);
  assert.equal(payload.tokenId, tokenId);
  assert.ok(payload.expiresAt > payload.issuedAt);
});

test('read rejeita assinatura adulterada', async () => {
  const { service } = createService();
  const token = await service.sign({
    sessionId: 7,
    tokenId: service.createTokenId(),
    userId: 3,
  });
  const tamperedToken = `${token.slice(0, -1)}${token.endsWith('a') ? 'b' : 'a'}`;

  await assert.rejects(service.read(tamperedToken), UnauthorizedException);
});

test('read rejeita JWT expirado ou que não seja de sessão', async () => {
  const { jwtService, service } = createService();
  const invalidType = await jwtService.signAsync(
    { sid: '7', token_use: 'password-reset' },
    { jwtid: randomUUID(), subject: '3' },
  );
  const expired = await jwtService.signAsync(
    { sid: '7', token_use: 'session' },
    { expiresIn: -1, jwtid: randomUUID(), subject: '3' },
  );

  await assert.rejects(service.read(invalidType), UnauthorizedException);
  await assert.rejects(service.read(expired), UnauthorizedException);
});

test('cookie de sessão é HttpOnly e mantém as opções ao limpar', () => {
  const configService = new ConfigService({
    auth: {
      cookie: {
        name: 'magrin_sac_session',
        path: '/api',
        sameSite: 'lax',
        secure: true,
      },
      jwt: { ttlSeconds: 300 },
    },
  });
  const service = new SessionCookieService(configService);
  const calls = [];
  const response = {
    clearCookie: (...args) => calls.push(['clear', ...args]),
    cookie: (...args) => calls.push(['write', ...args]),
  };

  service.write(response, 'signed.jwt.value');
  service.clear(response);

  assert.deepEqual(calls[0], [
    'write',
    'magrin_sac_session',
    'signed.jwt.value',
    { httpOnly: true, maxAge: 300_000, path: '/api', sameSite: 'lax', secure: true },
  ]);
  assert.deepEqual(calls[1], [
    'clear',
    'magrin_sac_session',
    { httpOnly: true, path: '/api', sameSite: 'lax', secure: true },
  ]);
  assert.equal(
    service.read({ cookies: { magrin_sac_session: 'signed.jwt.value' } }),
    'signed.jwt.value',
  );
});

test('senha usa Argon2id e não aceita valor incorreto', async () => {
  const service = new PasswordHashService();
  const passwordHash = await service.hash('correct-password');

  assert.match(passwordHash, /^\$argon2id\$/);
  assert.equal(await service.matches('correct-password', passwordHash), true);
  assert.equal(await service.matches('wrong-password', passwordHash), false);
  assert.equal(await service.matches('any-password'), false);
});
