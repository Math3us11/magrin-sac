import 'reflect-metadata';
import assert from 'node:assert/strict';
import test from 'node:test';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateAvailabilityBatchDto } from '../dist/modules/availability/dto/create-availability.dto.js';

test('DTO aceita lote com modalidades atômicas e horários locais', async () => {
  const input = plainToInstance(CreateAvailabilityBatchDto, {
    items: [
      {
        date: '2099-10-03',
        endTime: '15:00',
        modalities: ['presencial', 'online'],
        startTime: '14:00',
      },
    ],
  });
  const errors = await validate(input, { forbidNonWhitelisted: true, whitelist: true });

  assert.equal(errors.length, 0);
});

test('DTO rejeita modalidade composta ou repetida', async () => {
  const input = plainToInstance(CreateAvailabilityBatchDto, {
    items: [
      {
        date: '2099-10-03',
        endTime: '15:00',
        modalities: ['ambas', 'ambas'],
        startTime: '14:00',
      },
    ],
  });
  const errors = await validate(input, { forbidNonWhitelisted: true, whitelist: true });

  assert.ok(errors.some((error) => error.property === 'items'));
});
