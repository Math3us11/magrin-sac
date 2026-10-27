import assert from 'node:assert/strict';
import test from 'node:test';
import {
  down as downTable,
  up as upTable,
} from '../dist/database/migrations/20261027100000-create-audit-logs.migration.js';
import {
  down as downSeed,
  up as upSeed,
} from '../dist/database/migrations/20261027110000-seed-audit-navigation.migration.js';
import { AuditLog } from '../dist/models/audit-log.model.js';
import { sequelizeModels } from '../dist/models/index.js';

function createTableContext() {
  const calls = [];
  return {
    calls,
    context: {
      addIndex: async (...args) => calls.push(['addIndex', ...args]),
      createTable: async (...args) => calls.push(['createTable', ...args]),
      dropTable: async (...args) => calls.push(['dropTable', ...args]),
    },
  };
}

function createSeedContext() {
  const calls = [];
  const ids = new Map([
    ['administration', 20],
    ['audit.read', 50],
  ]);
  return {
    calls,
    context: {
      bulkDelete: async (...args) => calls.push(['bulkDelete', ...args]),
      bulkInsert: async (...args) => calls.push(['bulkInsert', ...args]),
      sequelize: {
        query: async (_sql, options) => {
          const id = ids.get(options.replacements.code);
          return id === undefined ? [] : [{ code: options.replacements.code, id }];
        },
        transaction: async (callback) => callback({ id: 'transaction' }),
      },
    },
  };
}

test('migration cria trilha somente de inserção, ligada ao ator e indexada por período', async () => {
  const state = createTableContext();
  await upTable({ context: state.context });

  const [, table, columns] = state.calls.find(([operation]) => operation === 'createTable');
  assert.equal(table, 'audit_logs');
  assert.equal(columns.actor_id.references.model, 'users');
  assert.equal(columns.actor_id.onDelete, 'RESTRICT');
  assert.equal(Object.hasOwn(columns, 'updated_at'), false);
  assert.equal(Object.hasOwn(columns, 'deleted_at'), false);
  assert.ok(
    state.calls.some(
      ([operation, , fields]) => operation === 'addIndex' && fields[0] === 'occurred_at',
    ),
  );
  assert.ok(sequelizeModels.includes(AuditLog));

  const rollback = createTableContext();
  await downTable({ context: rollback.context });
  assert.deepEqual(rollback.calls, [['dropTable', 'audit_logs']]);
});

test('seed concede auditoria somente ao administrador e cria o menu administrativo', async () => {
  const state = createSeedContext();
  await upSeed({ context: state.context });

  const inserts = Object.fromEntries(
    state.calls
      .filter(([operation]) => operation === 'bulkInsert')
      .map(([, table, rows]) => [table, rows]),
  );
  assert.equal(inserts.permissions[0].code, 'audit.read');
  assert.deepEqual(
    inserts.user_type_permissions.map(({ permission_id, user_type }) => [permission_id, user_type]),
    [[50, 'administrador']],
  );
  assert.equal(inserts.menu_items[0].code, 'administration.audit');
  assert.equal(inserts.menu_items[0].parent_id, 20);
  assert.equal(inserts.menu_items[0].permission_id, 50);
  assert.equal(inserts.menu_items[0].route_name, 'administration-audit');

  const rollback = createSeedContext();
  await downSeed({ context: rollback.context });
  assert.deepEqual(
    rollback.calls.map(([, table]) => table),
    ['menu_items', 'user_type_permissions', 'permissions'],
  );
});
