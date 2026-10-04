import assert from 'node:assert/strict';
import test from 'node:test';
import {
  down,
  up,
} from '../dist/database/migrations/20261003200000-create-availabilities.migration.js';
import { sequelizeModels } from '../dist/models/index.js';

function createContext() {
  const constraints = [];
  const deleted = [];
  const dropped = [];
  const indexes = [];
  const inserted = [];
  const tables = new Map();

  return {
    constraints,
    context: {
      addConstraint: async (table, options) => constraints.push({ options, table }),
      addIndex: async (table, fields, options) => indexes.push({ fields, options, table }),
      bulkDelete: async (table, where) => deleted.push({ table, where }),
      bulkInsert: async (table, rows) => inserted.push({ rows, table }),
      createTable: async (name, columns) => tables.set(name, columns),
      dropTable: async (name) => dropped.push(name),
      sequelize: {
        query: async () => [{ id: 30 }],
        transaction: async (callback) => callback({ id: 'transaction' }),
      },
    },
    deleted,
    dropped,
    indexes,
    inserted,
    tables,
  };
}

test('migration cria disponibilidade e modalidades normalizadas', async () => {
  const { constraints, context, indexes, inserted, tables } = createContext();

  await up({ context });

  const availabilities = tables.get('availabilities');
  const modalities = tables.get('availability_modalities');
  assert.ok(availabilities);
  assert.ok(modalities);
  assert.deepEqual(availabilities.professor_id.references, { key: 'id', model: 'users' });
  assert.deepEqual(modalities.availability_id.references, {
    key: 'id',
    model: 'availabilities',
  });
  assert.deepEqual(modalities.modality_option_item_id.references, {
    key: 'id',
    model: 'system_option_items',
  });
  assert.equal(constraints[0].options.name, 'ck_availabilities_valid_interval');
  assert.equal(
    indexes.find(
      ({ options }) => options.name === 'uq_availability_modalities_availability_item',
    ).options.unique,
    true,
  );

  const option = inserted.find(({ table }) => table === 'system_options');
  const items = inserted.find(({ table }) => table === 'system_option_items');
  assert.equal(option.rows[0].name, 'APPOINTMENT_MODALITY');
  assert.deepEqual(
    items.rows.map(({ name, value }) => ({ name, value })),
    [
      { name: 'Presencial', value: 'presencial' },
      { name: 'Online', value: 'online' },
    ],
  );
});

test('migration remove relações e disponibilidades antes do catálogo', async () => {
  const { context, deleted, dropped } = createContext();

  await down({ context });

  assert.deepEqual(dropped, ['availability_modalities', 'availabilities']);
  assert.deepEqual(
    deleted.map(({ table }) => table),
    ['system_option_items', 'system_options'],
  );
});

test('models de disponibilidade são registrados explicitamente', () => {
  const modelNames = sequelizeModels.map((model) => model.name);

  assert.ok(modelNames.includes('Availability'));
  assert.ok(modelNames.includes('AvailabilityModality'));
});
