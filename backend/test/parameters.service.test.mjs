import assert from 'node:assert/strict';
import test from 'node:test';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  down,
  up,
} from '../dist/database/migrations/20261029100000-seed-parameters-navigation.migration.js';
import { UpdateSystemParameterDto } from '../dist/modules/parameters/dto/update-system-parameter.dto.js';
import { ParametersService } from '../dist/modules/parameters/parameters.service.js';
import { createAuditFake } from './audit-fake.mjs';

const NAME = 'APPOINTMENT_CANCELLATION_MIN_NOTICE_MINUTES';

function storedRow(overrides = {}) {
  const row = {
    deletedAt: null,
    id: 5,
    name: NAME,
    restored: false,
    updatedAt: new Date('2099-10-01T12:00:00.000Z'),
    updatedBy: 3,
    updates: [],
    value: '120',
    restore: async () => {
      row.restored = true;
      row.deletedAt = null;
    },
    update: async (values, options) => {
      row.updates.push({ options, values });
      Object.assign(row, values);
    },
    ...overrides,
  };
  return row;
}

function createService({ row = storedRow(), rows = row ? [row] : [] } = {}) {
  const audit = createAuditFake();
  const calls = { created: null, lookup: null };
  const transaction = { LOCK: { UPDATE: 'UPDATE' }, id: 'parameter-transaction' };
  const systemParameterModel = {
    create: async (values) => {
      calls.created = values;
      return { id: 9, updatedAt: new Date('2099-10-02T12:00:00.000Z'), ...values };
    },
    findAll: async () => rows,
    findOne: async (options) => {
      calls.lookup = options;
      return row;
    },
  };
  const userModel = {
    unscoped: () => ({ findAll: async () => [{ id: 3, name: 'Administrador Teste' }] }),
  };

  return {
    audit,
    calls,
    service: new ParametersService(
      systemParameterModel,
      userModel,
      { transaction: async (callback) => callback(transaction) },
      audit.service,
    ),
    transaction,
  };
}

test('lista o catálogo com valor em uso, limites e último responsável', async () => {
  const { service } = createService();
  const { parameters } = await service.list();

  assert.equal(parameters.length, 1);
  assert.deepEqual(parameters[0], {
    description: parameters[0].description,
    fallback: 120,
    label: 'Antecedência mínima de cancelamento',
    max: 10080,
    min: 0,
    name: NAME,
    unit: 'minutes',
    updatedAt: '2099-10-01T12:00:00.000Z',
    updatedBy: { id: 3, name: 'Administrador Teste' },
    usingFallback: false,
    value: 120,
  });
});

test('sinaliza o valor aprovado quando a linha falta ou é inválida', async () => {
  const missing = await createService({ row: null }).service.list();
  assert.equal(missing.parameters[0].usingFallback, true);
  assert.equal(missing.parameters[0].value, 120);
  assert.equal(missing.parameters[0].updatedBy, null);

  const invalid = await createService({ row: storedRow({ value: 'duas horas' }) }).service.list();
  assert.equal(invalid.parameters[0].usingFallback, true);
});

test('altera o valor na transação, trava a linha e audita com motivo', async () => {
  const row = storedRow();
  const { audit, calls, service, transaction } = createService({ row });

  const response = await service.update(NAME, { reason: 'Decisão da coordenação.', value: 180 }, 3);

  assert.equal(calls.lookup.lock, 'UPDATE');
  assert.equal(calls.lookup.paranoid, false);
  assert.deepEqual(row.updates[0].values, { updatedBy: 3, value: '180' });
  assert.equal(row.updates[0].options.transaction, transaction);
  assert.deepEqual(
    audit.entries.map(({ action, actorId, changes, entityId, entityType, reason }) => ({
      action,
      actorId,
      changes,
      entityId,
      entityType,
      reason,
    })),
    [
      {
        action: 'system_parameter.updated',
        actorId: 3,
        changes: { value: { from: 120, to: 180 } },
        entityId: 5,
        entityType: 'system_parameter',
        reason: 'Decisão da coordenação.',
      },
    ],
  );
  assert.equal(audit.entries[0].transaction, transaction);
  assert.equal(response.parameter.value, 180);
  assert.equal(response.message, 'Parâmetro atualizado com sucesso.');
});

