import assert from 'node:assert/strict';
import test from 'node:test';
import { Op } from 'sequelize';
import { UsersService } from '../dist/modules/users/users.service.js';

function createService({ existingUser = null } = {}) {
  const calls = {
    createdUser: null,
    courseFindAll: [],
    courseSubjectFindAll: [],
    password: null,
    userFindAndCountAll: null,
    userSubjects: null,
  };
  const courses = [
    {
      code: 'ciencia-computacao',
      educationLevel: 'graduacao',
      id: 1,
      name: 'Ciência da Computação',
    },
    { code: 'medicina', educationLevel: 'graduacao', id: 2, name: 'Medicina' },
  ];
  const courseSubjects = [
    { courseId: 1, id: 10, subjectId: 100 },
    { courseId: 2, id: 20, subjectId: 200 },
  ];
  const subjects = [
    { code: 'algoritmos', id: 100, name: 'Algoritmos e Programação' },
    { code: 'anatomia', id: 200, name: 'Anatomia' },
  ];
  const courseModel = {
    findAll: async (options) => {
      calls.courseFindAll.push(options);
      const ids = options.where.id?.[Op.in];
      return ids ? courses.filter(({ id }) => ids.includes(id)) : courses;
    },
  };
  const courseSubjectModel = {
    findAll: async (options) => {
      calls.courseSubjectFindAll.push(options);
      const ids = options.where.id?.[Op.in];
      const courseIds = options.where.courseId?.[Op.in];
      if (ids) return courseSubjects.filter(({ id }) => ids.includes(id));
      return courseSubjects.filter(({ courseId }) => courseIds.includes(courseId));
    },
  };
  const subjectModel = {
    count: async (options) =>
      subjects.filter(({ id }) => options.where.id[Op.in].includes(id)).length,
    findAll: async (options) => subjects.filter(({ id }) => options.where.id[Op.in].includes(id)),
  };
  const systemOptionModel = { findOne: async () => ({ id: 7 }) };
  const systemOptionItemModel = {
    findAll: async () => [
      { id: 72, name: '10º período', value: '10' },
      { id: 71, name: '2º período', value: '2' },
    ],
    findOne: async (options) =>
      options.where.id === 71 && options.where.optionId === 7 ? { id: 71 } : null,
  };
  const userModel = {
    findAndCountAll: async (options) => {
      calls.userFindAndCountAll = options;
      return {
        count: 2,
        rows: [
          {
            createdAt: new Date('2026-10-01T12:00:00.000Z'),
            email: 'admin@example.com',
            id: 1,
            isActive: true,
            mustChangePassword: false,
            name: 'Administrador',
            userType: 'administrador',
          },
          {
            createdAt: new Date('2026-10-02T12:00:00.000Z'),
            email: 'professor@example.com',
            id: 2,
            isActive: false,
            mustChangePassword: true,
            name: 'Professor',
            userType: 'professor',
          },
        ],
      };
    },
    unscoped: () => ({
      create: async (values) => {
        calls.createdUser = values;
        return { id: 50, ...values };
      },
      findOne: async () => existingUser,
    }),
  };
  const userSubjectModel = {
    bulkCreate: async (rows) => {
      calls.userSubjects = rows;
    },
  };
  const sequelize = {
    transaction: async (callback) => callback({ id: 'transaction' }),
  };
  const passwordHashService = {
    hash: async (password) => {
      calls.password = password;
      return '$argon2id$temporary-password-hash';
    },
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
      { update: async () => undefined },
      sequelize,
      passwordHashService,
    ),
  };
}

test('carrega cursos ativos e ordena períodos academicamente', async () => {
  const { service } = createService();
  const response = await service.getRegistrationOptions();

  assert.deepEqual(
    response.academicPeriods.map(({ value }) => value),
    ['2', '10'],
  );
  assert.equal(response.courses.length, 2);
});

test('filtra matérias pelos cursos e preserva o id do vínculo curso-matéria', async () => {
  const { calls, service } = createService();
  const response = await service.getRegistrationSubjects([2, 1, 2]);

  assert.deepEqual(calls.courseFindAll[0].where.id[Op.in], [2, 1]);
  assert.deepEqual([...calls.courseSubjectFindAll[0].where.courseId[Op.in]].sort(), [1, 2]);
  assert.deepEqual(
    response.subjects.map(({ courseSubjectId }) => courseSubjectId),
    [10, 20],
  );
});

test('lista usuários paginados sem consultar campos sensíveis', async () => {
  const { calls, service } = createService();
  const response = await service.list({
    isActive: false,
    page: 2,
    pageSize: 20,
    search: 'professor',
    userType: 'professor',
  });

  assert.equal(calls.userFindAndCountAll.limit, 20);
  assert.equal(calls.userFindAndCountAll.offset, 20);
  assert.ok(!calls.userFindAndCountAll.attributes.includes('cpf'));
  assert.ok(!calls.userFindAndCountAll.attributes.includes('phone'));
  assert.ok(!calls.userFindAndCountAll.attributes.includes('passwordHash'));
  assert.equal(calls.userFindAndCountAll.where.isActive, false);
  assert.equal(calls.userFindAndCountAll.where.userType, 'professor');
  assert.equal(calls.userFindAndCountAll.where[Op.or][0].name[Op.like], '%professor%');
  assert.equal(response.total, 2);
  assert.equal(response.users[0].name, 'Administrador');
});

test('cadastra aluno e vínculos em uma transação sem persistir a senha em texto puro', async () => {
  const { calls, service } = createService();
  const response = await service.create(
    {
      academic: { academicPeriodId: 71, courseIds: [1], courseSubjectIds: [10] },
      birthDate: '2001-02-03',
      cpf: '11111111111',
      email: 'aluno@example.com',
      isActive: true,
      name: 'Aluno Teste',
      phone: '65999999999',
      temporaryPassword: 'senha-temporaria',
      userType: 'aluno',
    },
    3,
  );

  assert.equal(calls.password, 'senha-temporaria');
  assert.equal(calls.createdUser.passwordHash, '$argon2id$temporary-password-hash');
  assert.equal(calls.createdUser.temporaryPassword, undefined);
  assert.equal(calls.createdUser.mustChangePassword, true);
  assert.deepEqual(calls.userSubjects, [
    {
      courseSubjectId: 10,
      createdBy: 3,
      isActive: true,
      periodOptionItemId: 71,
      updatedBy: 3,
      userId: 50,
    },
  ]);
  assert.deepEqual(response, { message: 'Usuário criado com sucesso.' });
});

test('cadastra professor sem atribuir período acadêmico às matérias', async () => {
  const { calls, service } = createService();

  await service.create(
    {
      academic: { courseIds: [1, 2], courseSubjectIds: [10, 20] },
      birthDate: '1980-04-05',
      cpf: '22222222222',
      email: 'professor@example.com',
      isActive: true,
      name: 'Professor Teste',
      phone: '65999999999',
      temporaryPassword: 'senha-temporaria',
      userType: 'professor',
    },
    3,
  );

  assert.deepEqual(
    calls.userSubjects.map(({ periodOptionItemId }) => periodOptionItemId),
    [null, null],
  );
});
