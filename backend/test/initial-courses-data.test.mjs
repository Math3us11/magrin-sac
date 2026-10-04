import assert from 'node:assert/strict';
import test from 'node:test';
import { Op } from 'sequelize';
import {
  down,
  up,
} from '../dist/database/migrations/20260929240000-seed-initial-courses.migration.js';

test('seed cadastra cursos de graduação e pós-graduação sem códigos duplicados', async () => {
  const inserted = [];
  const transaction = { id: 'transaction' };

  await up({
    context: {
      bulkInsert: async (table, rows, options) => inserted.push({ options, rows, table }),
      sequelize: {
        transaction: async (callback) => callback(transaction),
      },
    },
  });

  const rows = inserted[0].rows;
  const codes = rows.map(({ code }) => code);

  assert.equal(inserted[0].table, 'courses');
  assert.equal(rows.length, 32);
  assert.equal(new Set(codes).size, rows.length);
  assert.equal(rows.filter(({ education_level }) => education_level === 'graduacao').length, 30);
  assert.equal(
    rows.filter(({ education_level }) => education_level === 'pos_graduacao').length,
    2,
  );
  assert.ok(rows.some(({ name }) => name === 'Ciência da Computação'));
  assert.ok(rows.some(({ name }) => name === 'Odontologia'));
  assert.ok(rows.some(({ code }) => code === 'urgencia-emergencia-uti'));
  assert.equal(inserted[0].options.transaction, transaction);
});

test('seed remove somente os cursos do catálogo inicial', async () => {
  const deleted = [];
  const transaction = { id: 'transaction' };

  await down({
    context: {
      bulkDelete: async (table, where, options) => deleted.push({ options, table, where }),
      sequelize: {
        transaction: async (callback) => callback(transaction),
      },
    },
  });

  assert.equal(deleted[0].table, 'courses');
  assert.equal(deleted[0].where.code[Op.in].length, 32);
  assert.equal(deleted[0].options.transaction, transaction);
});
