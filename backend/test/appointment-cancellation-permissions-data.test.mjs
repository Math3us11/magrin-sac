import assert from 'node:assert/strict';
import test from 'node:test';
import {
  down,
  up,
} from '../dist/database/migrations/20261009100000-seed-appointment-cancellation-permissions.migration.js';

function createContext() {
  const calls = [];
  const ids = new Map([
    ['appointments.cancel.own', 61],
    ['appointments.read.assigned', 62],
    ['appointments.cancel.assigned', 63],
    ['appointments.cancel.any', 64],
  ]);

  return {
    calls,
    context: {
      bulkDelete: async (...args) => calls.push(['bulkDelete', ...args]),
      bulkInsert: async (...args) => calls.push(['bulkInsert', ...args]),
      sequelize: {
        query: async (_sql, options) =>
          options.replacements.codes.map((code) => ({ code, id: ids.get(code) })),
        transaction: async (callback) => callback({ id: 'transaction' }),
      },
    },
  };
}

test('seed concede cada permissão de cancelamento somente ao perfil correspondente', async () => {
  const state = createContext();
  await up({ context: state.context });

  const assignments = state.calls.find(
    ([operation, table]) => operation === 'bulkInsert' && table === 'user_type_permissions',
  )[2];
  assert.deepEqual(
    assignments.map(({ permission_id, user_type }) => [permission_id, user_type]),
    [
      [61, 'aluno'],
      [62, 'professor'],
      [63, 'professor'],
      [64, 'administrador'],
    ],
  );
});

test('rollback remove vínculos antes das permissões de cancelamento', async () => {
  const state = createContext();
  await down({ context: state.context });

  assert.deepEqual(
    state.calls.filter(([operation]) => operation === 'bulkDelete').map(([, table]) => table),
    ['user_type_permissions', 'permissions'],
  );
});
