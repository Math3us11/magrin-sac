import { Op, QueryTypes, type QueryInterface, type Transaction } from 'sequelize';

type MigrationContext = { context: QueryInterface };
type IdentifiedCode = { code: string; id: number | string };

const permissions = [
  {
    code: 'attendance.manage.assigned',
    description: 'Registrar atendimentos vinculados às próprias disponibilidades.',
    name: 'Registrar atendimentos atribuídos',
    userType: 'professor',
  },
  {
    code: 'attendance.manage.any',
    description: 'Registrar qualquer atendimento da agenda institucional.',
    name: 'Registrar qualquer atendimento',
    userType: 'administrador',
  },
] as const;

async function findPermissionIds(
  queryInterface: QueryInterface,
  transaction: Transaction,
): Promise<Map<string, number | string>> {
  const rows = await queryInterface.sequelize.query<IdentifiedCode>(
    'SELECT id, code FROM permissions WHERE code IN (:codes) AND deleted_at IS NULL',
    {
      replacements: { codes: permissions.map(({ code }) => code) },
      transaction,
      type: QueryTypes.SELECT,
    },
  );
  return new Map(rows.map(({ code, id }) => [code, id]));
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
    await queryInterface.bulkInsert(
      'permissions',
      permissions.map(({ code, description, name }) => ({
        ...auditValues,
        code,
        description,
        name,
      })),
      { transaction },
    );
    const ids = await findPermissionIds(queryInterface, transaction);
    await queryInterface.bulkInsert(
      'user_type_permissions',
      permissions.map(({ code, userType }) => ({
        ...auditValues,
        permission_id: ids.get(code),
        user_type: userType,
      })),
      { transaction },
    );
  });
}

export async function down({ context: queryInterface }: MigrationContext): Promise<void> {
  await queryInterface.sequelize.transaction(async (transaction) => {
    const ids = await findPermissionIds(queryInterface, transaction);
    await queryInterface.bulkDelete(
      'user_type_permissions',
      { permission_id: { [Op.in]: [...ids.values()] } },
      { transaction },
    );
    await queryInterface.bulkDelete(
      'permissions',
      { code: { [Op.in]: permissions.map(({ code }) => code) } },
      { transaction },
    );
  });
}
