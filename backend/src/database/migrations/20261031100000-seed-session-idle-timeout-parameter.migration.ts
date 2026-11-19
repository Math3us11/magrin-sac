import type { QueryInterface } from 'sequelize';

type MigrationContext = { context: QueryInterface };

const PARAMETER_NAME = 'SESSION_IDLE_TIMEOUT_MINUTES';

export async function up({ context: queryInterface }: MigrationContext): Promise<void> {
  const now = new Date();
  await queryInterface.bulkInsert('system_parameters', [
    {
      created_at: now,
      created_by: null,
      deleted_at: null,
      deleted_by: null,
      description:
        'Tempo sem uso, em minutos, após o qual a tela é bloqueada e a sessão é encerrada. ' +
        'Para continuar, a pessoa confirma a própria senha.',
      name: PARAMETER_NAME,
      updated_at: now,
      updated_by: null,
      value: '30',
    },
  ]);
}

export async function down({ context: queryInterface }: MigrationContext): Promise<void> {
  await queryInterface.bulkDelete('system_parameters', { name: PARAMETER_NAME });
}
