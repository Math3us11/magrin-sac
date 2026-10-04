import assert from 'node:assert/strict';
import test from 'node:test';
import { ForbiddenException } from '@nestjs/common';
import { PermissionGuard } from '../dist/guards/permission.guard.js';

function createContext(userType = 'administrador') {
  return {
    getClass: () => class TestController {},
    getHandler: () => () => undefined,
    switchToHttp: () => ({
      getRequest: () => ({ auth: { user: { userType } } }),
    }),
  };
}

test('guard permite somente quem possui todas as permissões declaradas', async () => {
  const reflector = { getAllAndOverride: () => ['users.manage'] };
  const allowed = new PermissionGuard(reflector, {
    resolveForUserType: async () => ({ codes: ['users.manage'], ids: [1] }),
  });
  const denied = new PermissionGuard(reflector, {
    resolveForUserType: async () => ({ codes: [], ids: [] }),
  });

  assert.equal(await allowed.canActivate(createContext()), true);
  await assert.rejects(denied.canActivate(createContext('aluno')), ForbiddenException);
});
