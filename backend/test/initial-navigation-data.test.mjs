import assert from 'node:assert/strict';
import test from 'node:test';
import {
  down,
  up,
} from '../dist/database/migrations/20260929210000-seed-initial-navigation.migration.js';

function createMigrationContext() {
  const inserted = [];
  const deleted = [];
  const permissionRows = [
    { code: 'reports.dashboard.view', id: 1 },
    { code: 'appointments.create', id: 2 },
    { code: 'appointments.read.own', id: 3 },
  ];
  const menuRows = [
    { code: 'home', id: 10 },
    { code: 'reports', id: 11 },
    { code: 'appointments', id: 12 },
  ];

  return {
    context: {
      bulkDelete: async (table, where) => deleted.push({ table, where }),
      bulkInsert: async (table, rows) => inserted.push({ rows, table }),
      sequelize: {
        query: async (sql) => (sql.includes('permissions') ? permissionRows : menuRows),
        transaction: async (callback) => callback({ id: 'transaction' }),
      },
    },
    deleted,
    inserted,
  };
}

test('seed cadastra menus globais, de professor e de aluno', async () => {
  const { context, inserted } = createMigrationContext();

  await up({ context });

  const permissionInsert = inserted.find(({ table }) => table === 'permissions');
  const assignmentInsert = inserted.find(
    ({ table }) => table === 'user_type_permissions',
  );
  const menuInserts = inserted.filter(({ table }) => table === 'menu_items');
  const rootMenus = menuInserts[0].rows;
  const childMenus = menuInserts[1].rows;

  assert.deepEqual(
    permissionInsert.rows.map(({ code }) => code),
    ['reports.dashboard.view', 'appointments.create', 'appointments.read.own'],
  );
  assert.equal(assignmentInsert.rows.length, 6);
  assert.ok(
    assignmentInsert.rows.some(
      ({ permission_id, user_type }) =>
        permission_id === 1 && user_type === 'administrador',
    ),
  );
  assert.deepEqual(
    rootMenus.map(({ code }) => code),
    ['home', 'reports', 'appointments'],
  );
  assert.equal(rootMenus.find(({ code }) => code === 'home').route_name, 'home');
  assert.equal(rootMenus.find(({ code }) => code === 'reports').permission_id, null);
  assert.equal(
    childMenus.find(({ code }) => code === 'reports.dashboard').parent_id,
    11,
  );
  assert.equal(
    childMenus.find(({ code }) => code === 'appointments.new').permission_id,
    2,
  );
});

test('seed remove menus antes das associações e permissões', async () => {
  const { context, deleted } = createMigrationContext();

  await down({ context });

  assert.deepEqual(
    deleted.map(({ table }) => table),
    ['menu_items', 'menu_items', 'user_type_permissions', 'permissions'],
  );
});
