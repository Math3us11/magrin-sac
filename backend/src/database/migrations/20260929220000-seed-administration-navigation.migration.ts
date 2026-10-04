import { QueryTypes, type QueryInterface, type Transaction } from 'sequelize';

type MigrationContext = {
  context: QueryInterface;
};

type IdentifiedCode = {
  code: string;
  id: number | string;
};

const PERMISSION_CODE = 'users.manage';
const ROOT_MENU_CODE = 'administration';
const CHILD_MENU_CODE = 'administration.users';

async function findIdByCode(
  queryInterface: QueryInterface,
  table: 'menu_items' | 'permissions',
  code: string,
  transaction: Transaction,
): Promise<number | string> {
  const rows = await queryInterface.sequelize.query<IdentifiedCode>(
    `SELECT id, code FROM ${table} WHERE code = :code`,
    {
      replacements: { code },
      transaction,
      type: QueryTypes.SELECT,
    },
  );
  const id = rows[0]?.id;

  if (id === undefined) throw new Error(`Seeded record was not found: ${code}`);

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
          description: 'Gerenciar contas de usuários e seus acessos iniciais.',
          name: 'Gerenciar usuários',
        },
      ],
      { transaction },
    );

    const permissionId = await findIdByCode(
      queryInterface,
      'permissions',
      PERMISSION_CODE,
      transaction,
    );

    await queryInterface.bulkInsert(
      'user_type_permissions',
      [
        {
          ...auditValues,
          permission_id: permissionId,
          user_type: 'administrador',
        },
      ],
      { transaction },
    );

    await queryInterface.bulkInsert(
      'menu_items',
      [
        {
          ...auditValues,
          code: ROOT_MENU_CODE,
          icon_key: 'shield-check',
          is_active: true,
          label: 'Administração',
          parent_id: null,
          permission_id: null,
          route_name: null,
          sort_order: 40,
        },
      ],
      { transaction },
    );

    const parentId = await findIdByCode(queryInterface, 'menu_items', ROOT_MENU_CODE, transaction);

    await queryInterface.bulkInsert(
      'menu_items',
      [
        {
          ...auditValues,
          code: CHILD_MENU_CODE,
          icon_key: 'users',
          is_active: true,
          label: 'Usuários',
          parent_id: parentId,
          permission_id: permissionId,
          route_name: 'administration-users',
          sort_order: 10,
        },
      ],
      { transaction },
    );
  });
}

export async function down({ context: queryInterface }: MigrationContext): Promise<void> {
  await queryInterface.sequelize.transaction(async (transaction) => {
    const permissionId = await findIdByCode(
      queryInterface,
      'permissions',
      PERMISSION_CODE,
      transaction,
    );

    await queryInterface.bulkDelete('menu_items', { code: CHILD_MENU_CODE }, { transaction });
    await queryInterface.bulkDelete('menu_items', { code: ROOT_MENU_CODE }, { transaction });
    await queryInterface.bulkDelete(
      'user_type_permissions',
      { permission_id: permissionId },
      { transaction },
    );
    await queryInterface.bulkDelete('permissions', { code: PERMISSION_CODE }, { transaction });
  });
}
