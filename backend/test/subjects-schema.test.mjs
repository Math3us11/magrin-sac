import assert from 'node:assert/strict';
import test from 'node:test';
import { down, up } from '../dist/database/migrations/20261001010000-create-subjects.migration.js';
import { sequelizeModels } from '../dist/models/index.js';

test('migration cria o catálogo independente de matérias com auditoria', async () => {
  const tables = new Map();
  const indexes = [];
  const context = {
    addIndex: async (table, fields, options) => indexes.push({ fields, options, table }),
    createTable: async (name, columns) => tables.set(name, columns),
  };

  await up({ context });

  const subjects = tables.get('subjects');

  assert.ok(subjects);
  assert.equal(subjects.code.allowNull, false);
  assert.equal(subjects.name.allowNull, false);
  assert.equal(subjects.is_active.defaultValue, true);
  assert.equal(subjects.course_id, undefined);
  assert.deepEqual(subjects.created_by.references, { key: 'id', model: 'users' });
  assert.equal(
    indexes.find((index) => index.options.name === 'uq_subjects_code').options.unique,
    true,
  );
  assert.equal(
    indexes.find((index) => index.options.name === 'uq_subjects_name').options.unique,
    true,
  );
});

test('migration reverte o catálogo de matérias', async () => {
  const droppedTables = [];

  await down({
    context: {
      dropTable: async (name) => droppedTables.push(name),
    },
  });

  assert.deepEqual(droppedTables, ['subjects']);
});

test('model Subject está registrado explicitamente', () => {
  assert.ok(sequelizeModels.map((model) => model.name).includes('Subject'));
});
