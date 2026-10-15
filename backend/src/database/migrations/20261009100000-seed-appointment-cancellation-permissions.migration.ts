import { Op, QueryTypes, type QueryInterface, type Transaction } from 'sequelize';

type MigrationContext = { context: QueryInterface };
type IdentifiedCode = { code: string; id: number | string };

const permissions = [
  {
    code: 'appointments.cancel.own',
    description: 'Cancelar os próprios agendamentos dentro do prazo permitido.',
    name: 'Cancelar próprios agendamentos',
    userType: 'aluno',
  },
  {
    code: 'appointments.read.assigned',
    description: 'Consultar agendamentos vinculados às próprias disponibilidades.',
    name: 'Consultar agendamentos atribuídos',
    userType: 'professor',
  },
  {
    code: 'appointments.cancel.assigned',
    description: 'Cancelar agendamentos vinculados às próprias disponibilidades.',
    name: 'Cancelar agendamentos atribuídos',
    userType: 'professor',
  },
  {
    code: 'appointments.cancel.any',
    description: 'Cancelar qualquer agendamento com confirmação administrativa.',
    name: 'Cancelar qualquer agendamento',
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
    const permissionIds = await findPermissionIds(queryInterface, transaction);

    await queryInterface.bulkInsert(
      'user_type_permissions',
      permissions.map(({ code, userType }) => ({
        ...auditValues,
        permission_id: permissionIds.get(code),
        user_type: userType,
      })),
      { transaction },
    );
  });
}

export async function down({ context: queryInterface }: MigrationContext): Promise<void> {
  await queryInterface.sequelize.transaction(async (transaction) => {
    const permissionIds = await findPermissionIds(queryInterface, transaction);

    await queryInterface.bulkDelete(
      'user_type_permissions',
      { permission_id: { [Op.in]: [...permissionIds.values()] } },
      { transaction },
    );
    await queryInterface.bulkDelete(
      'permissions',
      { code: { [Op.in]: permissions.map(({ code }) => code) } },
      { transaction },
    );
  });
}
