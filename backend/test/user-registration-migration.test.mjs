import assert from 'node:assert/strict';
import test from 'node:test';
import { down, up } from '../dist/database/migrations/20261002200000-extend-user-registration.migration.js';

function createContext() {
  const calls = [];
  return {
    calls,
    context: {
      addColumn: async (...args) => calls.push(['addColumn', ...args]),
      changeColumn: async (...args) => calls.push(['changeColumn', ...args]),
      removeColumn: async (...args) => calls.push(['removeColumn', ...args]),
    },
  };
}

test('migration adiciona telefone, troca obrigatória e período opcional para professor', async () => {
  const state = createContext();
  await up({ context: state.context });

  assert.deepEqual(
    state.calls.slice(0, 2).map((call) => call.slice(0, 3)),
    [
      ['addColumn', 'users', 'phone'],
      ['addColumn', 'users', 'must_change_password'],
    ],
  );
  assert.equal(state.calls[2][0], 'changeColumn');
  assert.equal(state.calls[2][3].allowNull, true);
});

test('migration reverte as colunas na ordem segura', async () => {
  const state = createContext();
  await down({ context: state.context });

  assert.equal(state.calls[0][0], 'changeColumn');
  assert.equal(state.calls[0][3].allowNull, false);
  assert.deepEqual(
    state.calls.slice(1).map((call) => call.slice(0, 3)),
    [
      ['removeColumn', 'users', 'must_change_password'],
      ['removeColumn', 'users', 'phone'],
    ],
  );
});
