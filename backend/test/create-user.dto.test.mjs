import assert from 'node:assert/strict';
import test from 'node:test';

import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { UserType } from '../dist/models/user.model.js';
import { CreateUserDto } from '../dist/modules/users/dto/create-user.dto.js';
import { ListUsersQueryDto } from '../dist/modules/users/dto/list-users-query.dto.js';
import { UpdateUserDto } from '../dist/modules/users/dto/update-user.dto.js';

const encryptedCredential = {
  algorithm: 'RSA-OAEP-256+A256GCM',
  ciphertext: 'AQIDBA',
  encryptedKey: 'BQYHCA',
  iv: 'AQIDBAUGBwgJCgsM',
  issuedAt: 1_800_000_000_000,
  keyId: 'a'.repeat(43),
  purpose: 'user-registration',
};

const validStudentPayload = {
  name: '  Maria da Silva  ',
  email: '  MARIA@EXAMPLE.COM  ',
  cpf: '123.456.789-00',
  phone: '(69) 99999-9999',
  birthDate: '2004-07-17',
  userType: UserType.STUDENT,
  registrationNumber: '  0020231001  ',
  isActive: true,
  temporaryPassword: encryptedCredential,
  academic: {
    courseIds: [1],
    courseSubjectIds: [10, 11],
    academicPeriodId: 6,
  },
};

test('CreateUserDto normalizes personal data before validation', async () => {
  const input = plainToInstance(CreateUserDto, validStudentPayload);
  const errors = await validate(input, { whitelist: true, forbidNonWhitelisted: true });

  assert.equal(errors.length, 0);
  assert.equal(input.name, 'Maria da Silva');
  assert.equal(input.email, 'maria@example.com');
  assert.equal(input.cpf, '12345678900');
  assert.equal(input.phone, '69999999999');
  assert.equal(input.registrationNumber, '0020231001');
});

test('CreateUserDto exige matrícula numérica de até 20 dígitos para alunos', async () => {
  for (const registrationNumber of [undefined, '', '2023-001', '12a45', '1'.repeat(21)]) {
    const input = plainToInstance(CreateUserDto, { ...validStudentPayload, registrationNumber });
    const errors = await validate(input, { whitelist: true, forbidNonWhitelisted: true });

    assert.ok(
      errors.some((error) => error.property === 'registrationNumber'),
      `matrícula ${JSON.stringify(registrationNumber)} deveria ser rejeitada`,
    );
  }

  const longest = plainToInstance(CreateUserDto, {
    ...validStudentPayload,
    registrationNumber: '9'.repeat(20),
  });
  assert.equal((await validate(longest, { whitelist: true })).length, 0);
});

test('CreateUserDto não exige matrícula de professor', async () => {
  const input = plainToInstance(CreateUserDto, {
    ...validStudentPayload,
    registrationNumber: undefined,
    userType: UserType.PROFESSOR,
  });
  const errors = await validate(input, { whitelist: true, forbidNonWhitelisted: true });

  assert.equal(errors.length, 0);
});

test('CreateUserDto requires academic data for students', async () => {
  const input = plainToInstance(CreateUserDto, {
    ...validStudentPayload,
    academic: undefined,
  });
  const errors = await validate(input, { whitelist: true, forbidNonWhitelisted: true });

  assert.ok(errors.some((error) => error.property === 'academic'));
});

test('CreateUserDto exige telefone com DDD', async () => {
  const input = plainToInstance(CreateUserDto, {
    ...validStudentPayload,
    phone: '',
  });
  const errors = await validate(input, { whitelist: true, forbidNonWhitelisted: true });

  assert.ok(errors.some((error) => error.property === 'phone'));
});

test('CreateUserDto accepts administrators without academic data', async () => {
  const input = plainToInstance(CreateUserDto, {
    ...validStudentPayload,
    userType: UserType.ADMINISTRATOR,
    registrationNumber: undefined,
    academic: undefined,
  });
  const errors = await validate(input, { whitelist: true, forbidNonWhitelisted: true });

  assert.equal(errors.length, 0);
});

test('ListUsersQueryDto converte paginação e filtros recebidos pela URL', async () => {
  const input = plainToInstance(ListUsersQueryDto, {
    isActive: 'false',
    page: '2',
    pageSize: '50',
    search: '  professora  ',
    userType: UserType.PROFESSOR,
  });
  const errors = await validate(input, { whitelist: true, forbidNonWhitelisted: true });

  assert.equal(errors.length, 0);
  assert.equal(input.page, 2);
  assert.equal(input.pageSize, 50);
  assert.equal(input.search, 'professora');
  assert.equal(input.isActive, false);
});

test('UpdateUserDto normaliza dados e não exige senha temporária', async () => {
  const { temporaryPassword: _, ...payload } = validStudentPayload;
  const input = plainToInstance(UpdateUserDto, payload);
  const errors = await validate(input, { whitelist: true, forbidNonWhitelisted: true });

  assert.equal(errors.length, 0);
  assert.equal(input.email, 'maria@example.com');
  assert.equal(input.cpf, '12345678900');
  assert.equal(input.phone, '69999999999');
  assert.equal(input.registrationNumber, '0020231001');
});

test('UpdateUserDto exige matrícula ao manter ou tornar o usuário aluno', async () => {
  const { temporaryPassword: _, registrationNumber: __, ...payload } = validStudentPayload;
  const input = plainToInstance(UpdateUserDto, payload);
  const errors = await validate(input, { whitelist: true, forbidNonWhitelisted: true });

  assert.ok(errors.some((error) => error.property === 'registrationNumber'));
});

test('UpdateUserDto não permite remover o telefone', async () => {
  const { temporaryPassword: _, phone: __, ...payload } = validStudentPayload;
  const input = plainToInstance(UpdateUserDto, payload);
  const errors = await validate(input, { whitelist: true, forbidNonWhitelisted: true });

  assert.ok(errors.some((error) => error.property === 'phone'));
});
