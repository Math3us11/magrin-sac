import assert from 'node:assert/strict';
import test from 'node:test';
import {
  down,
  up,
} from '../dist/database/migrations/20261015100000-create-attendances.migration.js';
import { AttendanceStatusHistory } from '../dist/models/attendance-status-history.model.js';
import { Attendance } from '../dist/models/attendance.model.js';
import { sequelizeModels } from '../dist/models/index.js';

function createContext() {
  const calls = [];
  return {
    calls,
    context: {
      addIndex: async (...args) => calls.push(['addIndex', ...args]),
      createTable: async (...args) => calls.push(['createTable', ...args]),
      dropTable: async (...args) => calls.push(['dropTable', ...args]),
    },
  };
}

test('migration cria atendimento único por agendamento e histórico imutável', async () => {
  const state = createContext();
  await up({ context: state.context });

  const attendance = state.calls.find(
    ([operation, table]) => operation === 'createTable' && table === 'attendances',
  );
  const history = state.calls.find(
    ([operation, table]) => operation === 'createTable' && table === 'attendance_status_history',
  );
  assert.equal(attendance[2].appointment_id.references.model, 'appointments');
  assert.equal(attendance[2].created_by.references.model, 'users');
  assert.equal(history[2].attendance_id.references.model, 'attendances');
  assert.equal(Object.hasOwn(attendance[2], 'deleted_at'), false);
  assert.ok(
    state.calls.some(
      ([operation, table, fields, options]) =>
        operation === 'addIndex' &&
        table === 'attendances' &&
        fields.includes('appointment_id') &&
        options.unique,
    ),
  );
});

test('models de atendimento estão registrados e rollback respeita as dependências', async () => {
  assert.ok(sequelizeModels.includes(Attendance));
  assert.ok(sequelizeModels.includes(AttendanceStatusHistory));

  const state = createContext();
  await down({ context: state.context });
  assert.deepEqual(
    state.calls.map(([, table]) => table),
    ['attendance_status_history', 'attendances'],
  );
});
