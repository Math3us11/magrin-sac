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
