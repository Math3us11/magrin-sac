import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  DEVELOPMENT_SESSION_SECRET,
  environmentValidationSchema,
} from '../dist/config/env.validation.js';

function exampleEnvironment() {
  const content = readFileSync(new URL('../../.env.example', import.meta.url), 'utf8');
  return Object.fromEntries(
    content
      .split(/\r?\n/)
      .filter((line) => /^[A-Z0-9_]+=/.test(line))
      .map((line) => {
        const separator = line.indexOf('=');
        return [line.slice(0, separator), line.slice(separator + 1)];
      }),
  );
}

test('.env.example inicia o ambiente local sem gerar segredos', () => {
  const environment = exampleEnvironment();

  assert.equal(environment.AUTH_SESSION_JWT_SECRET, DEVELOPMENT_SESSION_SECRET);
  const { error } = environmentValidationSchema.validate(environment, { allowUnknown: true });
  assert.equal(error, undefined);
});

test('segredo de sessão do .env.example é recusado em produção', () => {
  const environment = { ...exampleEnvironment(), APP_ENV: 'production' };

  const { error } = environmentValidationSchema.validate(environment, { allowUnknown: true });
  assert.match(error?.message ?? '', /must be replaced in production/);

  const replaced = environmentValidationSchema.validate(
    { ...environment, AUTH_SESSION_JWT_SECRET: 'a'.repeat(48) },
    { allowUnknown: true },
  );
  assert.equal(replaced.error, undefined);
});
