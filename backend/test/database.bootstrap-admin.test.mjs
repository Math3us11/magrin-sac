import assert from 'node:assert/strict';
import test from 'node:test';
import {
  provisionAdministrator,
  readBootstrapAdministratorInput,
  validateBootstrapAdministratorInput,
} from '../dist/database/database.bootstrap-admin.js';

const validInput = {
  birthDate: '2004-07-17',
  cpf: '00000000000',
  email: 'testeemail@gmail.com',
  name: 'Administrador',
  password: 'math1234',
};

test('entrada do bootstrap normaliza e valida os dados administrativos', () => {
  assert.deepEqual(
    validateBootstrapAdministratorInput({
      ...validInput,
      cpf: '000.000.000-00',
      email: ' TESTEEMAIL@GMAIL.COM ',
      name: ' Administrador ',
    }),
    validInput,
  );
});

test('bootstrap rejeita CPF com quantidade incorreta de dígitos', () => {
  assert.throws(
    () => validateBootstrapAdministratorInput({ ...validInput, cpf: '000000000000' }),
    /exactly 11 digits/,
  );
});

test('leitura do bootstrap exige todas as variáveis locais', () => {
  assert.throws(() => readBootstrapAdministratorInput({}), /BOOTSTRAP_ADMIN_BIRTH_DATE/);
});

test('provisionamento cria administrador com hash e sem persistir a senha', async () => {
  const calls = [];
  const transaction = { id: 'transaction' };
  const sequelize = {
    getQueryInterface: () => ({
      bulkInsert: async (...args) => calls.push(args),
      bulkUpdate: async () => assert.fail('bulkUpdate should not be called'),
    }),
    query: async () => [],
    transaction: async (callback) => callback(transaction),
  };
  const passwordHasher = {
    hash: async (password) => {
      assert.equal(password, validInput.password);
      return '$argon2id$test-hash';
    },
  };

  const result = await provisionAdministrator(sequelize, validInput, passwordHasher);
  const insertedUser = calls[0][1][0];

  assert.deepEqual(result, { action: 'created', email: validInput.email });
  assert.equal(insertedUser.password_hash, '$argon2id$test-hash');
  assert.equal(insertedUser.password, undefined);
  assert.equal(insertedUser.user_type, 'administrador');
  assert.equal(insertedUser.birth_date, validInput.birthDate);
  assert.equal(calls[0][2].transaction, transaction);
});
