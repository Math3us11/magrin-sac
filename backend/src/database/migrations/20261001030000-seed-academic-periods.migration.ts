import { QueryTypes, type QueryInterface, type Transaction } from 'sequelize';

type MigrationContext = {
  context: QueryInterface;
};

const optionName = 'ACADEMIC_PERIOD';
const periods = Array.from({ length: 12 }, (_, index) => ({
  name: `${index + 1}º período`,
  value: String(index + 1),
}));

async function findOptionId(
  queryInterface: QueryInterface,
  transaction: Transaction,
): Promise<number | null> {
  const rows = await queryInterface.sequelize.query<{ id: number }>(
    'SELECT id FROM system_options WHERE name = :name AND deleted_at IS NULL LIMIT 1',
    {
      replacements: { name: optionName },
      transaction,
      type: QueryTypes.SELECT,
    },
  );

  return rows[0]?.id ?? null;
}

export async function up({ context: queryInterface }: MigrationContext): Promise<void> {
  await queryInterface.sequelize.transaction(async (transaction) => {
    const now = new Date();
    const auditValues = {
      created_at: now,
      created_by: null,
      deleted_at: null,
      deleted_by: null,
      updated_at: now,
      updated_by: null,
    };

    await queryInterface.bulkInsert('system_options', [{ ...auditValues, name: optionName }], {
      transaction,
    });

    const optionId = await findOptionId(queryInterface, transaction);

    if (!optionId) {
      throw new Error('Não foi possível localizar a opção de períodos acadêmicos.');
    }

    await queryInterface.bulkInsert(
      'system_option_items',
      periods.map((period) => ({
        ...auditValues,
        ...period,
        option_id: optionId,
      })),
      { transaction },
    );
  });
}

export async function down({ context: queryInterface }: MigrationContext): Promise<void> {
  await queryInterface.sequelize.transaction(async (transaction) => {
    const optionId = await findOptionId(queryInterface, transaction);

    if (!optionId) return;

    await queryInterface.bulkDelete(
      'system_option_items',
      { option_id: optionId },
      { transaction },
    );
    await queryInterface.bulkDelete('system_options', { id: optionId }, { transaction });
  });
}
