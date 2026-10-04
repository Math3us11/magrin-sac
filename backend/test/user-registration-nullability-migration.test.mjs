import assert from 'node:assert/strict';
import test from 'node:test';

import {
  down,
  up,
} from '../dist/database/migrations/20261002210000-correct-professor-subject-period-nullability.migration.js';

function createContext() {
  const queries = [];
  return {
    context: {
      sequelize: {
        query: async (sql) => queries.push(sql.replace(/\s+/g, ' ').trim()),
      },
    },
    queries,
  };
}

test('migration corretiva permite período nulo para vínculos de professor', async () => {
  const state = createContext();
  await up({ context: state.context });

  assert.equal(state.queries.length, 1);
  assert.match(state.queries[0], /period_option_item_id BIGINT UNSIGNED NULL/);
});

test('migration corretiva restaura período obrigatório no rollback', async () => {
  const state = createContext();
  await down({ context: state.context });

  assert.equal(state.queries.length, 1);
  assert.match(state.queries[0], /period_option_item_id BIGINT UNSIGNED NOT NULL/);
});
