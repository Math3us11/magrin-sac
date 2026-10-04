import assert from 'node:assert/strict';
import test from 'node:test';
import {
  down,
  up,
} from '../dist/database/migrations/20260929230000-create-courses.migration.js';
import { sequelizeModels } from '../dist/models/index.js';

test('migration cria o catálogo de cursos com nível e auditoria', async () => {
  const tables = new Map();
  const indexes = [];
  const context = {
    addIndex: async (table, fields, options) => indexes.push({ fields, options, table }),
    createTable: async (name, columns) => tables.set(name, columns),
  };

  await up({ context });

  const courses = tables.get('courses');

  assert.ok(courses);
  assert.equal(courses.code.allowNull, false);
  assert.equal(courses.name.allowNull, false);
  assert.equal(courses.education_level.allowNull, false);
  assert.equal(courses.is_active.defaultValue, true);
  assert.deepEqual(courses.created_by.references, { key: 'id', model: 'users' });
  assert.equal(
    indexes.find((index) => index.options.name === 'uq_courses_code').options.unique,
    true,
  );
  assert.equal(
    indexes.find((index) => index.options.name === 'uq_courses_name_level').options.unique,
    true,
  );
});

test('migration reverte o catálogo de cursos', async () => {
  const droppedTables = [];

  await down({
    context: {
      dropTable: async (name) => droppedTables.push(name),
    },
  });

  assert.deepEqual(droppedTables, ['courses']);
});

test('model Course está registrado explicitamente', () => {
  assert.ok(sequelizeModels.map((model) => model.name).includes('Course'));
});
