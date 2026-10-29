import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEMO_EMAIL_DOMAIN,
  buildDemoPlan,
  fictitiousCpf,
  institutionDateTime,
  readDemoSeedInput,
  seedDemoData,
  shiftBusinessDays,
} from '../dist/database/database.demo-seed.js';

// Quarta-feira, 10h no horário de Porto Velho.
const TODAY = '2026-10-28';
const NOW_TIME = '10:00';

function isValidCpf(cpf) {
  const digit = (digits, weight) => {
    const sum = [...digits].reduce((total, value, index) => total + Number(value) * (weight - index), 0);
    const remainder = (sum * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  };
  const first = digit(cpf.slice(0, 9), 10);
  const second = digit(cpf.slice(0, 10), 11);
  return Number(cpf[9]) === first && Number(cpf[10]) === second;
}

function minutes(time) {
  const [hour, minute] = time.split(':').map(Number);
  return hour * 60 + minute;
}

function absolute(date, time) {
  return `${date}T${time}`;
}

test('contas de demonstração usam somente identidades fictícias', () => {
  const { users } = buildDemoPlan(TODAY, NOW_TIME);

  assert.equal(users.length, 6);
  assert.deepEqual(
    users.map(({ userType }) => userType).sort(),
    ['administrador', 'aluno', 'aluno', 'aluno', 'professor', 'professor'],
  );
  for (const user of users) {
    assert.ok(user.email.endsWith(`@${DEMO_EMAIL_DOMAIN}`), user.email);
    assert.match(user.cpf, /^\d{11}$/);
    assert.equal(isValidCpf(user.cpf), false, `CPF ${user.cpf} não pode ser válido`);
    assert.match(user.phone, /^\d{2}0\d{7}$/);
    assert.equal(user.registrationNumber !== null, user.userType === 'aluno');
    assert.equal(user.periodValue !== null, user.userType === 'aluno');
  }
  assert.equal(new Set(users.map(({ cpf }) => cpf)).size, users.length);
  assert.equal(new Set(users.map(({ email }) => email)).size, users.length);
});

test('CPF fictício falha no dígito verificador para qualquer índice', () => {
  for (let index = 0; index < 200; index += 1) {
    assert.equal(isValidCpf(fictitiousCpf(index)), false);
  }
});

test('dias úteis ignoram fim de semana nos dois sentidos', () => {
  assert.equal(shiftBusinessDays('2026-10-30', 1), '2026-11-02');
  assert.equal(shiftBusinessDays('2026-11-02', -1), '2026-10-30');
  assert.equal(shiftBusinessDays(TODAY, 0), TODAY);
});

test('agendamentos respeitam janela, modalidade e ausência de sobreposição', () => {
  const { appointments, availabilities } = buildDemoPlan(TODAY, NOW_TIME);
  const availabilityByKey = new Map(availabilities.map((item) => [item.key, item]));
  const active = appointments.filter(({ outcome }) => outcome.kind !== 'cancelado');

  for (const appointment of appointments) {
    const availability = availabilityByKey.get(appointment.availability);
    assert.ok(availability, `disponibilidade ${appointment.availability}`);
    assert.equal(availability.state, 'ativa');
    assert.ok(availability.modalities.includes(appointment.modality));
    assert.ok(minutes(appointment.startTime) >= minutes(availability.startTime));
    assert.ok(minutes(appointment.endTime) <= minutes(availability.endTime));
    assert.ok(minutes(appointment.startTime) < minutes(appointment.endTime));
  }

  const overlaps = (first, second) => {
    const firstDate = availabilityByKey.get(first.availability).date;
    const secondDate = availabilityByKey.get(second.availability).date;
    return (
      absolute(firstDate, first.startTime) < absolute(secondDate, second.endTime) &&
      absolute(secondDate, second.startTime) < absolute(firstDate, first.endTime)
    );
  };
  for (const [index, first] of active.entries()) {
    for (const second of active.slice(index + 1)) {
      if (first.availability === second.availability) {
        assert.equal(overlaps(first, second), false, 'reserva dupla na mesma disponibilidade');
      }
      if (first.student === second.student) {
        assert.equal(overlaps(first, second), false, `${first.student} com compromissos sobrepostos`);
      }
    }
  }
});

test('estados acompanham o tempo e cobrem todas as classificações', () => {
  const { appointments, availabilities } = buildDemoPlan(TODAY, NOW_TIME);
  const dateOf = new Map(availabilities.map((item) => [item.key, item.date]));
  const now = absolute(TODAY, NOW_TIME);

  for (const availability of availabilities) {
    const weekday = new Date(`${availability.date}T12:00:00.000Z`).getUTCDay();
    if (availability.date !== TODAY) assert.ok(weekday !== 0 && weekday !== 6);
    assert.ok(availability.date === TODAY ? availability.startTime > NOW_TIME : true);
  }

  const finalStatuses = new Set();
  for (const appointment of appointments) {
    const startsAt = absolute(dateOf.get(appointment.availability), appointment.startTime);
    const { outcome } = appointment;

    if (outcome.kind === 'realizado' || outcome.kind === 'ausencia') {
      assert.ok(startsAt < now, 'atendimento registrado só depois do início');
    }
    if (startsAt > now) assert.equal(outcome.kind, 'confirmado');
    if (outcome.kind === 'realizado') {
      const final = outcome.steps.at(-1);
      finalStatuses.add(final.status);
      assert.equal(outcome.steps[0].reason, 'Registro inicial do atendimento.');
      for (const step of outcome.steps.slice(0, -1)) assert.equal(step.status, 'em_tratativa');
      if (final.status === 'resolvido') assert.ok(final.solution || final.referral);
      if (final.status === 'nao_resolvido') assert.ok(final.unresolvedReason);
      if (final.status === 'em_tratativa') {
        assert.ok(final.continuityResponsible && final.nextStep);
        assert.ok(final.dueDate >= TODAY, 'prazo da tratativa não pode estar no passado');
      }
    }
  }

  assert.deepEqual([...finalStatuses].sort(), ['em_tratativa', 'nao_resolvido', 'resolvido']);
  const kinds = new Set(appointments.map(({ outcome }) => outcome.kind));
  assert.deepEqual([...kinds].sort(), ['ausencia', 'cancelado', 'confirmado', 'realizado']);
  assert.ok(
    appointments.some(
      ({ availability, outcome, startTime }) =>
        outcome.kind === 'confirmado' && absolute(dateOf.get(availability), startTime) < now,
    ),
    'deve existir um atendimento passado aguardando registro',
  );
});

test('compromisso de hoje só aparece quando ainda cabe uma janela no dia', () => {
  const morning = buildDemoPlan(TODAY, '10:00');
  const night = buildDemoPlan(TODAY, '21:30');

  assert.ok(morning.availabilities.some(({ date }) => date === TODAY));
  assert.equal(
    night.availabilities.some(({ date }) => date === TODAY),
    false,
  );
});

test('horário institucional converte o instante para data e hora locais', () => {
  assert.deepEqual(institutionDateTime(new Date('2026-10-28T23:30:00.000Z'), 'America/Porto_Velho'), {
    date: '2026-10-28',
    time: '19:30',
  });
});

test('seed exige confirmação explícita e senha com tamanho válido', () => {
  assert.throws(() => readDemoSeedInput({ DEMO_SEED_PASSWORD: 'senha-demo' }), /DEMO_SEED_ENABLED/);
  assert.throws(
    () => readDemoSeedInput({ DEMO_SEED_ENABLED: 'true', DEMO_SEED_PASSWORD: 'curta' }),
    /DEMO_SEED_PASSWORD/,
  );
  assert.deepEqual(
    readDemoSeedInput({ DEMO_SEED_ENABLED: 'true', DEMO_SEED_PASSWORD: 'senha-demo' }),
    { password: 'senha-demo' },
  );
});

test('seed não altera nada quando a demonstração está ligada a contas reais', async () => {
  const statements = [];
  const writes = [];
  const sequelize = {
    getQueryInterface: () => ({
      bulkInsert: async (...args) => writes.push(['insert', ...args]),
      bulkUpdate: async (...args) => writes.push(['update', ...args]),
    }),
    query: async (sql) => {
      statements.push(sql);
      if (/FROM users WHERE email LIKE/.test(sql)) return [{ id: 50 }];
      if (/COUNT\(\*\) AS total/.test(sql)) return [{ total: 1 }];
      return [];
    },
    transaction: async (callback) => callback({ LOCK: { UPDATE: 'UPDATE' } }),
  };

  await assert.rejects(
    seedDemoData(
      sequelize,
      { password: 'senha-demo' },
      { now: new Date('2026-10-28T14:00:00.000Z'), toUtc: () => new Date() },
      { date: TODAY, time: NOW_TIME },
      { hash: async () => '$argon2id$demo' },
    ),
    /nothing was changed/,
  );
  assert.equal(writes.length, 0);
  assert.equal(
    statements.some((sql) => /^\s*DELETE/i.test(sql)),
    false,
  );
});
