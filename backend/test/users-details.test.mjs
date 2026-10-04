import assert from 'node:assert/strict';
import test from 'node:test';
import { ForbiddenException } from '@nestjs/common';
import { Op } from 'sequelize';
import { UsersService } from '../dist/modules/users/users.service.js';

function createService() {
  const calls = {
    createdLinks: [],
    identityWhere: null,
    linkUpdates: [],
    revokedSessions: null,
    userDestroyed: false,
    userUpdate: null,
  };
  const user = {
    birthDate: '2001-02-03',
    cpf: '11111111111',
    createdAt: new Date('2026-10-01T12:00:00.000Z'),
    email: 'aluno@example.com',
    id: 10,
    isActive: true,
    mustChangePassword: false,
    name: 'Aluno Teste',
    phone: '65999999999',
    updatedAt: new Date('2026-10-02T12:00:00.000Z'),
    userType: 'aluno',
    destroy: async () => {
      calls.userDestroyed = true;
    },
    update: async (values) => {
      calls.userUpdate = values;
      Object.assign(user, values);
    },
  };
  const courses = [
    { id: 1, name: 'Ciência da Computação' },
    { id: 2, name: 'Medicina' },
  ];
  const courseSubjects = [
    { courseId: 1, id: 10, subjectId: 100 },
    { courseId: 2, id: 20, subjectId: 200 },
  ];
  const subjects = [
    { id: 100, name: 'Algoritmos e Programação' },
    { id: 200, name: 'Anatomia' },
  ];
  const existingLink = {
    courseSubjectId: 10,
    deletedAt: null,
    isActive: true,
    periodOptionItemId: null,
    update: async (values) => {
      calls.linkUpdates.push(values);
      Object.assign(existingLink, values);
    },
  };
  const courseModel = {
    findAll: async (options) => {
      const ids = options.where.id?.[Op.in];
      return ids ? courses.filter(({ id }) => ids.includes(id)) : courses;
    },
  };
  const courseSubjectModel = {
    findAll: async (options) => {
      const ids = options.where.id?.[Op.in];
      return ids ? courseSubjects.filter(({ id }) => ids.includes(id)) : courseSubjects;
    },
  };
  const subjectModel = {
    count: async (options) =>
      subjects.filter(({ id }) => options.where.id[Op.in].includes(id)).length,
    findAll: async (options) => subjects.filter(({ id }) => options.where.id[Op.in].includes(id)),
  };
  const systemOptionModel = { findOne: async () => ({ id: 7 }) };
  const systemOptionItemModel = {
    findAll: async () => [],
    findByPk: async (id) => (id === 71 ? { id: 71, name: '2º período', value: '2' } : null),
    findOne: async (options) =>
      options.where.id === 71 && options.where.optionId === 7 ? { id: 71 } : null,
  };
  const userModel = {
    unscoped: () => ({
      findByPk: async (id) =>
        id === user.id
          ? user
          : id === 3
            ? { id: 3, isActive: true, passwordHash: 'admin-password-hash' }
            : null,
      findOne: async (options) => {
        calls.identityWhere = options.where;
        return null;
      },
    }),
  };
  const userSubjectModel = {
    bulkCreate: async (rows) => {
      calls.createdLinks = rows;
    },
    findAll: async () => [{ courseSubjectId: 10, periodOptionItemId: 71 }],
    unscoped: () => ({ findAll: async () => [existingLink] }),
  };
  const authSessionModel = {
    update: async (values) => {
      calls.revokedSessions = values;
    },
  };
  const sequelize = {
    transaction: async (callback) => callback({ id: 'transaction' }),
  };
  const passwordHashService = {
    hash: async () => 'unused',
    matches: async (password) => password === 'admin-password',
  };

  return {
    calls,
    service: new UsersService(
      courseModel,
      courseSubjectModel,
      subjectModel,
      systemOptionModel,
      systemOptionItemModel,
      userModel,
      userSubjectModel,
      authSessionModel,
      sequelize,
      passwordHashService,
    ),
  };
}

test('consulta detalhes administrativos sem expor credenciais', async () => {
  const { service } = createService();
  const response = await service.getById(10);

  assert.equal(response.cpf, '11111111111');
  assert.equal(response.phone, '65999999999');
  assert.equal(response.academic.courses[0].name, 'Ciência da Computação');
  assert.equal(response.academic.subjects[0].subjectName, 'Algoritmos e Programação');
  assert.equal(response.academic.academicPeriod.name, '2º período');
  assert.ok(!Object.hasOwn(response, 'passwordHash'));
});

test('atualiza usuário e reconcilia vínculos acadêmicos na mesma transação', async () => {
  const { calls, service } = createService();
  const response = await service.update(
    10,
    {
      academic: { courseIds: [1, 2], courseSubjectIds: [10, 20] },
      birthDate: '1980-04-05',
      cpf: '11111111111',
      email: 'professor@example.com',
      isActive: true,
      name: 'Professor Atualizado',
      phone: '65988888888',
      userType: 'professor',
    },
    3,
  );

  assert.deepEqual(response, { message: 'Usuário atualizado com sucesso.' });
  assert.equal(calls.userUpdate.updatedBy, 3);
  assert.equal(calls.userUpdate.userType, 'professor');
  assert.equal(calls.linkUpdates[0].isActive, true);
  assert.deepEqual(calls.createdLinks, [
    {
      courseSubjectId: 20,
      createdBy: 3,
      isActive: true,
      periodOptionItemId: null,
      updatedBy: 3,
      userId: 10,
    },
  ]);
  assert.equal(calls.identityWhere.id[Op.ne], 10);
});

test('exclui logicamente o usuário, registra o administrador e revoga sessões', async () => {
  const { calls, service } = createService();

  const response = await service.delete(10, 3, 'admin-password');

  assert.deepEqual(response, { message: 'Usuário excluído com sucesso.' });
  assert.equal(calls.userUpdate.deletedBy, 3);
  assert.equal(calls.userUpdate.updatedBy, 3);
  assert.equal(calls.userUpdate.isActive, false);
  assert.equal(calls.userDestroyed, true);
  assert.equal(calls.revokedSessions.updatedBy, 3);
  assert.ok(calls.revokedSessions.revokedAt instanceof Date);
});

test('rejeita exclusão com senha administrativa inválida ou da própria conta', async () => {
  const { service } = createService();

  await assert.rejects(service.delete(10, 3, 'senha-incorreta'), ForbiddenException);
  await assert.rejects(service.delete(3, 3, 'admin-password'), ForbiddenException);
});
