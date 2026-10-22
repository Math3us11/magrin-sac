import assert from 'node:assert/strict';
import test from 'node:test';
import { AttendanceService } from '../dist/modules/attendance/attendance.service.js';

function createService({
  appointmentOverrides = {},
  existingAttendance = null,
  professorId = 8,
} = {}) {
  const transaction = { LOCK: { UPDATE: 'UPDATE' } };
  const attendanceCreates = [];
  const historyCreates = [];
  const appointmentUpdates = [];
  const appointment = {
    availabilityId: 10,
    id: 30,
    startsAt: new Date(Date.now() - 60_000),
    status: 'confirmado',
    update: async (values, options) => {
      appointmentUpdates.push({ options, values });
      Object.assign(appointment, values);
    },
    ...appointmentOverrides,
  };
  const service = new AttendanceService(
    { findByPk: async () => appointment },
    {
      unscoped: () => ({ findByPk: async () => ({ id: 10, professorId }) }),
    },
    {
      create: async (values, options) => {
        attendanceCreates.push({ options, values });
        return { id: 40, ...values };
      },
      findOne: async () => existingAttendance,
    },
    {
      create: async (values, options) => historyCreates.push({ options, values }),
    },
    {},
    {},
    { transaction: async (callback) => callback(transaction) },
    { timeZone: 'America/Porto_Velho' },
  );
  return { appointmentUpdates, attendanceCreates, historyCreates, service, transaction };
}

test('professor registra atendimento resolvido e conclui agendamento na mesma transação', async () => {
  const state = createService();
  const response = await state.service.registerAssigned(
    30,
    {
      internalNotes: '  Registro interno. ',
      occurrence: 'realizado',
      resolutionStatus: 'resolvido',
      solution: '  Orientação concluída. ',
    },
    8,
  );

  assert.equal(response.attendance.resolutionStatus, 'resolvido');
  assert.equal(state.attendanceCreates[0].values.internalNotes, 'Registro interno.');
  assert.equal(state.attendanceCreates[0].options.transaction, state.transaction);
  assert.equal(state.historyCreates[0].values.createdBy, 8);
  assert.equal(state.appointmentUpdates[0].values.status, 'concluido');
  assert.equal(state.appointmentUpdates[0].options.transaction, state.transaction);
});

test('ausência não aceita classificação e atualiza o agendamento como ausência', async () => {
  const invalid = createService();
  await assert.rejects(
    invalid.service.registerAny(
      30,
      { occurrence: 'ausencia', resolutionStatus: 'resolvido', solution: 'Não aplicável.' },
      1,
    ),
    /não possui classificação/,
  );

  const valid = createService();
  await valid.service.registerAny(30, { occurrence: 'ausencia' }, 1);
  assert.equal(valid.appointmentUpdates[0].values.status, 'ausencia');
});

test('rejeita registro antecipado, duplicado ou fora da atribuição do professor', async () => {
  await assert.rejects(
    createService({
      appointmentOverrides: { startsAt: new Date(Date.now() + 60_000) },
    }).service.registerAssigned(
      30,
      { occurrence: 'realizado', resolutionStatus: 'resolvido', solution: 'Concluído.' },
      8,
    ),
    /após o horário inicial/,
  );
  await assert.rejects(
    createService({ existingAttendance: { id: 40 } }).service.registerAssigned(
      30,
      { occurrence: 'realizado', resolutionStatus: 'resolvido', solution: 'Concluído.' },
      8,
    ),
    /já foi registrado/,
  );
  await assert.rejects(
    createService({ professorId: 9 }).service.registerAssigned(
      30,
      { occurrence: 'realizado', resolutionStatus: 'resolvido', solution: 'Concluído.' },
      8,
    ),
    /não encontrado/,
  );
});

test('em tratativa exige responsável, próximo passo e prazo não passado', async () => {
  const service = createService().service;
  await assert.rejects(
    service.registerAny(30, { occurrence: 'realizado', resolutionStatus: 'em_tratativa' }, 1),
    /responsável, próximo passo e prazo/,
  );
  await assert.rejects(
    service.registerAny(
      30,
      {
        continuityResponsible: 'Coordenação',
        dueDate: '2000-01-01',
        nextStep: 'Analisar documentos.',
        occurrence: 'realizado',
        resolutionStatus: 'em_tratativa',
      },
      1,
    ),
    /não pode estar no passado/,
  );
  await assert.rejects(
    service.registerAny(
      30,
      {
        continuityResponsible: 'Coordenação',
        dueDate: '2099-02-31',
        nextStep: 'Analisar documentos.',
        occurrence: 'realizado',
        resolutionStatus: 'em_tratativa',
      },
      1,
    ),
    /prazo válido/,
  );
});

test('não resolvido exige justificativa explícita', async () => {
  const service = createService().service;
  await assert.rejects(
    service.registerAny(30, { occurrence: 'realizado', resolutionStatus: 'nao_resolvido' }, 1),
    /justificativa/,
  );
});

test('histórico atribuído retorna ator e data sem liberar atendimento de outro professor', async () => {
  const historyRows = [
    {
      changedAt: new Date('2026-10-15T14:00:00.000Z'),
      changeReason: 'Registro inicial do atendimento.',
      createdBy: 8,
      id: 50,
      occurrence: 'realizado',
      resolutionStatus: 'resolvido',
    },
  ];
  const createHistoryService = (professorId) =>
    new AttendanceService(
      { findByPk: async () => ({ availabilityId: 10 }) },
      { unscoped: () => ({ findByPk: async () => ({ professorId }) }) },
      { findByPk: async () => ({ appointmentId: 30, id: 40 }) },
      { findAll: async () => historyRows },
      {},
      {
        unscoped: () => ({ findAll: async () => [{ id: 8, name: 'Professor Teste' }] }),
      },
      {},
      { timeZone: 'America/Porto_Velho' },
    );

  const response = await createHistoryService(8).listAssignedHistory(40, 8);
  assert.deepEqual(response.history[0].actor, { id: 8, name: 'Professor Teste' });
  assert.equal(response.history[0].changedAt, '2026-10-15T14:00:00.000Z');
  await assert.rejects(createHistoryService(9).listAssignedHistory(40, 8), /não encontrado/);
});

