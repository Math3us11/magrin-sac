import assert from 'node:assert/strict';
import test from 'node:test';
import {
  resolveCloudflareConfig,
  resolveStableDatabase,
} from '../../scripts/cloudflare-config.mjs';

const validEnvironment = {
  CLOUDFLARE_PUBLIC_HOSTNAME: 'agenda.magrinapp.com',
  CLOUDFLARE_TUNNEL_ID: '123e4567-e89b-42d3-a456-426614174000',
  CLOUDFLARE_TUNNEL_ORIGIN: 'http://127.0.0.1:3100',
};

test('aceita hostname do domínio e origem presa ao loopback', () => {
  const config = resolveCloudflareConfig(validEnvironment);

  assert.equal(config.publicHostname, 'agenda.magrinapp.com');
  assert.equal(config.origin.origin, 'http://127.0.0.1:3100');
  assert.equal(config.port, '3100');
});

test('rejeita domínio externo e origem de rede', () => {
  assert.throws(
    () =>
      resolveCloudflareConfig({
        ...validEnvironment,
        CLOUDFLARE_PUBLIC_HOSTNAME: 'example.com',
      }),
    /magrinapp\.com/,
  );
  assert.throws(
    () =>
      resolveCloudflareConfig({
        ...validEnvironment,
        CLOUDFLARE_TUNNEL_ORIGIN: 'http://0.0.0.0:3100',
      }),
    /origem HTTP local/,
  );
});

test('exige um banco estável explícito e com nome seguro', () => {
  assert.equal(resolveStableDatabase({ STABLE_DB_DATABASE: 'magrin_sac' }), 'magrin_sac');
  assert.throws(() => resolveStableDatabase({}), /STABLE_DB_DATABASE/);
  assert.throws(
    () => resolveStableDatabase({ STABLE_DB_DATABASE: 'magrin-sac;drop' }),
    /STABLE_DB_DATABASE/,
  );
});
