import assert from 'node:assert/strict';
import test from 'node:test';
import { Op } from 'sequelize';
import { AppointmentsService } from '../dist/modules/appointments/appointments.service.js';

function createService() {
  const availability = {
    endsAt: new Date('2099-10-03T16:00:00.000Z'),
    id: 10,
    professorId: 8,
    startsAt: new Date('2099-10-03T12:00:00.000Z'),
  };
  const appointmentModel = {
    findAll: async () => [
      {
        availabilityId: 10,
        endsAt: new Date('2099-10-03T14:00:00.000Z'),
        startsAt: new Date('2099-10-03T13:00:00.000Z'),
      },
    ],
  };
  const availabilityModel = { findAll: async () => [availability] };
  const availabilityModalityModel = {
    findAll: async () => [
      { availabilityId: 10, modalityOptionItemId: 21 },
      { availabilityId: 10, modalityOptionItemId: 22 },
    ],
  };
  const systemOptionItemModel = {
    findAll: async () => [
      { id: 21, value: 'presencial' },
      { id: 22, value: 'online' },
    ],
  };
  const userModel = {
    findAll: async () => [{ id: 8, name: 'Professor Teste' }],
  };
  const institutionDateTime = {
    localToUtc: (date, time) => new Date(`${date}T${time}:00.000-04:00`),
  };
  const sequelize = { transaction: async (callback) => callback({ LOCK: { UPDATE: 'UPDATE' } }) };
  const notificationsService = { attemptAppointmentConfirmation: async () => undefined };

  return new AppointmentsService(
    appointmentModel,
    availabilityModel,
    availabilityModalityModel,
    systemOptionItemModel,
    userModel,
    sequelize,
    institutionDateTime,
    notificationsService,
  );
}

test('consulta disponibilidade sem expor reservas e desconta os intervalos ocupados', async () => {
  const service = createService();
  const response = await service.listAvailability({
    from: '2099-10-03',
    modality: 'online',
    to: '2099-10-03',
  });

  assert.equal(response.availabilities.length, 1);
  assert.deepEqual(response.availabilities[0].professor, {
    id: 8,
    name: 'Professor Teste',
  });
  assert.deepEqual(response.availabilities[0].modalities, ['presencial', 'online']);
  assert.deepEqual(response.availabilities[0].freeIntervals, [
    {
      endsAt: '2099-10-03T13:00:00.000Z',
      startsAt: '2099-10-03T12:00:00.000Z',
    },
    {
      endsAt: '2099-10-03T16:00:00.000Z',
      startsAt: '2099-10-03T14:00:00.000Z',
    },
  ]);
  assert.equal(JSON.stringify(response).includes('studentId'), false);
});

test('rejeita intervalo de consulta invertido', async () => {
  const service = createService();

  await assert.rejects(
    service.listAvailability({ from: '2099-10-04', to: '2099-10-03' }),
    /data final deve ser igual ou posterior/,
  );
});

test('administrador consulta agendamentos globais sem campos internos', async () => {
  const appointmentModel = {
    findAll: async () => [
      {
        availabilityId: 10,
        endsAt: new Date('2099-10-03T15:00:00.000Z'),
        id: 30,
        modalityOptionItemId: 22,
        protocol: 'AG-2099-0001',
        startsAt: new Date('2099-10-03T14:00:00.000Z'),
        status: 'confirmado',
        studentId: 4,
        subject: 'Orientação acadêmica',
      },
    ],
  };
  const availabilityModel = {
    unscoped: () => ({ findAll: async () => [{ id: 10, professorId: 8 }] }),
  };
  const userModel = {
    unscoped: () => ({
      findAll: async () => [
        { id: 4, name: 'Aluno Teste' },
        { id: 8, name: 'Professor Teste' },
      ],
    }),
  };
  const service = new AppointmentsService(
    appointmentModel,
    availabilityModel,
    { findAll: async () => [] },
    { findAll: async () => [{ id: 22, value: 'online' }] },
    userModel,
    { transaction: async (callback) => callback({ LOCK: { UPDATE: 'UPDATE' } }) },
    { localToUtc: (date, time) => new Date(`${date}T${time}:00.000-04:00`) },
    { attemptAppointmentConfirmation: async () => undefined },
  );

  const response = await service.listAll({ from: '2099-10-01', to: '2099-10-31' });

  assert.deepEqual(response.appointments[0], {
    cancelledAt: null,
    cancellationReason: undefined,
    endsAt: '2099-10-03T15:00:00.000Z',
    id: 30,
    modality: 'online',
    professor: { id: 8, name: 'Professor Teste' },
    protocol: 'AG-2099-0001',
    startsAt: '2099-10-03T14:00:00.000Z',
    status: 'confirmado',
    student: { id: 4, name: 'Aluno Teste' },
    subject: 'Orientação acadêmica',
  });
  assert.equal(JSON.stringify(response).includes('details'), false);
});