test('cria a linha ausente e registra a origem nula na auditoria', async () => {
  const { audit, calls, service } = createService({ row: null });

  await service.update(NAME, { reason: 'Configuração inicial.', value: 60 }, 3);

  assert.equal(calls.created.value, '60');
  assert.equal(calls.created.createdBy, 3);
  assert.equal(audit.entries[0].entityId, 9);
  assert.deepEqual(audit.entries[0].changes, { value: { from: null, to: 60 } });
});

test('restaura a linha excluída logicamente em vez de duplicar o nome', async () => {
  const row = storedRow({ deletedAt: new Date('2099-09-01T00:00:00.000Z') });
  const { calls, service } = createService({ row });

  await service.update(NAME, { reason: 'Reativação.', value: 120 }, 3);

  assert.equal(row.restored, true);
  assert.equal(calls.created, null);
});

test('rejeita parâmetro desconhecido, valor fora do intervalo ou sem mudança', async () => {
  const { audit, service } = createService();

  await assert.rejects(
    service.update('OUTRO_PARAMETRO', { reason: 'x', value: 1 }, 3),
    NotFoundException,
  );
  await assert.rejects(service.update(NAME, { reason: 'x', value: 10081 }, 3), /entre 0 e 10080/);
  await assert.rejects(
    service.update(NAME, { reason: 'x', value: 120 }, 3),
    (error) => error instanceof BadRequestException && /igual ao valor atual/.test(error.message),
  );
  assert.equal(audit.entries.length, 0);
});

test('DTO exige número inteiro e motivo preenchido', async () => {
  const valid = plainToInstance(UpdateSystemParameterDto, { reason: '  Ajuste.  ', value: 90 });
  assert.equal((await validate(valid)).length, 0);
  assert.equal(valid.reason, 'Ajuste.');

  for (const payload of [
    { reason: 'Ajuste.', value: 1.5 },
    { reason: 'Ajuste.', value: 'duas' },
    { reason: 'Ajuste.', value: -1 },
    { reason: '   ', value: 90 },
    { value: 90 },
  ]) {
    const errors = await validate(plainToInstance(UpdateSystemParameterDto, payload));
    assert.ok(errors.length > 0, JSON.stringify(payload));
  }
});

test('seed concede a gestão de parâmetros somente ao administrador', async () => {
  const calls = [];
  const ids = new Map([
    ['administration', 20],
    ['parameters.manage', 60],
  ]);
  const context = {
    bulkDelete: async (...args) => calls.push(['bulkDelete', ...args]),
    bulkInsert: async (...args) => calls.push(['bulkInsert', ...args]),
    sequelize: {
      query: async (_sql, options) => {
        const id = ids.get(options.replacements.code);
        return id === undefined ? [] : [{ code: options.replacements.code, id }];
      },
      transaction: async (callback) => callback({ id: 'transaction' }),
    },
  };

  await up({ context });
  const inserts = Object.fromEntries(
    calls
      .filter(([operation]) => operation === 'bulkInsert')
      .map(([, table, rows]) => [table, rows]),
  );
  assert.equal(inserts.permissions[0].code, 'parameters.manage');
  assert.deepEqual(
    inserts.user_type_permissions.map(({ user_type }) => user_type),
    ['administrador'],
  );
  assert.equal(inserts.menu_items[0].route_name, 'administration-parameters');
  assert.equal(inserts.menu_items[0].parent_id, 20);

  calls.length = 0;
  await down({ context });
  assert.deepEqual(
    calls.map(([, table]) => table),
    ['menu_items', 'user_type_permissions', 'permissions'],
  );
});
