import assert from 'node:assert/strict';
import test from 'node:test';
import {
  down,
  up,
} from '../dist/database/migrations/20261028100000-add-student-registration-number.migration.js';

function createContext() {
  const calls = [];
  return {
    calls,
    context: {
      addColumn: async (...args) => calls.push(['addColumn', ...args]),
      addIndex: async (...args) => calls.push(['addIndex', ...args]),
      removeColumn: async (...args) => calls.push(['removeColumn', ...args]),
      removeIndex: async (...args) => calls.push(['removeIndex', ...args]),
      sequelize: { query: async (sql) => calls.push(['query', sql]) },
    },
  };
}

test('migration adiciona matrícula única, numérica e exclusiva de aluno', async () => {
  const state = createContext();
  await up({ context: state.context });

  const [, table, column, definition] = state.calls.find(
    ([operation]) => operation === 'addColumn',
  );
  assert.equal(table, 'users');
  assert.equal(column, 'registration_number');
  assert.equal(definition.allowNull, true);

  const index = state.calls.find(([operation]) => operation === 'addIndex');
  assert.deepEqual(index[2], ['registration_number']);
  assert.equal(index[3].unique, true);

  const [, constraints] = state.calls.find(([operation]) => operation === 'query');
  assert.match(constraints, /REGEXP '\^\[0-9\]\{1,20\}\$'/);
  assert.match(constraints, /registration_number IS NULL OR user_type = 'aluno'/);
});

test('rollback remove restrições, índice e coluna em uma única instrução', async () => {
  const state = createContext();
  await down({ context: state.context });

  assert.equal(state.calls.length, 1);
  const [operation, sql] = state.calls[0];
  assert.equal(operation, 'query');
  for (const fragment of [
    'DROP CONSTRAINT ck_users_registration_number_student',
    'DROP CONSTRAINT ck_users_registration_number_digits',
    'DROP INDEX uq_users_registration_number',
    'DROP COLUMN registration_number',
  ]) {
    assert.ok(sql.includes(fragment), fragment);
  }
});
