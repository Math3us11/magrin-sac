import 'reflect-metadata';
import assert from 'node:assert/strict';
import test from 'node:test';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { DashboardQueryDto } from '../dist/modules/dashboard/dto/dashboard-query.dto.js';

test('DTO do dashboard exige período no formato de data institucional', async () => {
  const valid = plainToInstance(DashboardQueryDto, {
    from: '2026-10-01',
    to: '2026-10-31',
  });
  const invalid = plainToInstance(DashboardQueryDto, {
    from: '01/10/2026',
    to: '31/10/2026',
  });

  assert.equal((await validate(valid, { forbidNonWhitelisted: true, whitelist: true })).length, 0);
  assert.equal(
    (await validate(invalid, { forbidNonWhitelisted: true, whitelist: true })).length,
    2,
  );
});
