import assert from 'node:assert/strict';
import test from 'node:test';
import {
  down,
  up,
} from '../dist/database/migrations/20260929220000-seed-administration-navigation.migration.js';

function createMigrationContext() {
  const inserted = [];
  const deleted = [];

  return {
    context: {
      bulkDelete: async (table, where) => deleted.push({ table, where }),
      bulkInsert: async (table, rows) => inserted.push({ rows, table }),
      sequelize: {
        query: async (sql) =>
          sql.includes('permissions')
            ? [{ code: 'users.manage', id: 4 }]
            : [{ code: 'administration', id: 13 }],
        transaction: async (callback) => callback({ id: 'transaction' }),
      },
    },
    deleted,
    inserted,
  };
}

test('seed libera o gerenciamento de usuários somente para administrador', async () => {
  const { context, inserted } = createMigrationContext();

  await up({ context });

  const permissionInsert = inserted.find(({ table }) => table === 'permissions');
  const assignmentInsert = inserted.find(
    ({ table }) => table === 'user_type_permissions',
  );
  const menuInserts = inserted.filter(({ table }) => table === 'menu_items');
  const rootMenu = menuInserts[0].rows[0];
  const childMenu = menuInserts[1].rows[0];

  assert.equal(permissionInsert.rows[0].code, 'users.manage');
  assert.deepEqual(
    assignmentInsert.rows.map(({ permission_id, user_type }) => ({
      permission_id,
      user_type,
    })),
    [{ permission_id: 4, user_type: 'administrador' }],
  );
  assert.equal(rootMenu.code, 'administration');
  assert.equal(rootMenu.permission_id, null);
  assert.equal(childMenu.code, 'administration.users');
  assert.equal(childMenu.parent_id, 13);
  assert.equal(childMenu.permission_id, 4);
  assert.equal(childMenu.route_name, 'administration-users');
});

test('seed remove o menu administrativo antes da permissão', async () => {
  const { context, deleted } = createMigrationContext();

  await down({ context });

  assert.deepEqual(
    deleted.map(({ table }) => table),
    ['menu_items', 'menu_items', 'user_type_permissions', 'permissions'],
  );
});
