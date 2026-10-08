import { Op, QueryTypes, type QueryInterface, type Transaction } from 'sequelize';

type MigrationContext = {
  context: QueryInterface;
};

type IdentifiedCode = {
  code: string;
  id: number | string;
};

const permissions = [
  {
    code: 'availability.read.any',
    description: 'Consultar disponibilidades de todos os professores.',
    name: 'Consultar todas as disponibilidades',
  },
  {
    code: 'appointments.read.any',
    description: 'Consultar agendamentos de todos os usuários.',
    name: 'Consultar todos os agendamentos',
  },
] as const;

const MENU_CODE = 'administration.schedule';
const ADMINISTRATION_ROOT_CODE = 'administration';

async function findIdsByCode(
  queryInterface: QueryInterface,
  table: 'menu_items' | 'permissions',
  codes: readonly string[],
  transaction: Transaction,
): Promise<Map<string, number | string>> {
  const rows = await queryInterface.sequelize.query<IdentifiedCode>(
    `SELECT id, code FROM ${table} WHERE code IN (:codes) AND deleted_at IS NULL`,
    {
      replacements: { codes: [...codes] },
      transaction,
      type: QueryTypes.SELECT,
    },
  );

  return new Map(rows.map(({ code, id }) => [code, id]));
}

function requiredId(ids: Map<string, number | string>, code: string): number | string {
  const id = ids.get(code);
  if (id === undefined) throw new Error(`Required record was not found: ${code}`);
  return id;
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
      permissions.map((permission) => ({ ...auditValues, ...permission })),
      { transaction },
    );
    const permissionIds = await findIdsByCode(
      queryInterface,
      'permissions',
      permissions.map(({ code }) => code),
      transaction,
    );

    await queryInterface.bulkInsert(
      'user_type_permissions',
      permissions.map(({ code }) => ({
        ...auditValues,
        permission_id: requiredId(permissionIds, code),
        user_type: 'administrador',
      })),
      { transaction },
    );

    const menuIds = await findIdsByCode(
      queryInterface,
      'menu_items',
      [ADMINISTRATION_ROOT_CODE],
      transaction,
    );
    await queryInterface.bulkInsert(
      'menu_items',
      [
        {
          ...auditValues,
          code: MENU_CODE,
          icon_key: 'calendar-check',
          is_active: true,
          label: 'Agenda geral',
          parent_id: requiredId(menuIds, ADMINISTRATION_ROOT_CODE),
          permission_id: requiredId(permissionIds, 'availability.read.any'),
          route_name: 'administration-schedule',
          sort_order: 20,
        },
      ],
      { transaction },
    );
  });
}

export async function down({ context: queryInterface }: MigrationContext): Promise<void> {
  await queryInterface.sequelize.transaction(async (transaction) => {
    const permissionCodes = permissions.map(({ code }) => code);
    const permissionIds = await findIdsByCode(
      queryInterface,
      'permissions',
      permissionCodes,
      transaction,
    );

    await queryInterface.bulkDelete('menu_items', { code: MENU_CODE }, { transaction });
    await queryInterface.bulkDelete(
      'user_type_permissions',
      { permission_id: { [Op.in]: [...permissionIds.values()] } },
      { transaction },
    );
    await queryInterface.bulkDelete(
      'permissions',
      { code: { [Op.in]: permissionCodes } },
      { transaction },
    );
  });
}
