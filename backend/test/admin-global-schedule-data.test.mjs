import assert from 'node:assert/strict';
import test from 'node:test';
import {
  down,
  up,
} from '../dist/database/migrations/20261007100000-seed-admin-global-schedule.migration.js';

function createContext() {
  const calls = [];
  const ids = new Map([
    ['administration', 40],
    ['availability.read.any', 51],
    ['appointments.read.any', 52],
  ]);
  const transaction = { id: 'transaction' };

  return {
    calls,
    context: {
      bulkDelete: async (...args) => calls.push(['bulkDelete', ...args]),
      bulkInsert: async (...args) => calls.push(['bulkInsert', ...args]),
      sequelize: {
        query: async (_sql, options) =>
          options.replacements.codes.map((code) => ({ code, id: ids.get(code) })),
        transaction: async (callback) => callback(transaction),
      },
    },
  };
}

test('seed concede leitura global somente ao administrador e adiciona a agenda geral', async () => {
  const state = createContext();
  await up({ context: state.context });

  const permissionInsert = state.calls.find(
    ([operation, table]) => operation === 'bulkInsert' && table === 'permissions',
  );
  assert.deepEqual(
    permissionInsert[2].map(({ code }) => code),
    ['availability.read.any', 'appointments.read.any'],
  );

  const assignments = state.calls.find(
    ([operation, table]) => operation === 'bulkInsert' && table === 'user_type_permissions',
  );
  assert.ok(assignments[2].every(({ user_type }) => user_type === 'administrador'));

  const menuInsert = state.calls.find(
    ([operation, table]) => operation === 'bulkInsert' && table === 'menu_items',
  );
  assert.equal(menuInsert[2][0].code, 'administration.schedule');
  assert.equal(menuInsert[2][0].route_name, 'administration-schedule');
  assert.equal(menuInsert[2][0].parent_id, 40);
});

test('rollback remove menu e permissões globais sem apagar o agrupador administrativo', async () => {
  const state = createContext();
  await down({ context: state.context });

  const menuDelete = state.calls.find(
    ([operation, table]) => operation === 'bulkDelete' && table === 'menu_items',
  );
  assert.deepEqual(menuDelete[2], { code: 'administration.schedule' });
  assert.equal(JSON.stringify(state.calls).includes('"code":"administration"'), false);
});
