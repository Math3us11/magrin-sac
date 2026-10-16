import { Op, QueryTypes, type QueryInterface, type Transaction } from 'sequelize';

type MigrationContext = { context: QueryInterface };
type IdentifiedCode = { code: string; id: number | string };

const menuItems = [
  {
    code: 'agenda.attendances',
    label: 'Atendimentos',
    parentCode: 'agenda',
    permissionCode: 'attendance.manage.assigned',
    routeName: 'professor-attendances',
    sortOrder: 20,
  },
  {
    code: 'administration.attendances',
    label: 'Atendimentos',
    parentCode: 'administration',
    permissionCode: 'attendance.manage.any',
    routeName: 'administration-attendances',
    sortOrder: 30,
  },
] as const;

async function findIds(
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
    const [parentIds, permissionIds] = await Promise.all([
      findIds(
        queryInterface,
        'menu_items',
        menuItems.map(({ parentCode }) => parentCode),
        transaction,
      ),
      findIds(
        queryInterface,
        'permissions',
        menuItems.map(({ permissionCode }) => permissionCode),
        transaction,
      ),
    ]);
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
      'menu_items',
      menuItems.map((item) => ({
        ...auditValues,
        code: item.code,
        icon_key: 'history',
        is_active: true,
        label: item.label,
        parent_id: requiredId(parentIds, item.parentCode),
        permission_id: requiredId(permissionIds, item.permissionCode),
        route_name: item.routeName,
        sort_order: item.sortOrder,
      })),
      { transaction },
    );
  });
}

export async function down({ context: queryInterface }: MigrationContext): Promise<void> {
  await queryInterface.sequelize.transaction(async (transaction) => {
    await queryInterface.bulkDelete(
      'menu_items',
      { code: { [Op.in]: menuItems.map(({ code }) => code) } },
      { transaction },
    );
  });
}
