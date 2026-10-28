import assert from 'node:assert/strict';
import test from 'node:test';
import { HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { resolveClientIp } from '../dist/modules/auth/client-ip.js';
import { LoginAttemptService } from '../dist/modules/auth/login-attempt.service.js';

const VICTIM = 'aluno@example.com';
const ATTACKER_IP = '198.51.100.20';
const VICTIM_IP = '203.0.113.7';

function createService(t, { maxFailures = 3, maxFailuresPerClient = 10 } = {}) {
  const events = [];
  t.mock.method(Logger.prototype, 'warn', (message) => events.push(JSON.parse(message)));
  const service = new LoginAttemptService(
    new ConfigService({
      auth: {
        jwt: { secret: 'segredo-de-teste-com-pelo-menos-32-caracteres' },
        loginAttempts: {
          clientIpHeader: null,
          maxFailures,
          maxFailuresPerClient,
          windowSeconds: 300,
        },
      },
    }),
  );
  return { events, service };
}

const isTooManyRequests = (error) =>
  error instanceof HttpException && error.getStatus() === HttpStatus.TOO_MANY_REQUESTS;

test('bloqueia a combinação conta + IP ao alcançar o limite de falhas', (t) => {
  const { service } = createService(t, { maxFailures: 2 });
  const attempt = { clientIp: ATTACKER_IP, identity: VICTIM };

  service.assertAllowed(attempt);
  service.recordFailure(attempt);
  assert.throws(() => service.recordFailure(attempt), isTooManyRequests);
  assert.throws(() => service.assertAllowed(attempt), isTooManyRequests);
});

test('falhas de outro IP não travam o titular da conta', (t) => {
  const { service } = createService(t, { maxFailures: 2 });
  const attacker = { clientIp: ATTACKER_IP, identity: VICTIM };

  service.recordFailure(attacker);
  assert.throws(() => service.recordFailure(attacker), isTooManyRequests);

  assert.doesNotThrow(() => service.assertAllowed({ clientIp: VICTIM_IP, identity: VICTIM }));
});

test('limita o mesmo IP tentando várias contas', (t) => {
  const { events, service } = createService(t, { maxFailures: 5, maxFailuresPerClient: 3 });

  service.recordFailure({ clientIp: ATTACKER_IP, identity: 'a@example.com' });
  service.recordFailure({ clientIp: ATTACKER_IP, identity: 'b@example.com' });
  assert.throws(
    () => service.recordFailure({ clientIp: ATTACKER_IP, identity: 'c@example.com' }),
    isTooManyRequests,
  );
  assert.throws(
    () => service.assertAllowed({ clientIp: ATTACKER_IP, identity: 'd@example.com' }),
    isTooManyRequests,
  );
  assert.doesNotThrow(() =>
    service.assertAllowed({ clientIp: VICTIM_IP, identity: 'd@example.com' }),
  );
  assert.deepEqual(
    events.map(({ event }) => event),
    ['auth.login.client_blocked', 'auth.login.rejected_while_blocked'],
  );
});

test('login válido limpa a conta, mas preserva o contador do IP', (t) => {
  const { service } = createService(t, { maxFailures: 2, maxFailuresPerClient: 2 });

  service.recordFailure({ clientIp: ATTACKER_IP, identity: ' Aluno@Example.com ' });
  service.clear({ clientIp: ATTACKER_IP, identity: 'aluno@example.com' });
  assert.doesNotThrow(() => service.assertAllowed({ clientIp: ATTACKER_IP, identity: VICTIM }));

  // A falha anterior continua contando para o IP, mesmo após o sucesso na outra conta.
  assert.throws(
    () => service.recordFailure({ clientIp: ATTACKER_IP, identity: 'outra@example.com' }),
    isTooManyRequests,
  );
});

test('registra eventos suspeitos com pseudônimos, sem e-mail nem IP', (t) => {
  const { events, service } = createService(t, { maxFailures: 2 });
  const attempt = { clientIp: ATTACKER_IP, identity: VICTIM };

  service.recordFailure(attempt);
  assert.throws(() => service.recordFailure(attempt), isTooManyRequests);
  assert.throws(() => service.assertAllowed(attempt), isTooManyRequests);
  assert.throws(() => service.assertAllowed(attempt), isTooManyRequests);

  assert.deepEqual(
    events.map(({ event }) => event),
    ['auth.login.account_blocked', 'auth.login.rejected_while_blocked'],
  );
  assert.equal(events[0].account, events[1].account);
  assert.match(events[0].account, /^[\w-]{16}$/);
  assert.equal(events[0].windowSeconds, 300);
  const serialized = JSON.stringify(events);
  assert.equal(serialized.includes(VICTIM), false);
  assert.equal(serialized.includes(ATTACKER_IP), false);
});

test('usa o cabeçalho de IP somente quando configurado e válido', () => {
  const request = (headers, remoteAddress = '127.0.0.1') => ({
    get: (name) => headers[name.toLowerCase()],
    socket: { remoteAddress },
  });

  assert.equal(resolveClientIp(request({ 'cf-connecting-ip': ATTACKER_IP }), null), '127.0.0.1');
  assert.equal(
    resolveClientIp(request({ 'cf-connecting-ip': ATTACKER_IP }), 'cf-connecting-ip'),
    ATTACKER_IP,
  );
  assert.equal(
    resolveClientIp(request({ 'x-forwarded-for': `${VICTIM_IP}, 10.0.0.1` }), 'x-forwarded-for'),
    VICTIM_IP,
  );
  assert.equal(
    resolveClientIp(request({ 'cf-connecting-ip': 'não-é-ip' }), 'cf-connecting-ip'),
    '127.0.0.1',
  );
});
