import assert from 'node:assert/strict';
import test from 'node:test';
import { BadRequestException } from '@nestjs/common';
import { Op } from 'sequelize';
import { AuditService, diffAuditFields } from '../dist/modules/audit/audit.service.js';

function createService({ rows = [], count = rows.length, actors = [] } = {}) {
  const calls = { bulkCreate: null, findAndCountAll: null, userFindAll: null };
  const auditLogModel = {
    bulkCreate: async (records, options) => {
      calls.bulkCreate = { options, records };
    },
    findAndCountAll: async (options) => {
      calls.findAndCountAll = options;
      return { count, rows };
    },
  };
  const userModel = {
    unscoped: () => ({
      findAll: async (options) => {
        calls.userFindAll = options;
        return actors;
      },
    }),
  };
  const institutionDateTime = {
    localToUtc: (date, time) => new Date(`${date}T${time}:00.000-04:00`),
  };

  return { calls, service: new AuditService(auditLogModel, userModel, institutionDateTime) };
}

test('registra entradas na transação recebida e serializa as alterações', async () => {
  const { calls, service } = createService();
  const transaction = { id: 'operation-transaction' };

  await service.record(
    [
      {
        action: 'user.updated',
        actorId: 3,
        changes: { name: { from: 'Antes', to: 'Depois' } },
        entityId: 10,
        entityType: 'user',
        reason: '  Correção cadastral.  ',
      },
      { action: 'availability.blocked', actorId: 8, entityId: 15, entityType: 'availability' },
    ],
    transaction,
  );

  assert.equal(calls.bulkCreate.options.transaction, transaction);
  const [first, second] = calls.bulkCreate.records;
  assert.equal(first.changes, '{"name":{"from":"Antes","to":"Depois"}}');
  assert.equal(first.reason, 'Correção cadastral.');
  assert.ok(first.occurredAt instanceof Date);
  assert.equal(second.changes, null);
  assert.equal(second.reason, null);
});

test('não grava nada para uma lista vazia', async () => {
  const { calls, service } = createService();

  await service.record([], { id: 'transaction' });

  assert.equal(calls.bulkCreate, null);
});

test('diff registra somente campos alterados e omite valores sensíveis', () => {
  const changes = diffAuditFields(
    { cpf: '11111111111', email: 'a@example.com', isActive: true, name: 'Igual', phone: '1' },
    { cpf: '22222222222', email: 'b@example.com', isActive: true, name: 'Igual', phone: '1' },
    { fields: ['name', 'email', 'isActive'], redacted: ['cpf', 'phone'] },
  );

  assert.deepEqual(changes, {
    cpf: { redacted: true },
    email: { from: 'a@example.com', to: 'b@example.com' },
  });
});

test('diff de criação ignora campos vazios e normaliza datas em ISO', () => {
  const changes = diffAuditFields(
    null,
    { details: undefined, startsAt: new Date('2099-10-05T12:00:00.000Z'), status: 'confirmado' },
    { fields: ['startsAt', 'status', 'details'] },
  );

  assert.deepEqual(changes, {
    startsAt: { from: null, to: '2099-10-05T12:00:00.000Z' },
    status: { from: null, to: 'confirmado' },
  });
});

test('consulta paginada aplica período institucional, filtros e identifica o ator', async () => {
  const { calls, service } = createService({
    actors: [{ id: 3, name: 'Administrador' }],
    count: 41,
    rows: [
      {
        action: 'user.updated',
        actorId: 3,
        changes: '{"isActive":{"from":true,"to":false}}',
        entityId: 10,
        entityType: 'user',
        id: 7,
        occurredAt: new Date('2099-10-05T15:00:00.000Z'),
        reason: null,
      },
      {
        action: 'user.created',
        actorId: null,
        changes: null,
        entityId: 1,
        entityType: 'user',
        id: 6,
        occurredAt: new Date('2099-10-05T14:00:00.000Z'),
        reason: null,
      },
    ],
  });

  const response = await service.list({
    action: 'user.updated',
    actorId: 3,
    from: '2099-10-01',
    page: 3,
    pageSize: 20,
    to: '2099-10-31',
  });

  const { where } = calls.findAndCountAll;
  assert.equal(where.occurredAt[Op.gte].toISOString(), '2099-10-01T04:00:00.000Z');
  assert.equal(where.occurredAt[Op.lt].toISOString(), '2099-11-01T04:00:00.000Z');
  assert.equal(where.action, 'user.updated');
  assert.equal(where.actorId, 3);
  assert.equal(calls.findAndCountAll.offset, 40);
  assert.equal(calls.findAndCountAll.limit, 20);
  assert.deepEqual(calls.findAndCountAll.order[0], ['occurredAt', 'DESC']);
  assert.equal(calls.userFindAll.paranoid, false);
  assert.deepEqual(response.entries[0].actor, { id: 3, name: 'Administrador' });
  assert.deepEqual(response.entries[0].changes, { isActive: { from: true, to: false } });
  assert.equal(response.entries[0].occurredAt, '2099-10-05T15:00:00.000Z');
  assert.equal(response.entries[1].actor, null);
  assert.deepEqual(response.entries[1].changes, {});
  assert.equal(response.total, 41);
  assert.deepEqual(response.range, { from: '2099-10-01', to: '2099-10-31' });
});

test('rejeita período invertido ou maior que 62 dias', async () => {
  const { calls, service } = createService();

  await assert.rejects(service.list({ from: '2099-10-10', to: '2099-10-01' }), BadRequestException);
  await assert.rejects(service.list({ from: '2099-01-01', to: '2099-03-31' }), /no máximo 62 dias/);
  assert.equal(calls.findAndCountAll, null);
});
