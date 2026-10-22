import assert from 'node:assert/strict';
import test from 'node:test';
import { DashboardService } from '../dist/modules/dashboard/dashboard.service.js';

function createService({
  attendances = [],
  availabilities = [{ id: 10 }],
  appointments = [],
} = {}) {
  const calls = { appointments: [], attendances: [], availabilities: [] };
  const service = new DashboardService(
    {
      findAll: async (options) => {
        calls.appointments.push(options);
        return appointments;
      },
    },
    {
      findAll: async (options) => {
        calls.attendances.push(options);
        return attendances;
      },
    },
    {
      unscoped: () => ({
        findAll: async (options) => {
          calls.availabilities.push(options);
          return availabilities;
        },
      }),
    },
    {
      localToUtc: (date, time) => new Date(`${date}T${time}:00.000-04:00`),
    },
  );
  return { calls, service };
}

const query = { from: '2026-10-01', to: '2026-10-31' };

test('calcula os quatro totais diretamente dos registros de atendimento', async () => {
  const { service } = createService({
    appointments: [{ id: 30 }, { id: 31 }, { id: 32 }, { id: 33 }],
    attendances: [
      { occurrence: 'realizado', resolutionStatus: 'resolvido' },
      { occurrence: 'realizado', resolutionStatus: 'nao_resolvido' },
      { occurrence: 'realizado', resolutionStatus: 'em_tratativa' },
      { occurrence: 'ausencia', resolutionStatus: null },
    ],
  });

  assert.deepEqual(await service.summarizeAny(query), {
    filters: query,
    inProgress: 1,
    performed: 3,
    resolved: 1,
    unresolved: 1,
  });
});

test('restringe o resumo do professor às disponibilidades atribuídas', async () => {
  const state = createService({
    appointments: [{ id: 30 }],
    attendances: [{ occurrence: 'realizado', resolutionStatus: 'em_tratativa' }],
  });

  const result = await state.service.summarizeAssigned(query, 8);

  assert.equal(result.inProgress, 1);
  assert.equal(state.calls.availabilities[0].where.professorId, 8);
  assert.ok(state.calls.appointments[0].where.availabilityId);
  assert.ok(state.calls.appointments[0].where.status);
});

test('retorna totais zerados sem consultar atendimentos quando o professor não possui agenda', async () => {
  const state = createService({ availabilities: [] });

  assert.deepEqual(await state.service.summarizeAssigned(query, 8), {
    filters: query,
    inProgress: 0,
    performed: 0,
    resolved: 0,
    unresolved: 0,
  });
  assert.equal(state.calls.appointments.length, 0);
  assert.equal(state.calls.attendances.length, 0);
});

test('rejeita período invertido ou superior a 366 dias', async () => {
  const { service } = createService();

  await assert.rejects(
    service.summarizeAny({ from: '2026-10-31', to: '2026-10-01' }),
    /igual ou posterior/,
  );
  await assert.rejects(
    service.summarizeAny({ from: '2025-01-01', to: '2026-12-31' }),
    /no máximo 366 dias/,
  );
});
