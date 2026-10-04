import assert from 'node:assert/strict';
import test from 'node:test';
import { Op } from 'sequelize';
import {
  down,
  up,
} from '../dist/database/migrations/20261001020000-seed-initial-subjects.migration.js';

test('seed cadastra matérias verificadas sem nomes ou códigos duplicados', async () => {
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
  const names = rows.map(({ name }) => name);

  assert.equal(inserted[0].table, 'subjects');
  assert.equal(rows.length, 485);
  assert.equal(new Set(codes).size, rows.length);
  assert.equal(new Set(names).size, rows.length);
  assert.ok(rows.some(({ name }) => name === 'Algoritmos e Programação'));
  assert.ok(rows.some(({ name }) => name === 'Anatomia Humana'));
  assert.ok(rows.some(({ name }) => name === 'Teoria Geral do Direito'));
  assert.ok(rows.some(({ name }) => name === 'Clínica Médica'));
  assert.equal(inserted[0].options.transaction, transaction);
});

test('seed remove somente as matérias do catálogo inicial', async () => {
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

  assert.equal(deleted[0].table, 'subjects');
  assert.equal(deleted[0].where.code[Op.in].length, 485);
  assert.equal(deleted[0].options.transaction, transaction);
});
