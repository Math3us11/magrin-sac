import assert from 'node:assert/strict';
import test from 'node:test';
import appConfig from '../dist/config/app.config.js';

test('configura bind local e frontend desabilitado por padrão', () => {
  const previousHost = process.env.APP_HOST;
  const previousServeFrontend = process.env.APP_SERVE_FRONTEND;

  delete process.env.APP_HOST;
  delete process.env.APP_SERVE_FRONTEND;

  try {
    const config = appConfig();
    assert.equal(config.host, '127.0.0.1');
    assert.equal(config.serveFrontend, false);
  } finally {
    if (previousHost === undefined) delete process.env.APP_HOST;
    else process.env.APP_HOST = previousHost;

    if (previousServeFrontend === undefined) delete process.env.APP_SERVE_FRONTEND;
    else process.env.APP_SERVE_FRONTEND = previousServeFrontend;
  }
});

test('habilita o frontend somente com valor textual true', () => {
  const previousServeFrontend = process.env.APP_SERVE_FRONTEND;

  try {
    process.env.APP_SERVE_FRONTEND = 'true';
    assert.equal(appConfig().serveFrontend, true);

    process.env.APP_SERVE_FRONTEND = 'false';
    assert.equal(appConfig().serveFrontend, false);
  } finally {
    if (previousServeFrontend === undefined) delete process.env.APP_SERVE_FRONTEND;
    else process.env.APP_SERVE_FRONTEND = previousServeFrontend;
  }
});
