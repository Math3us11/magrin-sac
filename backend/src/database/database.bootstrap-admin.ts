import { QueryTypes, type Sequelize } from 'sequelize';
import { PasswordHashService } from '../helpers/password/password.service.js';

export type BootstrapAdministratorInput = {
  birthDate: string;
  cpf: string;
  email: string;
  name: string;
  password: string;
};

export type BootstrapAdministratorResult = {
  action: 'created' | 'updated';
  email: string;
};

type ExistingUserRow = {
  cpf: string;
  email: string;
  id: number | string;
};

type PasswordHasher = Pick<PasswordHashService, 'hash'>;

const REQUIRED_ENVIRONMENT_VARIABLES = {
  birthDate: 'BOOTSTRAP_ADMIN_BIRTH_DATE',
  cpf: 'BOOTSTRAP_ADMIN_CPF',
  email: 'BOOTSTRAP_ADMIN_EMAIL',
  name: 'BOOTSTRAP_ADMIN_NAME',
  password: 'BOOTSTRAP_ADMIN_PASSWORD',
} as const;

function requiredBootstrapValue(environment: NodeJS.ProcessEnv, name: string): string {
  const value = environment[name]?.trim();

  if (!value) throw new Error(`Missing required environment variable: ${name}`);

  return value;
}

function isValidDateOnly(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const date = new Date(`${value}T00:00:00.000Z`);

  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function validateBootstrapAdministratorInput(
  input: BootstrapAdministratorInput,
): BootstrapAdministratorInput {
  const normalized = {
    birthDate: input.birthDate.trim(),
    cpf: input.cpf.replace(/\D/g, ''),
    email: input.email.trim().toLowerCase(),
    name: input.name.trim(),
    password: input.password,
  };

  if (normalized.name.length < 2 || normalized.name.length > 150) {
    throw new Error('BOOTSTRAP_ADMIN_NAME must contain between 2 and 150 characters.');
  }

  if (normalized.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized.email)) {
    throw new Error('BOOTSTRAP_ADMIN_EMAIL must be a valid email address.');
  }

  if (!/^\d{11}$/.test(normalized.cpf)) {
    throw new Error('BOOTSTRAP_ADMIN_CPF must contain exactly 11 digits.');
  }

  if (!isValidDateOnly(normalized.birthDate)) {
    throw new Error('BOOTSTRAP_ADMIN_BIRTH_DATE must use a valid YYYY-MM-DD date.');
  }

  if (normalized.password.length < 8 || normalized.password.length > 128) {
    throw new Error('BOOTSTRAP_ADMIN_PASSWORD must contain between 8 and 128 characters.');
  }

  return normalized;
}

export function readBootstrapAdministratorInput(
  environment: NodeJS.ProcessEnv = process.env,
): BootstrapAdministratorInput {
  return validateBootstrapAdministratorInput({
    birthDate: requiredBootstrapValue(environment, REQUIRED_ENVIRONMENT_VARIABLES.birthDate),
    cpf: requiredBootstrapValue(environment, REQUIRED_ENVIRONMENT_VARIABLES.cpf),
    email: requiredBootstrapValue(environment, REQUIRED_ENVIRONMENT_VARIABLES.email),
    name: requiredBootstrapValue(environment, REQUIRED_ENVIRONMENT_VARIABLES.name),
    password: requiredBootstrapValue(environment, REQUIRED_ENVIRONMENT_VARIABLES.password),
  });
}

export async function provisionAdministrator(
  sequelize: Sequelize,
  rawInput: BootstrapAdministratorInput,
  passwordHasher: PasswordHasher = new PasswordHashService(),
): Promise<BootstrapAdministratorResult> {
  const input = validateBootstrapAdministratorInput(rawInput);
  const passwordHash = await passwordHasher.hash(input.password);

  return sequelize.transaction(async (transaction) => {
    const existingUsers = await sequelize.query<ExistingUserRow>(
      `SELECT id, email, cpf
       FROM users
       WHERE email = :email OR cpf = :cpf
       FOR UPDATE`,
      {
        replacements: { cpf: input.cpf, email: input.email },
        transaction,
        type: QueryTypes.SELECT,
      },
    );

    if (existingUsers.length > 1) {
      throw new Error('The bootstrap email and CPF belong to different users.');
    }

    const existingUser = existingUsers[0];
    const now = new Date();
    const values = {
      birth_date: input.birthDate,
      cpf: input.cpf,
      deleted_at: null,
      deleted_by: null,
      email: input.email,
      is_active: true,
      name: input.name,
      password_hash: passwordHash,
      updated_at: now,
      updated_by: null,
      user_type: 'administrador',
    };
    const queryInterface = sequelize.getQueryInterface();

    if (existingUser) {
      if (existingUser.email !== input.email || existingUser.cpf !== input.cpf) {
        throw new Error('The bootstrap email or CPF already belongs to another user.');
      }

      await queryInterface.bulkUpdate('users', values, { id: existingUser.id }, { transaction });

      return { action: 'updated', email: input.email };
    }

    await queryInterface.bulkInsert(
      'users',
      [
        {
          ...values,
          created_at: now,
          created_by: null,
        },
      ],
      { transaction },
    );

    return { action: 'created', email: input.email };
  });
}