function createTransitionService({
  occurrence = 'realizado',
  resolutionStatus = 'em_tratativa',
} = {}) {
  const transaction = { LOCK: { UPDATE: 'UPDATE' } };
  const historyCreates = [];
  const updates = [];
  const attendance = {
    appointmentId: 30,
    id: 40,
    internalNotes: 'Nota original',
    occurrence,
    resolutionStatus,
    update: async (values, options) => {
      updates.push({ options, values });
      Object.assign(attendance, values);
    },
  };
  const service = new AttendanceService(
    {
      findByPk: async (_id, options) =>
        options?.attributes?.length === 1
          ? { availabilityId: 10 }
          : { availabilityId: 10, id: 30, startsAt: new Date(), status: 'concluido' },
    },
    { unscoped: () => ({ findByPk: async () => ({ id: 10, professorId: 8 }) }) },
    {
      findByPk: async (_id, options) => (options?.attributes ? { appointmentId: 30 } : attendance),
    },
    { create: async (values, options) => historyCreates.push({ options, values }) },
    {},
    {},
    { transaction: async (callback) => callback(transaction) },
    { timeZone: 'America/Porto_Velho' },
  );
  return { attendance, historyCreates, service, transaction, updates };
}

test('evolução da tratativa atualiza status e histórico na mesma transação', async () => {
  const state = createTransitionService();
  const response = await state.service.updateAssignedStatus(
    40,
    {
      changeReason: 'Orientação concluída após retorno do setor.',
      resolutionStatus: 'resolvido',
      solution: 'Pendência regularizada.',
    },
    8,
  );

  assert.equal(response.attendance.resolutionStatus, 'resolvido');
  assert.equal(state.updates[0].values.solution, 'Pendência regularizada.');
  assert.equal(state.updates[0].options.transaction, state.transaction);
  assert.equal(
    state.historyCreates[0].values.changeReason,
    'Orientação concluída após retorno do setor.',
  );
  assert.equal(state.historyCreates[0].options.transaction, state.transaction);
});

test('ausência e classificação final não podem ser reabertas', async () => {
  await assert.rejects(
    createTransitionService().service.updateAnyStatus(
      40,
      { changeReason: '   ', resolutionStatus: 'em_tratativa' },
      1,
    ),
    /motivo da alteração/,
  );
  await assert.rejects(
    createTransitionService({
      occurrence: 'ausencia',
      resolutionStatus: null,
    }).service.updateAnyStatus(
      40,
      { changeReason: 'Tentativa inválida.', resolutionStatus: 'em_tratativa' },
      1,
    ),
    /ausência não possui tratativa/,
  );
  await assert.rejects(
    createTransitionService({ resolutionStatus: 'resolvido' }).service.updateAnyStatus(
      40,
      { changeReason: 'Tentativa inválida.', resolutionStatus: 'em_tratativa' },
      1,
    ),
    /não pode ser reaberta/,
  );
});

test('listagem do professor restringe disponibilidades e retorna somente dados operacionais', async () => {
  const availabilityQueries = [];
  const service = new AttendanceService(
    {
      findAll: async () => [
        {
          availabilityId: 10,
          endsAt: new Date('2026-10-15T15:00:00.000Z'),
          id: 30,
          modalityOptionItemId: 5,
          protocol: 'AG-20261015-ABCDEF',
          startsAt: new Date('2026-10-15T14:00:00.000Z'),
          studentId: 9,
          subject: 'Orientação',
        },
      ],
    },
    {
      unscoped: () => ({
        findAll: async (options) => {
          availabilityQueries.push(options);
          return options.where.professorId ? [{ id: 10 }] : [{ id: 10, professorId: 8 }];
        },
      }),
    },
    {
      findAll: async () => [
        {
          appointmentId: 30,
          continuityResponsible: 'Coordenação',
          dueDate: '2026-10-20',
          id: 40,
          occurrence: 'realizado',
          recordedAt: new Date('2026-10-15T15:00:00.000Z'),
          resolutionStatus: 'em_tratativa',
          updatedAt: new Date('2026-10-15T15:00:00.000Z'),
        },
      ],
    },
    {},
    { findAll: async () => [{ id: 5, value: 'online' }] },
    {
      unscoped: () => ({
        findAll: async () => [
          { id: 8, name: 'Professor Teste' },
          { id: 9, name: 'Aluno Teste' },
        ],
      }),
    },
    {},
    {
      localToUtc: (date, time) => new Date(`${date}T${time}:00.000Z`),
      timeZone: 'America/Porto_Velho',
    },
  );

  const response = await service.listAssigned(
    { from: '2026-10-01', resolutionStatus: 'em_tratativa', to: '2026-10-31' },
    8,
  );

  assert.equal(availabilityQueries[0].where.professorId, 8);
  assert.equal(response.attendances[0].appointment.student.name, 'Aluno Teste');
  assert.equal(response.attendances[0].resolutionStatus, 'em_tratativa');
  assert.equal('internalNotes' in response.attendances[0], false);
});
