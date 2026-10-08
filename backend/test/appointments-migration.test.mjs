import assert from 'node:assert/strict';
import test from 'node:test';
import {
  down,
  up,
} from '../dist/database/migrations/20261006100000-create-appointments.migration.js';
import { Appointment } from '../dist/models/appointment.model.js';
import { sequelizeModels } from '../dist/models/index.js';

function createContext() {
  const calls = [];
  return {
    calls,
    context: {
      addConstraint: async (...args) => calls.push(['addConstraint', ...args]),
      addIndex: async (...args) => calls.push(['addIndex', ...args]),
      createTable: async (...args) => calls.push(['createTable', ...args]),
      dropTable: async (...args) => calls.push(['dropTable', ...args]),
      sequelize: {
        query: async (...args) => calls.push(['query', ...args]),
      },
    },
  };
}

test('migration cria agendamentos históricos e protege a modalidade da disponibilidade', async () => {
  const state = createContext();
  await up({ context: state.context });

  const createCall = state.calls.find(([operation]) => operation === 'createTable');
  assert.equal(createCall[1], 'appointments');
  assert.equal(createCall[2].protocol.allowNull, false);
  assert.equal(createCall[2].availability_id.references.model, 'availabilities');
  assert.equal(createCall[2].student_id.references.model, 'users');
  assert.equal(Object.hasOwn(createCall[2], 'deleted_at'), false);

  const compositeConstraint = state.calls.find(([operation]) => operation === 'query');
  assert.match(compositeConstraint[1], /FOREIGN KEY \(availability_id, modality_option_item_id\)/);
  assert.match(compositeConstraint[1], /REFERENCES availability_modalities/);
  assert.ok(
    state.calls.some(
      ([operation, table, fields, options]) =>
        operation === 'addIndex' &&
        table === 'appointments' &&
        fields.includes('student_id') &&
        options.name === 'ix_appointments_student_status_interval',
    ),
  );
});

test('model Appointment está registrado e rollback remove a tabela', async () => {
  assert.ok(sequelizeModels.includes(Appointment));

  const state = createContext();
  await down({ context: state.context });
  assert.deepEqual(state.calls[0], ['dropTable', 'appointments']);
});