test('aluno consulta somente os próprios próximos agendamentos', async () => {
  let receivedOptions;
  const appointmentModel = {
    findAndCountAll: async (options) => {
      receivedOptions = options;
      return {
        count: 1,
        rows: [
          {
            availabilityId: 10,
            cancelledAt: null,
            cancellationReason: null,
            details: 'Levar histórico acadêmico.',
            endsAt: new Date('2099-10-03T15:00:00.000Z'),
            id: 30,
            modalityOptionItemId: 22,
            protocol: 'AG-2099-0001',
            startsAt: new Date('2099-10-03T14:00:00.000Z'),
            status: 'confirmado',
            subject: 'Orientação acadêmica',
          },
        ],
      };
    },
  };
  const service = new AppointmentsService(
    appointmentModel,
    {
      unscoped: () => ({ findAll: async () => [{ id: 10, professorId: 8 }] }),
    },
    { findAll: async () => [] },
    { findAll: async () => [{ id: 22, value: 'online' }] },
    {
      unscoped: () => ({ findAll: async () => [{ id: 8, name: 'Professor Teste' }] }),
    },
    { transaction: async (callback) => callback({ LOCK: { UPDATE: 'UPDATE' } }) },
    { localToUtc: (date, time) => new Date(`${date}T${time}:00.000-04:00`) },
    { attemptAppointmentConfirmation: async () => undefined },
  );

  const response = await service.listMine({ page: 1, pageSize: 8, scope: 'upcoming' }, 4);
  const conditions = receivedOptions.where[Op.and];

  assert.deepEqual(conditions[0], { studentId: 4 });
  assert.equal(receivedOptions.limit, 8);
  assert.equal(receivedOptions.offset, 0);
  assert.equal(response.total, 1);
  assert.equal(response.appointments[0].professor.name, 'Professor Teste');
  assert.equal(JSON.stringify(response).includes('studentId'), false);
});

test('consulta mensal dos próprios agendamentos exige um período completo e limitado', async () => {
  const service = createService();

  await assert.rejects(service.listMine({ from: '2099-10-01' }, 4), /datas inicial e final/);
  await assert.rejects(
    service.listMine({ from: '2099-01-01', to: '2099-04-01' }, 4),
    /no máximo 62 dias/,
  );
});

function createBookingService({
  appointmentFindOne = async () => null,
  availabilityState = 'ativa',
  notification,
} = {}) {
  const transaction = { LOCK: { UPDATE: 'UPDATE' }, id: 'booking-transaction' };
  const calls = { appointmentCreate: [], availabilityLock: [], notification: [] };
  let transactionFinished = false;
  const appointmentModel = {
    create: async (values, options) => {
      calls.appointmentCreate.push([values, options]);
      return { id: 30, ...values };
    },
    findOne: appointmentFindOne,
  };
  const availabilityModel = {
    findByPk: async (_id, options) => {
      calls.availabilityLock.push(options);
      return {
        endsAt: new Date('2099-10-03T16:00:00.000Z'),
        id: 10,
        professorId: 8,
        startsAt: new Date('2099-10-03T12:00:00.000Z'),
        state: availabilityState,
      };
    },
  };
  const availabilityModalityModel = {
    findAll: async () => [{ modalityOptionItemId: 22 }],
  };
  const systemOptionItemModel = {
    findOne: async () => ({ id: 22, value: 'online' }),
  };
  const userModel = {
    unscoped: () => ({
      findByPk: async (id, options) =>
        id === 4
          ? { id: 4, isActive: true, phone: '69999999999', options }
          : {
              id: 8,
              isActive: true,
              name: 'Professor Teste',
              options,
              userType: 'professor',
            },
    }),
  };
  const sequelize = {
    transaction: async (callback) => {
      const result = await callback(transaction);
      transactionFinished = true;
      return result;
    },
  };
  const notificationsService = {
    attemptAppointmentConfirmation: async (input) => {
      calls.notification.push({ input, transactionFinished });
      if (notification) return notification(input);
    },
  };
  const service = new AppointmentsService(
    appointmentModel,
    availabilityModel,
    availabilityModalityModel,
    systemOptionItemModel,
    userModel,
    sequelize,
    { localToUtc: (date, time) => new Date(`${date}T${time}:00.000-04:00`) },
    notificationsService,
  );

  return { calls, service, transaction };
}

