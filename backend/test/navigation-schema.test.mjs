import assert from 'node:assert/strict';
import test from 'node:test';
import {
  down,
  up,
} from '../dist/database/migrations/20260929200000-create-navigation-and-permissions.migration.js';
import { sequelizeModels } from '../dist/models/index.js';

test('migration cria navegação e permissões na ordem esperada', async () => {
  const tables = new Map();
  const indexes = [];
  const context = {
    addIndex: async (table, fields, options) => indexes.push({ fields, options, table }),
    createTable: async (name, columns) => tables.set(name, columns),
  };

  await up({ context });

  assert.deepEqual([...tables.keys()], [
    'permissions',
    'user_type_permissions',
    'menu_items',
  ]);
  assert.equal(tables.get('permissions').code.allowNull, false);
  assert.deepEqual(tables.get('user_type_permissions').permission_id.references, {
    key: 'id',
    model: 'permissions',
  });
  assert.deepEqual(tables.get('menu_items').parent_id.references, {
    key: 'id',
    model: 'menu_items',
  });
  assert.equal(tables.get('menu_items').route_name.allowNull, true);
  assert.equal(
    indexes.find((index) => index.options.name === 'uq_menu_items_code').options.unique,
    true,
  );
});

test('migration reverte tabelas respeitando as dependências', async () => {
  const droppedTables = [];

  await down({
    context: {
      dropTable: async (name) => droppedTables.push(name),
    },
  });

  assert.deepEqual(droppedTables, [
    'menu_items',
    'user_type_permissions',
    'permissions',
  ]);
});

test('models de navegação e permissões estão registrados explicitamente', () => {
  const modelNames = sequelizeModels.map((model) => model.name);

  assert.ok(modelNames.includes('Permission'));
  assert.ok(modelNames.includes('UserTypePermission'));
  assert.ok(modelNames.includes('MenuItem'));
});
