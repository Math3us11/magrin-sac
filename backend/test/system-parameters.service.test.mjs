import assert from 'node:assert/strict';
import test from 'node:test';
import { Logger } from '@nestjs/common';
import {
  down,
  up,
} from '../dist/database/migrations/20261028110000-seed-cancellation-notice-parameter.migration.js';
import { SystemParametersService } from '../dist/helpers/system-parameters/system-parameters.service.js';

const NAME = 'APPOINTMENT_CANCELLATION_MIN_NOTICE_MINUTES';

function createService(row) {
  const lookups = [];
  const model = {
    findOne: async (options) => {
      lookups.push(options);
      return row;
    },
  };
  return { lookups, service: new SystemParametersService(model) };
}

function silenceWarnings(t) {
  const warnings = [];
  t.mock.method(Logger.prototype, 'warn', (message) => warnings.push(message));
  return warnings;
}

test('lê o parâmetro inteiro pelo nome', async (t) => {
  const warnings = silenceWarnings(t);
  const { lookups, service } = createService({ value: ' 90 ' });

  assert.equal(await service.getInteger(NAME), 90);
  assert.deepEqual(lookups[0].where, { name: NAME });
  assert.deepEqual(warnings, []);
});

test('usa o valor aprovado e avisa quando o parâmetro falta ou é inválido', async (t) => {
  const warnings = silenceWarnings(t);

  for (const row of [
    null,
    { value: 'duas horas' },
    { value: '-5' },
    { value: '10081' },
    { value: '1.5' },
  ]) {
    const { service } = createService(row);
    assert.equal(await service.getInteger(NAME), 120, JSON.stringify(row));
  }
  assert.equal(warnings.length, 5);
  assert.ok(warnings.every((message) => message.includes(NAME)));
});

test('aceita os limites do intervalo permitido', async (t) => {
  silenceWarnings(t);

  assert.equal(await createService({ value: '0' }).service.getInteger(NAME), 0);
  assert.equal(await createService({ value: '10080' }).service.getInteger(NAME), 10080);
});

test('seed cria a antecedência de 120 minutos e o rollback a remove', async () => {
  const calls = [];
  const context = {
    bulkDelete: async (...args) => calls.push(['bulkDelete', ...args]),
    bulkInsert: async (...args) => calls.push(['bulkInsert', ...args]),
  };

  await up({ context });
  const [, table, rows] = calls[0];
  assert.equal(table, 'system_parameters');
  assert.equal(rows[0].name, NAME);
  assert.equal(rows[0].value, '120');

  await down({ context });
  assert.deepEqual(calls[1], ['bulkDelete', 'system_parameters', { name: NAME }]);
});
