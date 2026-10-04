import assert from 'node:assert/strict';
import test from 'node:test';
import {
  down,
  up,
} from '../dist/database/migrations/20261001030000-seed-academic-periods.migration.js';

function createContext({ inserted = [], deleted = [] } = {}) {
  const transaction = { id: 'transaction' };

  return {
    context: {
      bulkDelete: async (table, where, options) => deleted.push({ options, table, where }),
      bulkInsert: async (table, rows, options) => inserted.push({ options, rows, table }),
      sequelize: {
        query: async () => [{ id: 42 }],
        transaction: async (callback) => callback(transaction),
      },
    },
    transaction,
  };
}

test('seed cadastra a opção de períodos acadêmicos do primeiro ao décimo segundo', async () => {
  const inserted = [];
  const { context, transaction } = createContext({ inserted });

  await up({ context });

  assert.equal(inserted[0].table, 'system_options');
  assert.equal(inserted[0].rows[0].name, 'ACADEMIC_PERIOD');
  assert.equal(inserted[1].table, 'system_option_items');
  assert.equal(inserted[1].rows.length, 12);
  assert.equal(inserted[1].rows[0].name, '1º período');
  assert.equal(inserted[1].rows[11].name, '12º período');
  assert.equal(new Set(inserted[1].rows.map(({ value }) => value)).size, 12);
  assert.ok(inserted[1].rows.every(({ option_id }) => option_id === 42));
  assert.equal(inserted[1].options.transaction, transaction);
});

test('seed remove os períodos antes da opção acadêmica', async () => {
  const deleted = [];
  const { context, transaction } = createContext({ deleted });

  await down({ context });

  assert.deepEqual(
    deleted.map(({ table }) => table),
    ['system_option_items', 'system_options'],
  );
  assert.deepEqual(deleted[0].where, { option_id: 42 });
  assert.deepEqual(deleted[1].where, { id: 42 });
  assert.equal(deleted[1].options.transaction, transaction);
});
