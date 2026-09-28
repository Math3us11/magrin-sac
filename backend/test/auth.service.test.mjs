import assert from 'node:assert/strict';
import test from 'node:test';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../dist/modules/auth/auth.service.js';
import { RequestOriginGuard } from '../dist/guards/request-origin.guard.js';

const activeUser = {
  birthDate: '2000-01-02',
  cpf: '00000000000',
  email: 'aluno@example.com',
  id: 3,
  isActive: true,
  name: 'Aluno Teste',
  passwordHash: 'stored-password-hash',
  userType: 'aluno',
};

function createAuthService(overrides = {}) {
  const state = {
    createdSession: null,
    sessionUpdate: null,
    updatedSessions: null,
  };
  const session = {
    absoluteExpiresAt: new Date(Date.now() + 60_000),
    id: 7,
    update: async (values) => {
      state.sessionUpdate = values;
    },
  };
  const userModel = {
    findByPk: async () => overrides.currentUser ?? activeUser,
    unscoped: () => ({ findOne: async () => overrides.loginUser ?? activeUser }),
  };
  const authSessionModel = {
    create: async (values) => {
      state.createdSession = values;
      return { ...session, ...values };
    },
    findOne: async () => (Object.hasOwn(overrides, 'session') ? overrides.session : session),
    update: async (values) => {
      state.updatedSessions = values;
    },
  };
  const sequelize = {
    transaction: async (callback) => callback({ id: 'transaction' }),
  };
  const jwtSessionService = {
    createTokenId: () => '9a2575e1-7707-4381-aa11-15a78455d5d6',
    read: async () => ({
      sessionId: 7,
      tokenId: '9a2575e1-7707-4381-aa11-15a78455d5d6',
      userId: 3,
    }),
    sign: async () => 'signed.jwt.value',
  };
  const passwordHashService = {
    matches: async () => overrides.passwordMatches ?? true,
  };
  const configService = new ConfigService({
    auth: { jwt: { ttlSeconds: 3600 } },
  });

  return {
    service: new AuthService(
      userModel,
      authSessionModel,
      sequelize,
      jwtSessionService,
      passwordHashService,
      configService,
    ),
    state,
  };
}

test('login válido cria sessão e retorna somente dados públicos do usuário', async () => {
  const { service, state } = createAuthService();
  const result = await service.login({ email: activeUser.email, password: 'correct-password' });

  assert.equal(result.token, 'signed.jwt.value');
  assert.deepEqual(result.user, {
    birthDate: activeUser.birthDate,
    email: activeUser.email,
    id: activeUser.id,
    name: activeUser.name,
    userType: activeUser.userType,
  });
  assert.equal(state.createdSession.userId, activeUser.id);
  assert.equal(state.createdSession.createdBy, activeUser.id);
  assert.equal(state.createdSession.tokenId, '9a2575e1-7707-4381-aa11-15a78455d5d6');
});

test('login rejeita credenciais inválidas com mensagem genérica', async () => {
  const { service, state } = createAuthService({ passwordMatches: false });

  await assert.rejects(
    service.login({ email: activeUser.email, password: 'wrong-password' }),
    (error) =>
      error instanceof UnauthorizedException && error.message === 'E-mail ou senha inválidos.',
  );
  assert.equal(state.createdSession, null);
});

test('autenticação consulta sessão e usuário atuais e registra atividade', async () => {
  const { service, state } = createAuthService();
  const authenticated = await service.authenticate('signed.jwt.value');

  assert.equal(authenticated.sessionId, 7);
  assert.equal(authenticated.user.id, activeUser.id);
  assert.equal(state.sessionUpdate.updatedBy, activeUser.id);
  assert.ok(state.sessionUpdate.lastActivityAt instanceof Date);
});

test('autenticação rejeita sessão revogada ou inexistente', async () => {
  const { service } = createAuthService({ session: null });

  await assert.rejects(service.authenticate('signed.jwt.value'), UnauthorizedException);
});

test('logout revoga a sessão válida no banco', async () => {
  const { service, state } = createAuthService();
  await service.logout('signed.jwt.value');

  assert.equal(state.updatedSessions.updatedBy, activeUser.id);
  assert.ok(state.updatedSessions.revokedAt instanceof Date);
});

function createHttpContext(method, origin) {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        get: (header) => (header === 'origin' ? origin : undefined),
        method,
      }),
    }),
  };
}

test('proteção de origem aceita o frontend configurado e rejeita outra origem', () => {
  const guard = new RequestOriginGuard(
    new ConfigService({ app: { corsOrigin: 'http://localhost:5173' } }),
  );

  assert.equal(guard.canActivate(createHttpContext('POST', 'http://localhost:5173')), true);
  assert.throws(
    () => guard.canActivate(createHttpContext('POST', 'https://malicious.example')),
    ForbiddenException,
  );
});
