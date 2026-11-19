import assert from 'node:assert/strict';
import test from 'node:test';
import { DEMO_EMAIL_DOMAIN, buildDemoPlan } from '../dist/database/database.demo-seed.js';
import {
  TEST_USERS,
  provisionTestUsers,
  readTestUsersInput,
} from '../dist/database/database.test-users.js';

function isValidCpf(cpf) {
  const digit = (digits, weight) => {
    const sum = [...digits].reduce((total, value, index) => total + Number(value) * (weight - index), 0);
    const remainder = (sum * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  };
  return Number(cpf[9]) === digit(cpf.slice(0, 9), 10) && Number(cpf[10]) === digit(cpf.slice(0, 10), 11);
}

function fakeSequelize({ conflicts = [], existingUsers = new Map(), existingLinks = [] } = {}) {
  const writes = [];
  const users = new Map(existingUsers);
  let nextId = 900;
  const sequelize = {
    getQueryInterface: () => ({
      bulkInsert: async (table, rows) => {
        writes.push(['insert', table, rows]);
        if (table === 'users') for (const row of rows) users.set(row.email, nextId++);
      },
      bulkUpdate: async (table, values, where) => writes.push(['update', table, values, where]),
    }),
    query: async (sql, { replacements } = {}) => {
      if (/WHERE email NOT IN/.test(sql)) return conflicts;
      if (/FROM course_subjects/.test(sql)) return [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }];
      if (/FROM users WHERE email = :email/.test(sql)) {
        const id = users.get(replacements.email);
        return id === undefined ? [] : [{ id }];
      }
      if (/FROM user_subjects/.test(sql)) return existingLinks.includes(replacements.userId) ? [{ id: 1 }] : [];
      if (/FROM system_option_items/.test(sql)) return [{ id: 77 }];
      throw new Error(`Unexpected query: ${sql}`);
    },
    transaction: async (callback) => callback({}),
  };
  return { sequelize, writes };
}

const hasher = { hash: async (password) => `hash:${password}` };
const PASSWORDS = {
  'admin@demo.test': 'admin-teste',
  'aluno@demo.test': 'aluno-teste',
  'professor@demo.test': 'professor-teste',
};
const ENVIRONMENT = {
  TEST_ADMIN_PASSWORD: 'admin-teste',
  TEST_PROFESSOR_PASSWORD: 'professor-teste',
  TEST_STUDENT_PASSWORD: 'aluno-teste',
};
const NOW = new Date('2026-11-19T14:00:00.000Z');

test('contas de teste: uma por perfil, fictícias e distintas da demonstração', () => {
  assert.deepEqual(
    TEST_USERS.map(({ email, userType }) => [email, userType]),
    [
      [`admin@${DEMO_EMAIL_DOMAIN}`, 'administrador'],
      [`professor@${DEMO_EMAIL_DOMAIN}`, 'professor'],
      [`aluno@${DEMO_EMAIL_DOMAIN}`, 'aluno'],
    ],
  );

  const demoUsers = buildDemoPlan('2026-11-19', '10:00').users;
  for (const user of TEST_USERS) {
    assert.equal(isValidCpf(user.cpf), false, `CPF ${user.cpf} não pode ser válido`);
    assert.match(user.phone, /^\d{2}0\d{7}$/);
    assert.equal(user.registrationNumber !== null, user.userType === 'aluno');
    assert.equal(
      demoUsers.some(
        (demo) =>
          demo.email === user.email ||
          demo.cpf === user.cpf ||
          (user.registrationNumber !== null && demo.registrationNumber === user.registrationNumber),
      ),
      false,
      `${user.email} colide com a demonstração`,
    );
  }

  const professor = TEST_USERS.find(({ userType }) => userType === 'professor');
  const student = TEST_USERS.find(({ userType }) => userType === 'aluno');
  assert.ok(student.subjectCount > 0 && student.subjectCount <= professor.subjectCount);
});

test('leitura exige a senha de cada conta e bloqueia produção', () => {
  assert.throws(() => readTestUsersInput({}), /TEST_ADMIN_PASSWORD/);
  assert.throws(
    () => readTestUsersInput({ ...ENVIRONMENT, TEST_STUDENT_PASSWORD: 'curta' }),
    /TEST_STUDENT_PASSWORD/,
  );
  assert.throws(
    () => readTestUsersInput({ ...ENVIRONMENT, APP_ENV: 'production' }),
    /production/,
  );
  assert.deepEqual(readTestUsersInput(ENVIRONMENT), { passwords: PASSWORDS });
});

test('primeira execução cria as contas com hash, sem troca de senha e com vínculos', async () => {
  const { sequelize, writes } = fakeSequelize();

  const results = await provisionTestUsers(sequelize, { passwords: PASSWORDS }, NOW, hasher);

  assert.deepEqual(
    results.map(({ action }) => action),
    ['created', 'created', 'created'],
  );
  const userRows = writes.filter(([, table]) => table === 'users').flatMap(([, , rows]) => rows);
  assert.equal(userRows.length, 3);
  for (const row of userRows) {
    assert.equal(row.password_hash, `hash:${PASSWORDS[row.email]}`);
    assert.equal(row.must_change_password, false);
    assert.equal(row.is_active, true);
  }

  const links = writes.filter(([, table]) => table === 'user_subjects').map(([, , rows]) => rows);
  assert.equal(links.length, 2, 'somente professor e aluno recebem vínculos');
  const [professorLinks, studentLinks] = links;
  assert.deepEqual(professorLinks.map((row) => row.course_subject_id), [1, 2, 3, 4]);
  assert.equal(professorLinks[0].period_option_item_id, null);
  assert.deepEqual(studentLinks.map((row) => row.course_subject_id), [1, 2, 3]);
  assert.equal(studentLinks[0].period_option_item_id, 77);
});

test('nova execução atualiza as contas e preserva vínculos existentes', async () => {
  const existingUsers = new Map(TEST_USERS.map(({ email }, index) => [email, 10 + index]));
  const { sequelize, writes } = fakeSequelize({ existingLinks: [11, 12], existingUsers });

  const results = await provisionTestUsers(sequelize, { passwords: PASSWORDS }, NOW, hasher);

  assert.deepEqual(
    results.map(({ action }) => action),
    ['updated', 'updated', 'updated'],
  );
  assert.equal(writes.filter(([kind]) => kind === 'insert').length, 0);
  assert.equal(writes.filter(([kind]) => kind === 'update').length, 3);
});

test('aborta sem alterar nada quando CPF ou matrícula pertencem a outra conta', async () => {
  const { sequelize, writes } = fakeSequelize({ conflicts: [{ email: 'outra@exemplo.com' }] });

  await assert.rejects(
    provisionTestUsers(sequelize, { passwords: PASSWORDS }, NOW, hasher),
    /nothing was changed/,
  );
  assert.equal(writes.length, 0);
});
