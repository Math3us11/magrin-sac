import assert from 'node:assert/strict';
import test from 'node:test';
import {
  down,
  up,
} from '../dist/database/migrations/20261015110000-seed-attendance-permissions.migration.js';

function createContext() {
  const calls = [];
  const ids = new Map([
    ['attendance.manage.assigned', 71],
    ['attendance.manage.any', 72],
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

test('seed separa o registro atribuído do registro administrativo global', async () => {
  const state = createContext();
  await up({ context: state.context });
  const assignments = state.calls.find(
    ([operation, table]) => operation === 'bulkInsert' && table === 'user_type_permissions',
  )[2];
  assert.deepEqual(
    assignments.map(({ permission_id, user_type }) => [permission_id, user_type]),
    [
      [71, 'professor'],
      [72, 'administrador'],
    ],
  );
});

test('rollback remove vínculos antes das permissões', async () => {
  const state = createContext();
  await down({ context: state.context });
  assert.deepEqual(
    state.calls.filter(([operation]) => operation === 'bulkDelete').map(([, table]) => table),
    ['user_type_permissions', 'permissions'],
  );
});
