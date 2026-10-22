import assert from 'node:assert/strict';
import test from 'node:test';
import { HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoginAttemptService } from '../dist/modules/auth/login-attempt.service.js';

function createService(maxFailures = 3) {
  return new LoginAttemptService(
    new ConfigService({
      auth: {
        loginAttempts: {
          maxFailures,
          windowSeconds: 300,
        },
      },
    }),
  );
}

test('bloqueia temporariamente a identidade ao alcançar o limite de falhas', () => {
  const service = createService(2);

  service.assertAllowed('aluno@example.com');
  service.recordFailure('aluno@example.com');
  assert.throws(
    () => service.recordFailure('aluno@example.com'),
    (error) => error instanceof HttpException && error.getStatus() === HttpStatus.TOO_MANY_REQUESTS,
  );
  assert.throws(
    () => service.assertAllowed('aluno@example.com'),
    (error) => error instanceof HttpException && error.getStatus() === HttpStatus.TOO_MANY_REQUESTS,
  );
});

test('normaliza a identidade sem expor o e-mail e limpa o contador após sucesso', () => {
  const service = createService(2);

  service.recordFailure(' Aluno@Example.com ');
  service.clear('aluno@example.com');

  assert.doesNotThrow(() => service.assertAllowed('ALUNO@EXAMPLE.COM'));
  assert.doesNotThrow(() => service.recordFailure('aluno@example.com'));
});
