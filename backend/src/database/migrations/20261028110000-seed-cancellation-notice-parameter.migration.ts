import type { QueryInterface } from 'sequelize';

type MigrationContext = { context: QueryInterface };

const PARAMETER_NAME = 'APPOINTMENT_CANCELLATION_MIN_NOTICE_MINUTES';

export async function up({ context: queryInterface }: MigrationContext): Promise<void> {
  const now = new Date();
  await queryInterface.bulkInsert('system_parameters', [
    {
      created_at: now,
      created_by: null,
      deleted_at: null,
      deleted_by: null,
      description:
        'Antecedência mínima, em minutos, para aluno e professor cancelarem um agendamento. ' +
        'O administrador pode cancelar até o início.',
      name: PARAMETER_NAME,
      updated_at: now,
      updated_by: null,
      value: '120',
    },
  ]);
}

export async function down({ context: queryInterface }: MigrationContext): Promise<void> {
  await queryInterface.bulkDelete('system_parameters', { name: PARAMETER_NAME });
}
