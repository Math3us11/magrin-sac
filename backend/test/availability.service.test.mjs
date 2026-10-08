import assert from 'node:assert/strict';
import test from 'node:test';
import { Op } from 'sequelize';
import { AvailabilityService } from '../dist/modules/availability/availability.service.js';

function createService({ existing = [] } = {}) {
  const calls = {
    availabilityFindAll: [],
    createdAvailabilities: null,
    createdModalities: null,
    professorLookup: null,
  };
  const availabilityModel = {
    create: async (row) => {
      calls.createdAvailabilities ??= [];
      calls.createdAvailabilities.push(row);
      return { id: 99 + calls.createdAvailabilities.length, ...row };
    },
    findAll: async (options) => {
      calls.availabilityFindAll.push(options);
      return existing;
    },
  };
  const availabilityModalityModel = {
    bulkCreate: async (rows) => {
      calls.createdModalities = rows;
    },
    findAll: async () => [{ availabilityId: 90, modalityOptionItemId: 21 }],
  };
  const systemOptionModel = { findOne: async () => ({ id: 20 }) };
  const systemOptionItemModel = {
    findAll: async (options) =>
      options.where.optionId
        ? [
            { id: 21, value: 'presencial' },
            { id: 22, value: 'online' },
          ]
        : [{ id: 21, value: 'presencial' }],
  };
  const userModel = {
    unscoped: () => ({
      findAll: async () => [{ id: 8, isActive: true, name: 'Professor Teste' }],
      findByPk: async (_id, options) => {
        calls.professorLookup = options;
        return { id: 8, isActive: true, userType: 'professor' };
      },
    }),
  };
  const transaction = { LOCK: { UPDATE: 'UPDATE' }, id: 'transaction' };
  const sequelize = { transaction: async (callback) => callback(transaction) };
  const institutionDateTime = {
    localToUtc: (date, time) => new Date(`${date}T${time}:00.000-04:00`),
  };

  return {
    calls,
    service: new AvailabilityService(
      availabilityModel,
      availabilityModalityModel,
      systemOptionModel,
      systemOptionItemModel,
      userModel,
      sequelize,
      institutionDateTime,
    ),
  };
}

test('publica lote em UTC e cria um vínculo para cada modalidade', async () => {
  const { calls, service } = createService();

  const response = await service.createBatch(
    {
      items: [
        {
          date: '2099-10-03',
          endTime: '15:00',
          modalities: ['presencial', 'online'],
          startTime: '14:00',
        },
      ],
    },
    8,
  );

  assert.equal(calls.createdAvailabilities[0].startsAt.toISOString(), '2099-10-03T18:00:00.000Z');
  assert.equal(calls.createdAvailabilities[0].endsAt.toISOString(), '2099-10-03T19:00:00.000Z');
  assert.equal(calls.createdAvailabilities[0].professorId, 8);
  assert.deepEqual(
    calls.createdModalities.map(({ availabilityId, modalityOptionItemId }) => ({
      availabilityId,
      modalityOptionItemId,
    })),
    [
      { availabilityId: 100, modalityOptionItemId: 21 },
      { availabilityId: 100, modalityOptionItemId: 22 },
    ],
  );
  assert.equal(calls.professorLookup.lock, 'UPDATE');
  assert.equal(response.availabilities[0].startsAt, '2099-10-03T18:00:00.000Z');
});

test('rejeita conflito persistido antes de criar o lote', async () => {
  const { calls, service } = createService({
    existing: [
      {
        endsAt: new Date('2099-10-03T19:30:00.000Z'),
        id: 90,
        startsAt: new Date('2099-10-03T18:30:00.000Z'),
      },
    ],
  });

  await assert.rejects(
    service.createBatch(
      {
        items: [
          {
            date: '2099-10-03',
            endTime: '15:00',
            modalities: ['presencial'],
            startTime: '14:00',
          },
        ],
      },
      8,
    ),
    /conflitam com disponibilidades publicadas/,
  );

  assert.equal(calls.createdAvailabilities, null);
  const conflictQuery = calls.availabilityFindAll[0];
  assert.equal(conflictQuery.where.professorId, 8);
  assert.ok(conflictQuery.where.startsAt[Op.lt] instanceof Date);
  assert.ok(conflictQuery.where.endsAt[Op.gt] instanceof Date);
});

test('rejeita intervalos sobrepostos dentro do mesmo lote', async () => {
  const { calls, service } = createService();

  await assert.rejects(
    service.createBatch(
      {
        items: [
          {
            date: '2099-10-03',
            endTime: '15:00',
            modalities: ['presencial'],
            startTime: '14:00',
          },
          {
            date: '2099-10-03',
            endTime: '15:30',
            modalities: ['online'],
            startTime: '14:30',
          },
        ],
      },
      8,
    ),
    /horários conflitantes no lote/,
  );

  assert.equal(calls.professorLookup, null);
});

test('administrador consulta disponibilidades de todos os professores no período', async () => {
  const { service } = createService({
    existing: [
      {
        endsAt: new Date('2099-10-03T19:00:00.000Z'),
        id: 90,
        professorId: 8,
        startsAt: new Date('2099-10-03T18:00:00.000Z'),
        state: 'ativa',
      },
    ],
  });

  const response = await service.listAll({
    from: '2099-10-01',
    modality: 'presencial',
    to: '2099-10-31',
  });

  assert.equal(response.availabilities.length, 1);
  assert.deepEqual(response.availabilities[0].professor, {
    id: 8,
    isActive: true,
    name: 'Professor Teste',
  });
  assert.deepEqual(response.availabilities[0].modalities, ['presencial']);
  assert.deepEqual(response.summary, { active: 1, blocked: 0, cancelled: 0 });
});
