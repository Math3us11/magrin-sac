import assert from 'node:assert/strict';
import test from 'node:test';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { AvailabilityService } from '../dist/modules/availability/availability.service.js';
import { createAuditFake } from './audit-fake.mjs';

const FUTURE_START = new Date('2099-10-05T12:00:00.000Z');
const FUTURE_END = new Date('2099-10-05T16:00:00.000Z');

function createAvailability(overrides = {}) {
  const availability = {
    endsAt: FUTURE_END,
    id: 10,
    professorId: 8,
    startsAt: FUTURE_START,
    state: 'ativa',
    updates: [],
    update: async (values, options) => {
      availability.updates.push({ options, values });
      Object.assign(availability, values);
    },
    ...overrides,
  };
  return availability;
}

function createService({
  availabilities = [],
  confirmed = [],
  target = createAvailability(),
} = {}) {
  const calls = { appointmentFindAll: [], availabilityFindByPk: null };
  const audit = createAuditFake();
  const transaction = { LOCK: { UPDATE: 'UPDATE' }, id: 'transaction' };
  const availabilityModel = {
    findAll: async () => availabilities,
    findByPk: async (id, options) => {
      calls.availabilityFindByPk = { id, options };
      return target;
    },
  };
  const availabilityModalityModel = {
    findAll: async () => [{ availabilityId: target?.id ?? 10, modalityOptionItemId: 21 }],
  };
  const systemOptionItemModel = { findAll: async () => [{ id: 21, value: 'presencial' }] };
  const appointmentModel = {
    findAll: async (options) => {
      calls.appointmentFindAll.push(options);
      return confirmed;
    },
  };

  return {
    calls,
    service: new AvailabilityService(
      availabilityModel,
      availabilityModalityModel,
      {},
      systemOptionItemModel,
      {},
      { transaction: async (callback) => callback(transaction) },
      {},
      appointmentModel,
      audit.service,
    ),
    audit,
    transaction,
  };
}

test('agenda própria separa janelas livres, reservadas e bloqueadas', async () => {
  const { calls, service } = createService({
    availabilities: [
      createAvailability({ id: 10 }),
      createAvailability({ id: 11 }),
      createAvailability({ id: 12, state: 'bloqueada' }),
    ],
    confirmed: [{ availabilityId: 11 }, { availabilityId: 11 }],
  });

  const response = await service.listOwn(8);

  assert.deepEqual(response.summary, { available: 1, blocked: 1, reserved: 1 });
  assert.deepEqual(
    response.availabilities.map(({ confirmedAppointments, id }) => [id, confirmedAppointments]),
    [
      [10, 0],
      [11, 2],
      [12, 0],
    ],
  );
  assert.equal(calls.appointmentFindAll[0].where.status, 'confirmado');
});

test('professor bloqueia horário próprio sem agendamento confirmado', async () => {
  const target = createAvailability();
  const { audit, calls, service, transaction } = createService({ target });

  const response = await service.blockOwn(10, 8);

  assert.equal(calls.availabilityFindByPk.options.lock, 'UPDATE');
  assert.equal(calls.availabilityFindByPk.options.transaction, transaction);
  assert.equal(calls.appointmentFindAll[0].lock, 'UPDATE');
  assert.deepEqual(target.updates[0].values, { state: 'bloqueada', updatedBy: 8 });
  assert.equal(response.availability.state, 'bloqueada');
  assert.deepEqual(response.availability.modalities, ['presencial']);
  assert.equal(response.message, 'Horário bloqueado com sucesso.');
  assert.equal(audit.entries.length, 1);
  assert.equal(audit.entries[0].action, 'availability.blocked');
  assert.equal(audit.entries[0].actorId, 8);
  assert.equal(audit.entries[0].transaction, transaction);
  assert.deepEqual(audit.entries[0].changes, { state: { from: 'ativa', to: 'bloqueada' } });
});

test('não bloqueia horário que já possui agendamento confirmado', async () => {
  const target = createAvailability();
  const { audit, service } = createService({ confirmed: [{ id: 30 }], target });

  await assert.rejects(() => service.blockOwn(10, 8), ConflictException);
  assert.equal(audit.entries.length, 0);
  assert.equal(target.updates.length, 0);
  assert.equal(target.state, 'ativa');
});

test('professor desbloqueia horário próprio bloqueado', async () => {
  const target = createAvailability({ state: 'bloqueada' });
  const { audit, service } = createService({ target });

  const response = await service.unblockOwn(10, 8);

  assert.deepEqual(target.updates[0].values, { state: 'ativa', updatedBy: 8 });
  assert.equal(response.message, 'Horário desbloqueado com sucesso.');
  assert.equal(audit.entries[0].action, 'availability.unblocked');
  assert.deepEqual(audit.entries[0].changes, { state: { from: 'bloqueada', to: 'ativa' } });
});

test('não altera horário de outro professor nem revela sua existência', async () => {
  const target = createAvailability({ professorId: 99 });
  const { service } = createService({ target });

  await assert.rejects(() => service.blockOwn(10, 8), NotFoundException);
  await assert.rejects(() => service.unblockOwn(10, 8), NotFoundException);
  assert.equal(target.updates.length, 0);
});

test('rejeita transições inválidas e horários encerrados', async () => {
  const blocked = createAvailability({ state: 'bloqueada' });
  await assert.rejects(() => createService({ target: blocked }).service.blockOwn(10, 8), {
    message: 'Somente horários ativos podem ser bloqueados.',
  });

  const active = createAvailability();
  await assert.rejects(() => createService({ target: active }).service.unblockOwn(10, 8), {
    message: 'Somente horários bloqueados podem ser desbloqueados.',
  });

  const ended = createAvailability({ endsAt: new Date(Date.now() - 60_000) });
  await assert.rejects(() => createService({ target: ended }).service.blockOwn(10, 8), {
    message: 'Não é possível alterar um horário já encerrado.',
  });

  assert.equal(blocked.updates.length + active.updates.length + ended.updates.length, 0);
});
