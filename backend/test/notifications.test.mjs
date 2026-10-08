import assert from 'node:assert/strict';
import test from 'node:test';
import {
  down,
  up,
} from '../dist/database/migrations/20261007110000-create-notifications.migration.js';
import { Notification } from '../dist/models/notification.model.js';
import { sequelizeModels } from '../dist/models/index.js';
import { NotificationsService } from '../dist/modules/notifications/notifications.service.js';
import { WhatsAppProviderUnavailableError } from '../dist/modules/notifications/whatsapp-provider.js';

function migrationContext() {
  const calls = [];
  return {
    calls,
    context: {
      addIndex: async (...args) => calls.push(['addIndex', ...args]),
      createTable: async (...args) => calls.push(['createTable', ...args]),
      dropTable: async (...args) => calls.push(['dropTable', ...args]),
    },
  };
}

test('migration cria tentativas de notificação sem persistir o destino completo', async () => {
  const state = migrationContext();
  await up({ context: state.context });

  const createCall = state.calls.find(([operation]) => operation === 'createTable');
  assert.equal(createCall[1], 'notifications');
  assert.equal(createCall[2].appointment_id.references.model, 'appointments');
  assert.equal(Object.hasOwn(createCall[2], 'destination'), false);
  assert.equal(Object.hasOwn(createCall[2], 'destination_hint'), true);
  assert.ok(sequelizeModels.includes(Notification));

  await down({ context: state.context });
  assert.deepEqual(state.calls.at(-1), ['dropTable', 'notifications']);
});

test('falha do provider é registrada com código sanitizado e telefone mascarado', async () => {
  const updates = [];
  const creates = [];
  const notificationModel = {
    create: async (values) => {
      creates.push(values);
      return { update: async (update) => updates.push(update) };
    },
  };
  const service = new NotificationsService(notificationModel, {
    sendAppointmentConfirmation: async () => {
      throw new WhatsAppProviderUnavailableError();
    },
  });

  await assert.rejects(
    service.attemptAppointmentConfirmation({
      actorId: 4,
      appointmentId: 30,
      endsAt: new Date('2099-10-03T15:00:00.000Z'),
      phone: '69999999999',
      professorName: 'Professor Teste',
      protocol: 'AG-20991003-ABCDEF1234',
      startsAt: new Date('2099-10-03T14:00:00.000Z'),
    }),
    /ainda não está configurado/,
  );

  assert.equal(creates[0].destinationHint, '***9999');
  assert.equal(creates[0].status, 'pendente');
  assert.equal(updates[0].status, 'falhou');
  assert.equal(updates[0].errorCode, 'provider_not_configured');
  assert.equal(JSON.stringify(creates).includes('69999999999'), false);
});
