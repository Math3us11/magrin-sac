import 'reflect-metadata';
import assert from 'node:assert/strict';
import test from 'node:test';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ListAttendancesQueryDto } from '../dist/modules/attendance/dto/list-attendances.dto.js';
import { UpdateAttendanceStatusDto } from '../dist/modules/attendance/dto/update-attendance-status.dto.js';

test('DTO da listagem aceita período e filtros tipados', async () => {
  const input = plainToInstance(ListAttendancesQueryDto, {
    from: '2026-10-01',
    occurrence: 'realizado',
    resolutionStatus: 'em_tratativa',
    to: '2026-10-31',
  });
  const errors = await validate(input, { forbidNonWhitelisted: true, whitelist: true });

  assert.equal(errors.length, 0);
});

test('DTO da transição exige classificação válida e motivo não vazio', async () => {
  const invalid = plainToInstance(UpdateAttendanceStatusDto, {
    changeReason: '   ',
    resolutionStatus: 'reaberto',
  });
  const errors = await validate(invalid, { forbidNonWhitelisted: true, whitelist: true });

  assert.ok(errors.some((error) => error.property === 'changeReason'));
  assert.ok(errors.some((error) => error.property === 'resolutionStatus'));
});
