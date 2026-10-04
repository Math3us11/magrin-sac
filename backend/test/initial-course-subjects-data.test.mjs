import assert from 'node:assert/strict';
import test from 'node:test';
import { Op } from 'sequelize';
import {
  subjectGroupCourseCodes,
  subjectGroups,
  toSubjectCode,
} from '../dist/database/migrations/20261001020000-seed-initial-subjects.migration.js';
import {
  down,
  up,
} from '../dist/database/migrations/20261001050000-seed-initial-course-subjects.migration.js';

const courseRows = subjectGroupCourseCodes.map((code, index) => ({ code, id: index + 1 }));
const subjectRows = [...new Set(subjectGroups.flat().map((name) => toSubjectCode(name)))].map(
  (code, index) => ({ code, id: index + 100 }),
);

function createContext({ deleted = [], inserted = [] } = {}) {
  const transaction = { id: 'transaction' };

  return {
    context: {
      bulkDelete: async (table, where, options) => deleted.push({ options, table, where }),
      bulkInsert: async (table, rows, options) => inserted.push({ options, rows, table }),
      sequelize: {
        query: async (sql) => (sql.includes('FROM courses') ? courseRows : subjectRows),
        transaction: async (callback) => callback(transaction),
      },
    },
    transaction,
  };
}

test('seed relaciona os dez cursos somente às matérias de seus levantamentos', async () => {
  const inserted = [];
  const { context, transaction } = createContext({ inserted });

  await up({ context });

  const rows = inserted[0].rows;
  const pairs = rows.map(({ course_id: courseId, subject_id: subjectId }) => {
    return `${courseId}:${subjectId}`;
  });

  assert.equal(inserted[0].table, 'course_subjects');
  assert.equal(rows.length, 627);
  assert.equal(new Set(pairs).size, rows.length);
  assert.equal(new Set(rows.map(({ course_id: courseId }) => courseId)).size, 10);
  assert.equal(rows.filter(({ course_id: courseId }) => courseId === 1).length, 63);
  assert.equal(rows.filter(({ course_id: courseId }) => courseId === 4).length, 53);
  assert.equal(rows.filter(({ course_id: courseId }) => courseId === 5).length, 17);
  assert.equal(rows.filter(({ course_id: courseId }) => courseId === 9).length, 103);
  assert.ok(rows.every(({ is_active: isActive }) => isActive));
  assert.equal(inserted[0].options.transaction, transaction);
});

test('seed falha quando um catálogo necessário está incompleto', async () => {
  const { context } = createContext();
  context.sequelize.query = async (sql) => {
    if (sql.includes('FROM courses')) return courseRows.slice(1);
    return subjectRows;
  };

  await assert.rejects(() => up({ context }), /Catálogos incompletos/);
});

test('seed remove somente os pares curso-matéria do levantamento inicial', async () => {
  const deleted = [];
  const { context, transaction } = createContext({ deleted });

  await down({ context });

  assert.equal(deleted.length, 10);
  assert.ok(deleted.every(({ table }) => table === 'course_subjects'));
  assert.deepEqual(deleted[0].where.course_id, 1);
  assert.equal(deleted[0].where.subject_id[Op.in].length, 63);
  assert.equal(deleted[9].where.subject_id[Op.in].length, 67);
  assert.ok(deleted.every(({ options }) => options.transaction === transaction));
});
