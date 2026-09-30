import assert from 'node:assert/strict';
import test from 'node:test';
import { PermissionService } from '../dist/modules/auth/permission.service.js';
import { NavigationService } from '../dist/modules/navigation/navigation.service.js';

test('PermissionService resolve somente permissões ativas do tipo solicitado', async () => {
  const permissionModel = {
    findAll: async () => [
      { code: 'appointments.create', id: 2 },
      { code: 'appointments.read.own', id: 3 },
    ],
  };
  const userTypePermissionModel = {
    findAll: async ({ where }) => {
      assert.equal(where.userType, 'aluno');
      return [{ permissionId: 2 }, { permissionId: 3 }, { permissionId: 3 }];
    },
  };
  const service = new PermissionService(permissionModel, userTypePermissionModel);

  assert.deepEqual(await service.resolveForUserType('aluno'), {
    codes: ['appointments.create', 'appointments.read.own'],
    ids: [2, 3],
  });
});

test('NavigationService monta a árvore e remove agrupadores sem filhos permitidos', async () => {
  const menuItems = [
    {
      code: 'home',
      iconKey: 'house',
      id: 10,
      label: 'Início',
      parentId: null,
      permissionId: null,
      routeName: 'home',
    },
    {
      code: 'reports',
      iconKey: 'chart-no-axes-combined',
      id: 11,
      label: 'Relatórios',
      parentId: null,
      permissionId: null,
      routeName: null,
    },
    {
      code: 'appointments',
      iconKey: 'calendar-check',
      id: 12,
      label: 'Agendamentos',
      parentId: null,
      permissionId: null,
      routeName: null,
    },
    {
      code: 'reports.dashboard',
      iconKey: 'chart-no-axes-combined',
      id: 13,
      label: 'Dashboard',
      parentId: 11,
      permissionId: 1,
      routeName: 'reports-dashboard',
    },
    {
      code: 'appointments.new',
      iconKey: 'calendar-check',
      id: 14,
      label: 'Novo agendamento',
      parentId: 12,
      permissionId: 2,
      routeName: 'appointments-new',
    },
  ];
  const menuItemModel = { findAll: async () => menuItems };
  const permissionService = {
    resolveForUserType: async () => ({
      codes: ['reports.dashboard.view'],
      ids: [1],
    }),
  };
  const service = new NavigationService(menuItemModel, permissionService);
  const result = await service.getForUserType('professor');

  assert.deepEqual(result.permissions, ['reports.dashboard.view']);
  assert.deepEqual(
    result.items.map(({ code }) => code),
    ['home', 'reports'],
  );
  assert.deepEqual(result.items[1].children, [
    {
      children: [],
      code: 'reports.dashboard',
      iconKey: 'chart-no-axes-combined',
      id: 13,
      label: 'Dashboard',
      routeName: 'reports-dashboard',
    },
  ]);
});
