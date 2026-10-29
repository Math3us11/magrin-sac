import { QueryTypes, type QueryInterface, type Transaction } from 'sequelize';

type MigrationContext = { context: QueryInterface };
type IdentifiedCode = { code: string; id: number | string };

const PERMISSION_CODE = 'parameters.manage';
const PARENT_MENU_CODE = 'administration';
const MENU_CODE = 'administration.parameters';

async function findId(
  queryInterface: QueryInterface,
  table: 'menu_items' | 'permissions',
  code: string,
  transaction: Transaction,
): Promise<number | string | undefined> {
  const [row] = await queryInterface.sequelize.query<IdentifiedCode>(
    `SELECT id, code FROM ${table} WHERE code = :code AND deleted_at IS NULL`,
    { replacements: { code }, transaction, type: QueryTypes.SELECT },
  );
  return row?.id;
}

async function requiredId(
  queryInterface: QueryInterface,
  table: 'menu_items' | 'permissions',
  code: string,
  transaction: Transaction,
): Promise<number | string> {
  const id = await findId(queryInterface, table, code, transaction);
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
      [
        {
          ...auditValues,
          code: PERMISSION_CODE,
          description: 'Consultar e alterar os parâmetros institucionais do sistema.',
          name: 'Gerenciar parâmetros',
        },
      ],
      { transaction },
    );
    const permissionId = await requiredId(
      queryInterface,
      'permissions',
      PERMISSION_CODE,
      transaction,
    );
    await queryInterface.bulkInsert(
      'user_type_permissions',
      [{ ...auditValues, permission_id: permissionId, user_type: 'administrador' }],
      { transaction },
    );
    await queryInterface.bulkInsert(
      'menu_items',
      [
        {
          ...auditValues,
          code: MENU_CODE,
          icon_key: 'settings',
          is_active: true,
          label: 'Parâmetros',
          parent_id: await requiredId(queryInterface, 'menu_items', PARENT_MENU_CODE, transaction),
          permission_id: permissionId,
          route_name: 'administration-parameters',
          sort_order: 50,
        },
      ],
      { transaction },
    );
  });
}

export async function down({ context: queryInterface }: MigrationContext): Promise<void> {
  await queryInterface.sequelize.transaction(async (transaction) => {
    await queryInterface.bulkDelete('menu_items', { code: MENU_CODE }, { transaction });
    const permissionId = await findId(queryInterface, 'permissions', PERMISSION_CODE, transaction);
    if (permissionId !== undefined) {
      await queryInterface.bulkDelete(
        'user_type_permissions',
        { permission_id: permissionId },
        { transaction },
      );
    }
    await queryInterface.bulkDelete('permissions', { code: PERMISSION_CODE }, { transaction });
  });
}
