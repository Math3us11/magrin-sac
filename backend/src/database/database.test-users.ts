import { QueryTypes, type Sequelize, type Transaction } from 'sequelize';
import { PasswordHashService } from '../helpers/password/password.service.js';
import { DEMO_EMAIL_DOMAIN, fictitiousCpf } from './database.demo-seed.js';

const TEST_COURSE_CODE = 'ciencia-computacao';
const ACADEMIC_PERIOD_OPTION = 'ACADEMIC_PERIOD';

export type TestUser = {
  birthDate: string;
  cpf: string;
  email: string;
  name: string;
  periodValue: string | null;
  // Variável de ambiente com a senha da conta.
  passwordVariable: string;
  phone: string;
  registrationNumber: string | null;
  // Quantidade de disciplinas do curso de teste vinculadas à conta.
  subjectCount: number;
  userType: 'administrador' | 'aluno' | 'professor';
};

// Senha de cada conta, indexada pelo e-mail.
export type TestUsersInput = { passwords: Record<string, string> };

export type TestUserResult = { action: 'created' | 'updated'; email: string };

type PasswordHasher = Pick<PasswordHashService, 'hash'>;
type IdRow = { id: number | string };

function testUser(
  index: number,
  localPart: string,
  name: string,
  userType: TestUser['userType'],
  birthDate: string,
  settings: Pick<TestUser, 'passwordVariable' | 'periodValue' | 'subjectCount'>,
): TestUser {
  return {
    birthDate,
    // Índices a partir de 101 não colidem com as contas da demonstração (1 a 6).
    cpf: fictitiousCpf(index),
    email: `${localPart}@${DEMO_EMAIL_DOMAIN}`,
    name,
    passwordVariable: settings.passwordVariable,
    periodValue: settings.periodValue,
    phone: `6900000${String(index).padStart(3, '0')}`,
    registrationNumber: userType === 'aluno' ? `99000000${String(index).padStart(4, '0')}` : null,
    subjectCount: settings.subjectCount,
    userType,
  };
}

/**
 * Contas básicas de teste, uma por perfil. O aluno cursa disciplinas que o professor
 * também leciona, para que o fluxo de agendamento funcione sem configuração manual.
 */
export const TEST_USERS: readonly TestUser[] = [
  testUser(101, 'admin', 'Administrador Teste', 'administrador', '1985-01-15', {
    passwordVariable: 'TEST_ADMIN_PASSWORD',
    periodValue: null,
    subjectCount: 0,
  }),
  testUser(102, 'professor', 'Professor Teste', 'professor', '1980-06-20', {
    passwordVariable: 'TEST_PROFESSOR_PASSWORD',
    periodValue: null,
    subjectCount: 4,
  }),
  testUser(103, 'aluno', 'Aluno Teste', 'aluno', '2003-03-10', {
    passwordVariable: 'TEST_STUDENT_PASSWORD',
    periodValue: '5',
    subjectCount: 3,
  }),
];

export function readTestUsersInput(environment: NodeJS.ProcessEnv = process.env): TestUsersInput {
  const appEnvironment = environment.APP_ENV ?? environment.NODE_ENV ?? 'development';
  if (appEnvironment === 'production') {
    throw new Error('Test users cannot be provisioned when APP_ENV is production.');
  }

  const passwords: Record<string, string> = {};
  for (const { email, passwordVariable } of TEST_USERS) {
    const password = environment[passwordVariable] ?? '';
    if (password.length < 8 || password.length > 128) {
      throw new Error(`${passwordVariable} must contain between 8 and 128 characters.`);
    }
    passwords[email] = password;
  }

  return { passwords };
}

async function selectIds(
  sequelize: Sequelize,
  sql: string,
  replacements: Record<string, unknown>,
  transaction: Transaction,
): Promise<number[]> {
  const rows = await sequelize.query<IdRow>(sql, {
    replacements,
    transaction,
    type: QueryTypes.SELECT,
  });
  return rows.map(({ id }) => Number(id));
}

/**
 * Cria ou atualiza as contas de teste. A execução é idempotente: redefine senha,
 * perfil e estado ativo das contas, cria vínculos acadêmicos somente para quem ainda
 * não possui nenhum e nunca apaga registros.
 */
