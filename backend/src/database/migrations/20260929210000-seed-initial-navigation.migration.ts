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
    code: 'reports.dashboard.view',
    description: 'Visualizar o dashboard de relatórios.',
    name: 'Visualizar dashboard de relatórios',
  },
  {
    code: 'appointments.create',
    description: 'Criar um novo agendamento próprio.',
    name: 'Criar agendamento',
  },
  {
    code: 'appointments.read.own',
    description: 'Consultar os próprios agendamentos.',
    name: 'Consultar próprios agendamentos',
  },
] as const;

const permissionAssignments = [
  { permissionCode: 'reports.dashboard.view', userType: 'professor' },
  { permissionCode: 'reports.dashboard.view', userType: 'administrador' },
  { permissionCode: 'appointments.create', userType: 'aluno' },
  { permissionCode: 'appointments.create', userType: 'administrador' },
  { permissionCode: 'appointments.read.own', userType: 'aluno' },
  { permissionCode: 'appointments.read.own', userType: 'administrador' },
] as const;

const rootMenuItems = [
  {
    code: 'home',
    iconKey: 'house',
    label: 'Início',
    routeName: 'home',
    sortOrder: 10,
  },
  {
    code: 'reports',
    iconKey: 'chart-no-axes-combined',
    label: 'Relatórios',
    routeName: null,
    sortOrder: 20,
  },
  {
    code: 'appointments',
    iconKey: 'calendar-check',
    label: 'Agendamentos',
    routeName: null,
    sortOrder: 30,
  },
] as const;

const childMenuItems = [
  {
    code: 'reports.dashboard',
    iconKey: 'chart-no-axes-combined',
    label: 'Dashboard',
    parentCode: 'reports',
    permissionCode: 'reports.dashboard.view',
    routeName: 'reports-dashboard',
    sortOrder: 10,
  },
  {
    code: 'appointments.new',
    iconKey: 'calendar-check',
    label: 'Novo agendamento',
    parentCode: 'appointments',
    permissionCode: 'appointments.create',
    routeName: 'appointments-new',
    sortOrder: 10,
  },
  {
    code: 'appointments.mine',
    iconKey: 'history',
    label: 'Meus agendamentos',
    parentCode: 'appointments',
    permissionCode: 'appointments.read.own',
    routeName: 'appointments-mine',
    sortOrder: 20,
  },
] as const;

const permissionCodes = permissions.map(({ code }) => code);
const rootMenuCodes = rootMenuItems.map(({ code }) => code);
const childMenuCodes = childMenuItems.map(({ code }) => code);

async function findIdsByCode(
  queryInterface: QueryInterface,
  table: 'menu_items' | 'permissions',
  codes: readonly string[],
  transaction: Transaction,
): Promise<Map<string, number | string>> {
  const rows = await queryInterface.sequelize.query<IdentifiedCode>(
    `SELECT id, code FROM ${table} WHERE code IN (:codes)`,
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
      permissions.map((permission) => ({ ...permission, ...auditValues })),
      { transaction },
    );

    const permissionIds = await findIdsByCode(
      queryInterface,
      'permissions',
      permissionCodes,
      transaction,
    );

    await queryInterface.bulkInsert(
      'user_type_permissions',
      permissionAssignments.map(({ permissionCode, userType }) => ({
        ...auditValues,
        permission_id: requiredId(permissionIds, permissionCode),
        user_type: userType,
      })),
      { transaction },
    );

    await queryInterface.bulkInsert(
      'menu_items',
      rootMenuItems.map(({ code, iconKey, label, routeName, sortOrder }) => ({
        ...auditValues,
        code,
        icon_key: iconKey,
        is_active: true,
        label,
        parent_id: null,
        permission_id: null,
        route_name: routeName,
        sort_order: sortOrder,
      })),
      { transaction },
    );

    const parentIds = await findIdsByCode(
      queryInterface,
      'menu_items',
      rootMenuItems.map(({ code }) => code),
      transaction,
    );

    await queryInterface.bulkInsert(
      'menu_items',
      childMenuItems.map(
        ({ code, iconKey, label, parentCode, permissionCode, routeName, sortOrder }) => ({
          ...auditValues,
          code,
          icon_key: iconKey,
          is_active: true,
          label,
          parent_id: requiredId(parentIds, parentCode),
          permission_id: requiredId(permissionIds, permissionCode),
          route_name: routeName,
          sort_order: sortOrder,
        }),
      ),
      { transaction },
    );
  });
}

export async function down({ context: queryInterface }: MigrationContext): Promise<void> {
  await queryInterface.sequelize.transaction(async (transaction) => {
    const permissionIds = await findIdsByCode(
      queryInterface,
      'permissions',
      permissionCodes,
      transaction,
    );

    await queryInterface.bulkDelete(
      'menu_items',
      { code: { [Op.in]: childMenuCodes } },
      { transaction },
    );
    await queryInterface.bulkDelete(
      'menu_items',
      { code: { [Op.in]: rootMenuCodes } },
      { transaction },
    );
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