const validBooking = {
  availabilityId: 10,
  details: 'Levar histórico acadêmico.',
  endsAt: '2099-10-03T15:00:00.000Z',
  modality: 'online',
  startsAt: '2099-10-03T14:00:00.000Z',
  subject: 'Orientação acadêmica',
};

test('confirma agendamento em transação e notifica somente depois do commit', async () => {
  const { calls, service, transaction } = createBookingService();
  const response = await service.create(validBooking, 4);

  assert.equal(response.message, 'Agendamento confirmado com sucesso.');
  assert.equal(response.appointment.id, 30);
  assert.equal(response.appointment.protocol.startsWith('AG-'), true);
  assert.deepEqual(response.appointment.professor, { id: 8, name: 'Professor Teste' });
  assert.equal(calls.appointmentCreate.length, 1);
  assert.equal(calls.appointmentCreate[0][1].transaction, transaction);
  assert.equal(calls.availabilityLock[0].lock, transaction.LOCK.UPDATE);
  assert.equal(calls.notification.length, 1);
  assert.equal(calls.notification[0].transactionFinished, true);
  assert.equal(calls.notification[0].input.appointmentId, 30);
});

test('falha de notificação não desfaz nem transforma a confirmação em erro', async () => {
  const { calls, service } = createBookingService({
    notification: async () => {
      throw new Error('provider unavailable');
    },
  });

  const response = await service.create(validBooking, 4);

  assert.equal(response.appointment.status, 'confirmado');
  assert.equal(calls.appointmentCreate.length, 1);
  assert.equal(calls.notification.length, 1);
});

test('rejeita reserva em disponibilidade bloqueada', async () => {
  const { calls, service } = createBookingService({ availabilityState: 'bloqueada' });

  await assert.rejects(service.create(validBooking, 4), /não está mais ativa/);
  assert.equal(calls.appointmentCreate.length, 0);
  assert.equal(calls.notification.length, 0);
});

test('rejeita sobreposição na disponibilidade sem criar novo registro', async () => {
  const { calls, service } = createBookingService({
    appointmentFindOne: async () => ({ id: 99 }),
  });

  await assert.rejects(service.create(validBooking, 4), /acabou de ser reservado/);
  assert.equal(calls.appointmentCreate.length, 0);
  assert.equal(calls.notification.length, 0);
});

test('duas confirmações concorrentes reservam o mesmo intervalo somente uma vez', async () => {
  const appointments = [];
  let locked = false;
  const waiters = [];

  async function acquire() {
    if (!locked) {
      locked = true;
      return;
    }
    await new Promise((resolve) => waiters.push(resolve));
    locked = true;
  }

  function release() {
    locked = false;
    waiters.shift()?.();
  }

  const service = new AppointmentsService(
    {
      create: async (values) => {
        const appointment = { id: appointments.length + 1, ...values };
        appointments.push(appointment);
        return appointment;
      },
      findOne: async ({ where }) =>
        appointments.find(
          (item) =>
            item.status === 'confirmado' &&
            (!where.availabilityId || item.availabilityId === where.availabilityId),
        ) ?? null,
    },
    {
      findByPk: async (_id, { transaction }) => {
        await acquire();
        transaction.release = release;
        return {
          endsAt: new Date('2099-10-03T16:00:00.000Z'),
          id: 10,
          professorId: 8,
          startsAt: new Date('2099-10-03T12:00:00.000Z'),
          state: 'ativa',
        };
      },
    },
    { findAll: async () => [{ modalityOptionItemId: 22 }] },
    { findOne: async () => ({ id: 22, value: 'online' }) },
    {
      unscoped: () => ({
        findByPk: async (id) =>
          id === 4
            ? { id, isActive: true, phone: '69999999999' }
            : { id, isActive: true, name: 'Professor Teste', userType: 'professor' },
      }),
    },
    {
      transaction: async (callback) => {
        const transaction = { LOCK: { UPDATE: 'UPDATE' }, release: null };
        try {
          return await callback(transaction);
        } finally {
          transaction.release?.();
        }
      },
    },
    { localToUtc: (date, time) => new Date(`${date}T${time}:00.000-04:00`) },
    { attemptAppointmentConfirmation: async () => undefined },
  );

  const results = await Promise.allSettled([
    service.create(validBooking, 4),
    service.create(validBooking, 5),
  ]);

  assert.equal(results.filter(({ status }) => status === 'fulfilled').length, 1);
  assert.equal(results.filter(({ status }) => status === 'rejected').length, 1);
  assert.equal(appointments.length, 1);
});

