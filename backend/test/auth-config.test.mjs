import assert from 'node:assert/strict';
import test from 'node:test';
import authConfig from '../dist/config/auth.config.js';

function withEnvironment(values, callback) {
  const previous = Object.fromEntries(Object.keys(values).map((key) => [key, process.env[key]]));

  try {
    for (const [key, value] of Object.entries(values)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    callback();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

test('permite cookie Secure no túnel sem transformar o ambiente em produção', () => {
  withEnvironment(
    {
      APP_ENV: 'development',
      AUTH_SESSION_COOKIE_SECURE: 'true',
    },
    () => assert.equal(authConfig().cookie.secure, true),
  );
});

test('mantém compatibilidade usando APP_ENV quando não há override do cookie', () => {
  withEnvironment(
    {
      APP_ENV: 'development',
      AUTH_SESSION_COOKIE_SECURE: undefined,
    },
    () => assert.equal(authConfig().cookie.secure, false),
  );
  withEnvironment(
    {
      APP_ENV: 'production',
      AUTH_SESSION_COOKIE_SECURE: undefined,
    },
    () => assert.equal(authConfig().cookie.secure, true),
  );
});

test('configura a proteção de tentativas de login com valores explícitos', () => {
  withEnvironment(
    {
      AUTH_LOGIN_CLIENT_IP_HEADER: ' CF-Connecting-IP ',
      AUTH_LOGIN_MAX_FAILURES: '4',
      AUTH_LOGIN_MAX_FAILURES_PER_CLIENT: '15',
      AUTH_LOGIN_WINDOW_SECONDS: '120',
    },
    () =>
      assert.deepEqual(authConfig().loginAttempts, {
        clientIpHeader: 'cf-connecting-ip',
        maxFailures: 4,
        maxFailuresPerClient: 15,
        windowSeconds: 120,
      }),
  );
});

test('não confia em cabeçalho de IP sem configuração explícita', () => {
  withEnvironment(
    {
      AUTH_LOGIN_CLIENT_IP_HEADER: '',
      AUTH_LOGIN_MAX_FAILURES_PER_CLIENT: undefined,
    },
    () => {
      assert.equal(authConfig().loginAttempts.clientIpHeader, null);
      assert.equal(authConfig().loginAttempts.maxFailuresPerClient, 20);
    },
  );
});