export async function provisionTestUsers(
  sequelize: Sequelize,
  input: TestUsersInput,
  now: Date = new Date(),
  passwordHasher: PasswordHasher = new PasswordHashService(),
): Promise<TestUserResult[]> {
  const passwordHashes = new Map<string, string>();
  for (const { email } of TEST_USERS) {
    const password = input.passwords[email];
    if (password === undefined) throw new Error(`Missing password for test user: ${email}`);
    passwordHashes.set(email, await passwordHasher.hash(password));
  }
  const queryInterface = sequelize.getQueryInterface();

  return sequelize.transaction(async (transaction) => {
    const conflicts = await sequelize.query<{ email: string }>(
      `SELECT email FROM users
       WHERE email NOT IN (:emails)
         AND (cpf IN (:cpfs) OR registration_number IN (:registrationNumbers))`,
      {
        replacements: {
          cpfs: TEST_USERS.map(({ cpf }) => cpf),
          emails: TEST_USERS.map(({ email }) => email),
          registrationNumbers: TEST_USERS.flatMap(({ registrationNumber }) =>
            registrationNumber === null ? [] : [registrationNumber],
          ),
        },
        transaction,
        type: QueryTypes.SELECT,
      },
    );
    if (conflicts.length > 0) {
      throw new Error(
        'A test CPF or registration number already belongs to another account; nothing was changed.',
      );
    }

    const courseSubjectIds = await selectIds(
      sequelize,
      `SELECT course_subject.id
       FROM course_subjects course_subject
       JOIN courses course ON course.id = course_subject.course_id
       WHERE course.code = :courseCode
         AND course_subject.is_active = true
         AND course_subject.deleted_at IS NULL
       ORDER BY course_subject.id
       LIMIT 4`,
      { courseCode: TEST_COURSE_CODE },
      transaction,
    );
    const requiredSubjects = Math.max(...TEST_USERS.map(({ subjectCount }) => subjectCount));
    if (courseSubjectIds.length < requiredSubjects) {
      throw new Error(
        `Test course ${TEST_COURSE_CODE} needs at least ${requiredSubjects} subjects.`,
      );
    }

    const results: TestUserResult[] = [];
    for (const user of TEST_USERS) {
      const values = {
        birth_date: user.birthDate,
        cpf: user.cpf,
        deleted_at: null,
        deleted_by: null,
        email: user.email,
        is_active: true,
        must_change_password: false,
        name: user.name,
        password_hash: passwordHashes.get(user.email),
        phone: user.phone,
        registration_number: user.registrationNumber,
        updated_at: now,
        updated_by: null,
        user_type: user.userType,
      };
      const findUser = () =>
        selectIds(
          sequelize,
          'SELECT id FROM users WHERE email = :email FOR UPDATE',
          { email: user.email },
          transaction,
        );
      const [existingId] = await findUser();

      if (existingId === undefined) {
        await queryInterface.bulkInsert(
          'users',
          [{ ...values, created_at: now, created_by: null }],
          { transaction },
        );
      } else {
        await queryInterface.bulkUpdate('users', values, { id: existingId }, { transaction });
      }
      results.push({ action: existingId === undefined ? 'created' : 'updated', email: user.email });

      if (user.subjectCount === 0) continue;

      const [userId] = await findUser();
      if (userId === undefined) throw new Error(`Test user was not persisted: ${user.email}`);

      const existingLinks = await selectIds(
        sequelize,
        'SELECT id FROM user_subjects WHERE user_id = :userId AND deleted_at IS NULL',
        { userId },
        transaction,
      );
      if (existingLinks.length > 0) continue;

      let periodOptionItemId: number | null = null;
      if (user.periodValue !== null) {
        [periodOptionItemId = null] = await selectIds(
          sequelize,
          `SELECT items.id
           FROM system_option_items items
           JOIN system_options options ON options.id = items.option_id
           WHERE options.name = :optionName
             AND items.value = :value
             AND options.deleted_at IS NULL
             AND items.deleted_at IS NULL`,
          { optionName: ACADEMIC_PERIOD_OPTION, value: user.periodValue },
          transaction,
        );
        if (periodOptionItemId === null) {
          throw new Error(`Academic period ${user.periodValue} was not found.`);
        }
      }

      await queryInterface.bulkInsert(
        'user_subjects',
        courseSubjectIds.slice(0, user.subjectCount).map((courseSubjectId) => ({
          course_subject_id: courseSubjectId,
          created_at: now,
          created_by: null,
          deleted_at: null,
          deleted_by: null,
          is_active: true,
          period_option_item_id: periodOptionItemId,
          updated_at: now,
          updated_by: null,
          user_id: userId,
        })),
        { transaction },
      );
    }

    return results;
  });
}