function createCancellationService({
  actor = { id: 4, isActive: true, passwordHash: 'hash', userType: 'aluno' },
  appointmentOverrides = {},
  passwordMatches = true,
  professorId = 8,
} = {}) {
  const transaction = { LOCK: { UPDATE: 'UPDATE' } };
  const updates = [];
  const appointment = {
    availabilityId: 10,
    id: 30,
    startsAt: new Date(Date.now() + 3 * 60 * 60 * 1000),
    status: 'confirmado',
    studentId: 4,
    update: async (values, options) => {
      updates.push({ options, values });
      Object.assign(appointment, values);
    },
    ...appointmentOverrides,
  };
  const service = new AppointmentsService(
    { findByPk: async () => appointment },
    {
      unscoped: () => ({
        findByPk: async () => ({ id: 10, professorId }),
      }),
    },
    {},
    {},
    {
      unscoped: () => ({ findByPk: async () => actor }),
    },
    { transaction: async (callback) => callback(transaction) },
    {},
    {},
    { matches: async () => passwordMatches },
  );

  return { appointment, service, transaction, updates };
}

test('aluno cancela o próprio agendamento com antecedência e registra auditoria', async () => {
  const { service, transaction, updates } = createCancellationService();

  const response = await service.cancelMine(30, '  Imprevisto acadêmico.  ', 4);

  assert.equal(response.appointment.status, 'cancelado');
  assert.equal(response.appointment.cancelledBy, 4);
  assert.equal(response.appointment.cancellationReason, 'Imprevisto acadêmico.');
  assert.equal(updates[0].values.updatedBy, 4);
  assert.equal(updates[0].options.transaction, transaction);
});

test('aluno e professor não cancelam com menos de duas horas', async () => {
  const { service } = createCancellationService({
    appointmentOverrides: { startsAt: new Date(Date.now() + 90 * 60 * 1000) },
  });

  await assert.rejects(
    service.cancelMine(30, 'Imprevisto.', 4),
    /pelo menos 2 horas de antecedência/,
  );
  await assert.rejects(
    service.cancelAssigned(30, 'Imprevisto.', 8),
    /pelo menos 2 horas de antecedência/,
  );
});

test('professor não cancela agendamento atribuído a outro professor', async () => {
  const { service } = createCancellationService({ professorId: 9 });

  await assert.rejects(service.cancelAssigned(30, 'Conflito de agenda.', 8), /não encontrado/);
});

test('administrador cancela dentro de duas horas somente após validar a própria senha', async () => {
  const actor = {
    id: 1,
    isActive: true,
    passwordHash: 'hash',
    userType: 'administrador',
  };
  const allowed = createCancellationService({
    actor,
    appointmentOverrides: { startsAt: new Date(Date.now() + 30 * 60 * 1000) },
  });
  const response = await allowed.service.cancelAny(30, 'Correção administrativa.', 1, 'senha');
  assert.equal(response.appointment.cancelledBy, 1);

  const denied = createCancellationService({ actor, passwordMatches: false });
  await assert.rejects(
    denied.service.cancelAny(30, 'Correção administrativa.', 1, 'incorreta'),
    /Senha de confirmação inválida/,
  );
});
