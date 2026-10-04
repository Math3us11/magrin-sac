import assert from 'node:assert/strict';
import test from 'node:test';
import {
  down,
  up,
} from '../dist/database/migrations/20261001040000-create-academic-links.migration.js';
import { sequelizeModels } from '../dist/models/index.js';

test('migration separa catálogo do curso e vínculo contextual do usuário', async () => {
  const tables = new Map();
  const indexes = [];
  const context = {
    addIndex: async (table, fields, options) => indexes.push({ fields, options, table }),
    createTable: async (name, columns) => tables.set(name, columns),
  };

  await up({ context });

  const courseSubjects = tables.get('course_subjects');
  const userSubjects = tables.get('user_subjects');

  assert.ok(courseSubjects);
  assert.ok(userSubjects);
  assert.deepEqual(courseSubjects.course_id.references, { key: 'id', model: 'courses' });
  assert.deepEqual(courseSubjects.subject_id.references, { key: 'id', model: 'subjects' });
  assert.equal(courseSubjects.period_option_item_id, undefined);
  assert.deepEqual(userSubjects.user_id.references, { key: 'id', model: 'users' });
  assert.deepEqual(userSubjects.course_subject_id.references, {
    key: 'id',
    model: 'course_subjects',
  });
  assert.deepEqual(userSubjects.period_option_item_id.references, {
    key: 'id',
    model: 'system_option_items',
  });
  assert.deepEqual(userSubjects.created_by.references, { key: 'id', model: 'users' });
  assert.equal(
    indexes.find((index) => index.options.name === 'uq_course_subjects_course_subject').options
      .unique,
    true,
  );
  assert.equal(
    indexes.find((index) => index.options.name === 'uq_user_subjects_user_course_subject_period')
      .options.unique,
    true,
  );
});

test('migration reverte vínculos de usuário antes do catálogo curso-matéria', async () => {
  const droppedTables = [];

  await down({
    context: {
      dropTable: async (name) => droppedTables.push(name),
    },
  });

  assert.deepEqual(droppedTables, ['user_subjects', 'course_subjects']);
});

test('models acadêmicos estão registrados explicitamente', () => {
  const modelNames = sequelizeModels.map((model) => model.name);

  assert.ok(modelNames.includes('CourseSubject'));
  assert.ok(modelNames.includes('UserSubject'));
});
