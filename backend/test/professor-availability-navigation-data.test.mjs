import assert from 'node:assert/strict';
import test from 'node:test';
import {
  down,
  up,
} from '../dist/database/migrations/20261003190000-seed-professor-availability-navigation.migration.js';

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
            ? [{ code: 'availability.manage.own', id: 5 }]
            : [{ code: 'agenda', id: 14 }],
        transaction: async (callback) => callback({ id: 'transaction' }),
      },
    },
    deleted,
    inserted,
  };
}

test('seed libera a agenda própria somente para professor', async () => {
  const { context, inserted } = createMigrationContext();

  await up({ context });

  const permissionInsert = inserted.find(({ table }) => table === 'permissions');
  const assignmentInsert = inserted.find(({ table }) => table === 'user_type_permissions');
  const menuInserts = inserted.filter(({ table }) => table === 'menu_items');
  const rootMenu = menuInserts[0].rows[0];
  const childMenu = menuInserts[1].rows[0];

  assert.equal(permissionInsert.rows[0].code, 'availability.manage.own');
  assert.deepEqual(
    assignmentInsert.rows.map(({ permission_id, user_type }) => ({
      permission_id,
      user_type,
    })),
    [{ permission_id: 5, user_type: 'professor' }],
  );
  assert.equal(rootMenu.code, 'agenda');
  assert.equal(rootMenu.permission_id, null);
  assert.equal(childMenu.code, 'agenda.availability');
  assert.equal(childMenu.parent_id, 14);
  assert.equal(childMenu.permission_id, 5);
  assert.equal(childMenu.route_name, 'professor-availability');
});

test('seed remove a agenda do professor antes da permissão', async () => {
  const { context, deleted } = createMigrationContext();

  await down({ context });

  assert.deepEqual(
    deleted.map(({ table }) => table),
    ['menu_items', 'menu_items', 'user_type_permissions', 'permissions'],
  );
});
