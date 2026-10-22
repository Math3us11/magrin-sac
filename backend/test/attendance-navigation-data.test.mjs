import assert from 'node:assert/strict';
import test from 'node:test';
import {
  down,
  up,
} from '../dist/database/migrations/20261016100000-seed-attendance-navigation.migration.js';

function createContext() {
  const calls = [];
  const ids = new Map([
    ['agenda', 10],
    ['administration', 20],
    ['attendance.manage.assigned', 30],
    ['attendance.manage.any', 40],
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

test('seed adiciona atendimentos aos menus do professor e da administração', async () => {
  const state = createContext();
  await up({ context: state.context });
  const rows = state.calls.find(
    ([operation, table]) => operation === 'bulkInsert' && table === 'menu_items',
  )[2];

  assert.deepEqual(
    rows.map(({ code, parent_id, permission_id, route_name }) => ({
      code,
      parent_id,
      permission_id,
      route_name,
    })),
    [
      {
        code: 'agenda.attendances',
        parent_id: 10,
        permission_id: 30,
        route_name: 'professor-attendances',
      },
      {
        code: 'administration.attendances',
        parent_id: 20,
        permission_id: 40,
        route_name: 'administration-attendances',
      },
    ],
  );
});

test('rollback remove somente os itens de navegação de atendimentos', async () => {
  const state = createContext();
  await down({ context: state.context });
  assert.equal(state.calls[0][0], 'bulkDelete');
  assert.equal(state.calls[0][1], 'menu_items');
});
