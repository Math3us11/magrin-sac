import { randomBytes } from 'node:crypto';
import { QueryTypes, type Sequelize, type Transaction } from 'sequelize';
import { PasswordHashService } from '../helpers/password/password.service.js';

// Domínio reservado (RFC 6761): nenhum endereço de demonstração pode pertencer a uma pessoa real.
export const DEMO_EMAIL_DOMAIN = 'demo.test';

const MODALITY_OPTION = 'APPOINTMENT_MODALITY';
const ACADEMIC_PERIOD_OPTION = 'ACADEMIC_PERIOD';
const DEMO_COURSE_CODE = 'ciencia-computacao';
const INITIAL_ATTENDANCE_REASON = 'Registro inicial do atendimento.';

type Modality = 'online' | 'presencial';
type ResolutionStatus = 'em_tratativa' | 'nao_resolvido' | 'resolvido';

export type LocalDateTime = { date: string; time: string };

export type DemoUser = {
  birthDate: string;
  cpf: string;
  email: string;
  key: string;
  name: string;
  periodValue: string | null;
  phone: string;
  registrationNumber: string | null;
  userType: 'administrador' | 'aluno' | 'professor';
};

export type DemoAvailability = {
  date: string;
  endTime: string;
  key: string;
  modalities: Modality[];
  professor: string;
  startTime: string;
  state: 'ativa' | 'bloqueada';
};

export type DemoAttendanceStep = {
  at: LocalDateTime;
  continuityResponsible?: string;
  dueDate?: string;
  nextStep?: string;
  reason: string;
  referral?: string;
  solution?: string;
  status: ResolutionStatus;
  unresolvedReason?: string;
};

export type DemoOutcome =
  | { kind: 'ausencia' }
  | { kind: 'cancelado'; reason: string }
  | { kind: 'confirmado' }
  | { internalNotes: string | null; kind: 'realizado'; steps: DemoAttendanceStep[] };

export type DemoAppointment = {
  availability: string;
  details: string | null;
  endTime: string;
  modality: Modality;
  outcome: DemoOutcome;
  startTime: string;
  student: string;
  subject: string;
};

export type DemoPlan = {
  appointments: DemoAppointment[];
  availabilities: DemoAvailability[];
  users: DemoUser[];
};

export type DemoSeedInput = { password: string };

export type DemoSeedClock = {
  now: Date;
  // Converte data e hora locais da instituição para o instante UTC persistido.
  toUtc: (date: string, time: string) => Date;
};

export type DemoSeedResult = {
  appointments: number;
  availabilities: number;
  users: number;
};

type PasswordHasher = Pick<PasswordHashService, 'hash'>;
type IdRow = { id: number | string };

// CPF com dígito verificador propositalmente inválido: não corresponde a nenhuma pessoa.
export function fictitiousCpf(index: number): string {
  const base = `99999${String(index).padStart(4, '0')}`;
  const digit = (digits: string, weight: number) => {
    const sum = [...digits].reduce((total, value, position) => {
      return total + Number(value) * (weight - position);
    }, 0);
    const remainder = (sum * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  };
  const first = digit(base, 10);
  const second = digit(`${base}${first}`, 11);

  return `${base}${(first + 1) % 10}${second}`;
}

export function shiftBusinessDays(date: string, amount: number): string {
  const current = new Date(`${date}T12:00:00.000Z`);
  const step = Math.sign(amount);
  let remaining = Math.abs(amount);

  while (remaining > 0) {
    current.setUTCDate(current.getUTCDate() + step);
    const weekday = current.getUTCDay();
    if (weekday !== 0 && weekday !== 6) remaining -= 1;
  }

  return current.toISOString().slice(0, 10);
}

function hourLabel(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`;
}

function demoUser(
  index: number,
  key: string,
  name: string,
  localPart: string,
  userType: DemoUser['userType'],
  birthDate: string,
  periodValue: string | null = null,
): DemoUser {
  return {
    birthDate,
    cpf: fictitiousCpf(index),
    email: `${localPart}@${DEMO_EMAIL_DOMAIN}`,
    key,
    name,
    periodValue,
    // DDD seguido de 0 não é um número atribuível no plano de numeração brasileiro.
    phone: `6900000${String(index).padStart(3, '0')}`,
    registrationNumber: userType === 'aluno' ? `99000000${String(index).padStart(4, '0')}` : null,
    userType,
  };
}

/**
 * Monta a demonstração em horário local da instituição, relativa ao dia informado.
 * A função é pura para que os invariantes de domínio possam ser verificados em teste.
 */
export function buildDemoPlan(today: string, nowTime: string): DemoPlan {
  const past = (days: number) => shiftBusinessDays(today, -days);
  const future = (days: number) => shiftBusinessDays(today, days);

  const users: DemoUser[] = [
    demoUser(1, 'admin', 'Coordenação Demonstração', 'coordenacao', 'administrador', '1985-03-12'),
    demoUser(2, 'helena', 'Helena Duarte', 'helena.duarte', 'professor', '1979-08-21'),
    demoUser(3, 'ricardo', 'Ricardo Lima', 'ricardo.lima', 'professor', '1983-11-04'),
    demoUser(4, 'ana', 'Ana Souza', 'ana.souza', 'aluno', '2003-05-10', '5'),
    demoUser(5, 'bruno', 'Bruno Costa', 'bruno.costa', 'aluno', '2004-01-27', '3'),
    demoUser(6, 'carla', 'Carla Mendes', 'carla.mendes', 'aluno', '2002-09-15', '7'),
  ];

  const availabilities: DemoAvailability[] = [
    {
      date: past(5),
      endTime: '12:00',
      key: 'helena-p5',
      modalities: ['presencial', 'online'],
      professor: 'helena',
      startTime: '09:00',
      state: 'ativa',
    },
    {
      date: past(4),
      endTime: '17:00',
      key: 'ricardo-p4',
      modalities: ['presencial'],
      professor: 'ricardo',
      startTime: '14:00',
      state: 'ativa',
    },
    {
      date: past(3),
      endTime: '11:00',
      key: 'helena-p3',
      modalities: ['online'],
      professor: 'helena',
      startTime: '09:00',
      state: 'ativa',
    },
    {
      date: past(1),
      endTime: '12:00',
      key: 'ricardo-p1',
      modalities: ['presencial', 'online'],
      professor: 'ricardo',
      startTime: '10:00',
      state: 'ativa',
    },
    {
      date: future(1),
      endTime: '12:00',
      key: 'helena-f1',
      modalities: ['presencial', 'online'],
      professor: 'helena',
      startTime: '09:00',
      state: 'ativa',
    },
    {
      date: future(1),
      endTime: '16:00',
      key: 'ricardo-f1',
      modalities: ['presencial'],
      professor: 'ricardo',
      startTime: '14:00',
      state: 'ativa',
    },
    {
      date: future(2),
      endTime: '11:00',
      key: 'ricardo-f2',
      modalities: ['online'],
      professor: 'ricardo',
      startTime: '09:00',
      state: 'ativa',
    },
    {
      date: future(2),
      endTime: '16:00',
      key: 'helena-f2-bloqueada',
      modalities: ['presencial'],
      professor: 'helena',
      startTime: '14:00',
      state: 'bloqueada',
    },
    {
      date: future(3),
      endTime: '11:00',
      key: 'helena-f3',
      modalities: ['presencial', 'online'],
      professor: 'helena',
      startTime: '09:00',
      state: 'ativa',
    },
    {
      date: future(4),
      endTime: '17:00',
      key: 'ricardo-f4',
      modalities: ['presencial', 'online'],
      professor: 'ricardo',
      startTime: '14:00',
      state: 'ativa',
    },
    {
      date: future(5),
      endTime: '12:00',
      key: 'helena-f5',
      modalities: ['presencial', 'online'],
      professor: 'helena',
      startTime: '09:00',
      state: 'ativa',
    },
  ];

  const appointments: DemoAppointment[] = [
    {
      availability: 'helena-p5',
      details: 'Gostaria de definir o tema e o orientador do TCC.',
      endTime: '09:30',
      modality: 'presencial',
      outcome: {
        internalNotes: 'Aluna já possui pré-projeto; orientadora confirmada em reunião.',
        kind: 'realizado',
        steps: [
          {
            at: { date: past(5), time: '09:40' },
            reason: INITIAL_ATTENDANCE_REASON,
            solution: 'Tema e orientadora definidos; cronograma de entregas repassado.',
            status: 'resolvido',
          },
        ],
      },
      startTime: '09:00',
      student: 'ana',
      subject: 'Orientação de TCC',
    },
    {
      availability: 'helena-p5',
      details: null,
      endTime: '10:30',
      modality: 'online',
      outcome: {
        internalNotes: null,
        kind: 'realizado',
        steps: [
          {
            at: { date: past(5), time: '10:40' },
            reason: INITIAL_ATTENDANCE_REASON,
            status: 'nao_resolvido',
            unresolvedReason: 'Prazo de revisão de nota encerrado conforme o calendário acadêmico.',
          },
        ],
      },
      startTime: '10:00',
      student: 'bruno',
      subject: 'Revisão de nota',
    },
    {
      availability: 'ricardo-p4',
      details: 'Cursei a disciplina em outra instituição e quero aproveitá-la.',
      endTime: '14:30',
      modality: 'presencial',
      outcome: {
        internalNotes: 'Aguardando ementa original enviada pela aluna.',
        kind: 'realizado',
        steps: [
          {
            at: { date: past(4), time: '14:40' },
            continuityResponsible: 'Secretaria acadêmica',
            dueDate: future(3),
            nextStep: 'Analisar a ementa da disciplina cursada e emitir parecer.',
            reason: INITIAL_ATTENDANCE_REASON,
            status: 'em_tratativa',
          },
        ],
      },
      startTime: '14:00',
      student: 'carla',
      subject: 'Aproveitamento de disciplina',
    },
    {
      availability: 'ricardo-p4',
      details: null,
      endTime: '15:30',
      modality: 'presencial',
      outcome: { kind: 'ausencia' },
      startTime: '15:00',
      student: 'ana',
      subject: 'Trancamento de matrícula',
    },
    {
      availability: 'helena-p3',
      details: 'Preciso validar o convênio da empresa do estágio.',
      endTime: '09:30',
      modality: 'online',
      outcome: {
        internalNotes: 'Empresa enviou o termo de convênio assinado.',
        kind: 'realizado',
        steps: [
          {
            at: { date: past(3), time: '09:40' },
            continuityResponsible: 'Coordenação de estágios',
            dueDate: future(2),
            nextStep: 'Conferir o termo de convênio com a empresa.',
            reason: INITIAL_ATTENDANCE_REASON,
            status: 'em_tratativa',
          },
          {
            at: { date: past(1), time: '16:00' },
            reason: 'Convênio conferido pela coordenação de estágios.',
            solution: 'Convênio de estágio validado e plano de atividades aprovado.',
            status: 'resolvido',
          },
        ],
      },
      startTime: '09:00',
      student: 'bruno',
      subject: 'Estágio supervisionado',
    },
    {
      availability: 'helena-p3',
      details: null,
      endTime: '10:30',
      modality: 'online',
      outcome: {
        kind: 'cancelado',
        reason: 'Conflito com uma avaliação marcada no mesmo horário.',
      },
      startTime: '10:00',
      student: 'carla',
      subject: 'Dúvida sobre grade curricular',
    },
    {
      availability: 'ricardo-p1',
      details: null,
      endTime: '10:30',
      modality: 'online',
      outcome: {
        internalNotes: null,
        kind: 'realizado',
        steps: [
          {
            at: { date: past(1), time: '10:40' },
            reason: INITIAL_ATTENDANCE_REASON,
            referral: 'Encaminhada ao colegiado do curso para análise da equivalência.',
            status: 'resolvido',
          },
        ],
      },
      startTime: '10:00',
      student: 'ana',
      subject: 'Equivalência entre matrizes curriculares',
    },
    {
      // Atendimento passado ainda sem registro, para demonstrar o registro ao vivo.
      availability: 'ricardo-p1',
      details: 'Quero entender como funcionam as atividades complementares.',
      endTime: '11:30',
      modality: 'presencial',
      outcome: { kind: 'confirmado' },
      startTime: '11:00',
      student: 'bruno',
      subject: 'Atividades complementares',
    },
    {
      availability: 'helena-f1',
      details: null,
      endTime: '09:30',
      modality: 'online',
      outcome: { kind: 'confirmado' },
      startTime: '09:00',
      student: 'ana',
      subject: 'Acompanhamento do TCC',
    },
    {
      availability: 'ricardo-f2',
      details: null,
      endTime: '10:00',
      modality: 'online',
      outcome: { kind: 'confirmado' },
      startTime: '09:30',
      student: 'bruno',
      subject: 'Revisão de frequência',
    },
    {
      availability: 'ricardo-f4',
      details: 'Gostaria de orientação sobre disciplinas optativas.',
      endTime: '15:30',
      modality: 'presencial',
      outcome: { kind: 'confirmado' },
      startTime: '15:00',
      student: 'carla',
      subject: 'Escolha de optativas',
    },
  ];

  // O compromisso de hoje só é criado quando ainda cabe uma janela futura no dia.
  const currentHour = Number(nowTime.slice(0, 2));
  if (currentHour <= 19) {
    availabilities.push({
      date: today,
      endTime: hourLabel(currentHour + 3),
      key: 'helena-hoje',
      modalities: ['presencial', 'online'],
      professor: 'helena',
      startTime: hourLabel(currentHour + 1),
      state: 'ativa',
    });
    appointments.push({
      availability: 'helena-hoje',
      details: null,
      endTime: `${hourLabel(currentHour + 2).slice(0, 2)}:30`,
      modality: 'presencial',
      outcome: { kind: 'confirmado' },
      startTime: hourLabel(currentHour + 2),
      student: 'carla',
      subject: 'Matrícula em disciplina optativa',
    });
  }

  return { appointments, availabilities, users };
}

export function readDemoSeedInput(environment: NodeJS.ProcessEnv = process.env): DemoSeedInput {
  if (environment.DEMO_SEED_ENABLED?.trim() !== 'true') {
    throw new Error('Set DEMO_SEED_ENABLED=true to recreate the demo data in this database.');
  }

  const password = environment.DEMO_SEED_PASSWORD ?? '';
  if (password.length < 8 || password.length > 128) {
    throw new Error('DEMO_SEED_PASSWORD must contain between 8 and 128 characters.');
  }

  return { password };
}

export function institutionDateTime(now: Date, timeZone: string): LocalDateTime {
  const parts = new Intl.DateTimeFormat('en-CA', {
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
    minute: '2-digit',
    month: '2-digit',
    timeZone,
    year: 'numeric',
  }).formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((candidate) => candidate.type === type)?.value ?? '';

  return {
    date: `${part('year')}-${part('month')}-${part('day')}`,
    time: `${part('hour')}:${part('minute')}`,
  };
}

function createProtocol(createdAt: Date): string {
  const date = createdAt.toISOString().slice(0, 10).replaceAll('-', '');
  return `AG-${date}-${randomBytes(5).toString('hex').toUpperCase()}`;
}

async function selectIds(
  sequelize: Sequelize,
  sql: string,
  replacements: Record<string, unknown>,
  transaction: Transaction,
): Promise<number[]> {
  const rows = await sequelize.query<IdRow>(sql, {
    replacements,
    transaction,
    type: QueryTypes.SELECT,
  });
  return rows.map(({ id }) => Number(id));
}

async function optionItemIds(
  sequelize: Sequelize,
  optionName: string,
  transaction: Transaction,
): Promise<Map<string, number>> {
  const rows = await sequelize.query<{ id: number | string; value: string }>(
    `SELECT items.id, items.value
     FROM system_option_items items
     JOIN system_options options ON options.id = items.option_id
     WHERE options.name = :optionName
       AND options.deleted_at IS NULL
       AND items.deleted_at IS NULL`,
    { replacements: { optionName }, transaction, type: QueryTypes.SELECT },
  );
  return new Map(rows.map(({ id, value }) => [value, Number(id)] as const));
}

function requireId(map: Map<string, number>, key: string, description: string): number {
  const id = map.get(key);
  if (id === undefined) throw new Error(`Required ${description} was not found: ${key}`);
  return id;
}

/**
 * Recria somente os dados operacionais das contas @demo.test. Contas são preservadas
 * (para não violar as FKs da auditoria) e nada é alterado se a demonstração estiver
 * ligada a contas reais por algum agendamento.
 */
export async function seedDemoData(
  sequelize: Sequelize,
  input: DemoSeedInput,
  clock: DemoSeedClock,
  local: LocalDateTime,
  passwordHasher: PasswordHasher = new PasswordHashService(),
): Promise<DemoSeedResult> {
  const plan = buildDemoPlan(local.date, local.time);
  const passwordHash = await passwordHasher.hash(input.password);
  const queryInterface = sequelize.getQueryInterface();

  return sequelize.transaction(async (transaction) => {
    const now = clock.now;
    const emailPattern = `%@${DEMO_EMAIL_DOMAIN}`;
    const existingDemoIds = await selectIds(
      sequelize,
      'SELECT id FROM users WHERE email LIKE :emailPattern FOR UPDATE',
      { emailPattern },
      transaction,
    );

    if (existingDemoIds.length > 0) {
      const [mixed] = await sequelize.query<{ total: number | string }>(
        `SELECT COUNT(*) AS total
         FROM appointments appointment
         JOIN availabilities availability ON availability.id = appointment.availability_id
         WHERE (availability.professor_id IN (:ids)) <> (appointment.student_id IN (:ids))`,
        { replacements: { ids: existingDemoIds }, transaction, type: QueryTypes.SELECT },
      );
      if (Number(mixed?.total ?? 0) > 0) {
        throw new Error(
          'Demo accounts share appointments with real accounts; nothing was changed. ' +
            'Cancel or resolve those appointments before recreating the demo.',
        );
      }
    }

    const modalityIds = await optionItemIds(sequelize, MODALITY_OPTION, transaction);
    const periodIds = await optionItemIds(sequelize, ACADEMIC_PERIOD_OPTION, transaction);
    const courseSubjectIds = await selectIds(
      sequelize,
      `SELECT course_subject.id
       FROM course_subjects course_subject
       JOIN courses course ON course.id = course_subject.course_id
       WHERE course.code = :courseCode
         AND course_subject.is_active = true
         AND course_subject.deleted_at IS NULL
       ORDER BY course_subject.id
       LIMIT 4`,
      { courseCode: DEMO_COURSE_CODE },
      transaction,
    );
    if (courseSubjectIds.length < 3) {
      throw new Error(`Demo course ${DEMO_COURSE_CODE} needs at least 3 active subjects.`);
    }

    // Contas: atualiza as existentes e cria as que faltam, sem tocar em contas reais.
    const identityConflicts = await sequelize.query<{ email: string }>(
      `SELECT email FROM users
       WHERE email NOT LIKE :emailPattern
         AND (cpf IN (:cpfs) OR registration_number IN (:registrationNumbers))`,
      {
        replacements: {
          cpfs: plan.users.map(({ cpf }) => cpf),
          emailPattern,
          registrationNumbers: plan.users.flatMap(({ registrationNumber }) =>
            registrationNumber === null ? [] : [registrationNumber],
          ),
        },
        transaction,
        type: QueryTypes.SELECT,
      },
    );
    if (identityConflicts.length > 0) {
      throw new Error('A demo CPF or registration number already belongs to a real account.');
    }

    const userIds = new Map<string, number>();
    for (const user of plan.users) {
      const values = {
        birth_date: user.birthDate,
        cpf: user.cpf,
        deleted_at: null,
        deleted_by: null,
        email: user.email,
        is_active: true,
        must_change_password: false,
        name: user.name,
        password_hash: passwordHash,
        phone: user.phone,
        registration_number: user.registrationNumber,
        updated_at: now,
        updated_by: null,
        user_type: user.userType,
      };
      const [existingId] = await selectIds(
        sequelize,
        'SELECT id FROM users WHERE email = :email',
        { email: user.email },
        transaction,
      );

      if (existingId === undefined) {
        await queryInterface.bulkInsert(
          'users',
          [{ ...values, created_at: now, created_by: null }],
          { transaction },
        );
      } else {
        await queryInterface.bulkUpdate('users', values, { id: existingId }, { transaction });
      }

      const [id] = await selectIds(
        sequelize,
        'SELECT id FROM users WHERE email = :email',
        { email: user.email },
        transaction,
      );
      if (id === undefined) throw new Error(`Demo user was not persisted: ${user.email}`);
      userIds.set(user.key, id);
    }

    const demoIds = [...userIds.values()];
    const professorIds = plan.users
      .filter(({ userType }) => userType === 'professor')
      .map(({ key }) => requireId(userIds, key, 'demo user'));

    // Remove apenas os dados operacionais da demonstração, dos filhos para os pais (FKs RESTRICT).
    const appointmentIds = await selectIds(
      sequelize,
      `SELECT appointment.id
       FROM appointments appointment
       JOIN availabilities availability ON availability.id = appointment.availability_id
       WHERE availability.professor_id IN (:professorIds) OR appointment.student_id IN (:demoIds)`,
      { demoIds, professorIds },
      transaction,
    );
    if (appointmentIds.length > 0) {
      const attendanceIds = await selectIds(
        sequelize,
        'SELECT id FROM attendances WHERE appointment_id IN (:appointmentIds)',
        { appointmentIds },
        transaction,
      );
      if (attendanceIds.length > 0) {
        await sequelize.query(
          'DELETE FROM attendance_status_history WHERE attendance_id IN (:attendanceIds)',
          { replacements: { attendanceIds }, transaction },
        );
        await sequelize.query('DELETE FROM attendances WHERE id IN (:attendanceIds)', {
          replacements: { attendanceIds },
          transaction,
        });
      }
      await sequelize.query('DELETE FROM notifications WHERE appointment_id IN (:appointmentIds)', {
        replacements: { appointmentIds },
        transaction,
      });
      await sequelize.query('DELETE FROM appointments WHERE id IN (:appointmentIds)', {
        replacements: { appointmentIds },
        transaction,
      });
    }
    await sequelize.query(
      `DELETE FROM availability_modalities
       WHERE availability_id IN (SELECT id FROM availabilities WHERE professor_id IN (:professorIds))`,
      { replacements: { professorIds }, transaction },
    );
    await sequelize.query('DELETE FROM availabilities WHERE professor_id IN (:professorIds)', {
      replacements: { professorIds },
      transaction,
    });
    await sequelize.query('DELETE FROM user_subjects WHERE user_id IN (:demoIds)', {
      replacements: { demoIds },
      transaction,
    });

    const auditValues = (actorId: number | null) => ({
      created_at: now,
      created_by: actorId,
      deleted_at: null,
      deleted_by: null,
      updated_at: now,
      updated_by: actorId,
    });

    const academicLinks = plan.users.flatMap((user) => {
      if (user.userType === 'administrador') return [];
      const userId = requireId(userIds, user.key, 'demo user');
      const periodOptionItemId =
        user.periodValue === null ? null : requireId(periodIds, user.periodValue, 'period');
      const subjects = user.userType === 'aluno' ? courseSubjectIds.slice(0, 3) : courseSubjectIds;

      return subjects.map((courseSubjectId) => ({
        ...auditValues(null),
        course_subject_id: courseSubjectId,
        is_active: true,
        period_option_item_id: periodOptionItemId,
        user_id: userId,
      }));
    });
    await queryInterface.bulkInsert('user_subjects', academicLinks, { transaction });

    const availabilityIds = new Map<string, number>();
    for (const availability of plan.availabilities) {
      const professorId = requireId(userIds, availability.professor, 'demo user');
      await queryInterface.bulkInsert(
        'availabilities',
        [
          {
            ...auditValues(professorId),
            ends_at: clock.toUtc(availability.date, availability.endTime),
            professor_id: professorId,
            starts_at: clock.toUtc(availability.date, availability.startTime),
            state: availability.state,
          },
        ],
        { transaction },
      );
      // A transação mantém a mesma conexão, então o último id gerado é o desta inserção.
      const [id] = await selectIds(sequelize, 'SELECT LAST_INSERT_ID() AS id', {}, transaction);
      if (id === undefined)
        throw new Error(`Demo availability was not persisted: ${availability.key}`);
      availabilityIds.set(availability.key, id);
      await queryInterface.bulkInsert(
        'availability_modalities',
        availability.modalities.map((modality) => ({
          ...auditValues(professorId),
          availability_id: id,
          modality_option_item_id: requireId(modalityIds, modality, 'modality'),
        })),
        { transaction },
      );
    }

    const professorOf = new Map(plan.availabilities.map((item) => [item.key, item.professor]));
    const dateOf = new Map(plan.availabilities.map((item) => [item.key, item.date]));

    for (const appointment of plan.appointments) {
      const date = dateOf.get(appointment.availability) ?? '';
      const studentId = requireId(userIds, appointment.student, 'demo user');
      const professorId = requireId(
        userIds,
        professorOf.get(appointment.availability) ?? '',
        'demo user',
      );
      const startsAt = clock.toUtc(date, appointment.startTime);
      // Reservas passadas foram feitas dois dias antes; as futuras, no momento do seed.
      const createdAt =
        startsAt.getTime() < now.getTime()
          ? new Date(startsAt.getTime() - 2 * 24 * 60 * 60 * 1000)
          : now;
      const protocol = createProtocol(createdAt);
      const outcome = appointment.outcome;
      const status =
        outcome.kind === 'realizado'
          ? 'concluido'
          : outcome.kind === 'ausencia'
            ? 'ausencia'
            : outcome.kind;

      await queryInterface.bulkInsert(
        'appointments',
        [
          {
            availability_id: requireId(availabilityIds, appointment.availability, 'availability'),
            cancellation_reason: outcome.kind === 'cancelado' ? outcome.reason : null,
            cancelled_at:
              outcome.kind === 'cancelado'
                ? new Date(startsAt.getTime() - 20 * 60 * 60 * 1000)
                : null,
            cancelled_by: outcome.kind === 'cancelado' ? studentId : null,
            created_at: createdAt,
            created_by: studentId,
            details: appointment.details,
            ends_at: clock.toUtc(date, appointment.endTime),
            modality_option_item_id: requireId(modalityIds, appointment.modality, 'modality'),
            protocol,
            starts_at: startsAt,
            status,
            student_id: studentId,
            subject: appointment.subject,
            updated_at: now,
            // Quem alterou por último: o aluno ao reservar ou cancelar; o professor ao registrar.
            updated_by:
              outcome.kind === 'confirmado' || outcome.kind === 'cancelado'
                ? studentId
                : professorId,
          },
        ],
        { transaction },
      );

      if (outcome.kind !== 'realizado' && outcome.kind !== 'ausencia') continue;

      const [appointmentId] = await selectIds(
        sequelize,
        'SELECT id FROM appointments WHERE protocol = :protocol',
        { protocol },
        transaction,
      );
      if (appointmentId === undefined) throw new Error('Demo appointment was not persisted.');

      const steps: DemoAttendanceStep[] = outcome.kind === 'ausencia' ? [] : outcome.steps;
      // A ausência é registrada ao fim do horário reservado.
      const initialAt = steps[0]?.at ?? { date, time: appointment.endTime };
      const recordedAt = clock.toUtc(initialAt.date, initialAt.time);
      const finalStep = steps[steps.length - 1];
      const occurrence = outcome.kind === 'ausencia' ? 'ausencia' : 'realizado';

      await queryInterface.bulkInsert(
        'attendances',
        [
          {
            appointment_id: appointmentId,
            continuity_responsible: finalStep?.continuityResponsible ?? null,
            created_at: recordedAt,
            created_by: professorId,
            due_date: finalStep?.dueDate ?? null,
            internal_notes: outcome.kind === 'realizado' ? outcome.internalNotes : null,
            next_step: finalStep?.nextStep ?? null,
            occurrence,
            recorded_at: recordedAt,
            referral: finalStep?.referral ?? null,
            resolution_status: finalStep?.status ?? null,
            solution: finalStep?.solution ?? null,
            unresolved_reason: finalStep?.unresolvedReason ?? null,
            updated_at: now,
            updated_by: professorId,
          },
        ],
        { transaction },
      );
      const [attendanceId] = await selectIds(
        sequelize,
        'SELECT id FROM attendances WHERE appointment_id = :appointmentId',
        { appointmentId },
        transaction,
      );
      if (attendanceId === undefined) throw new Error('Demo attendance was not persisted.');

      const historySteps =
        steps.length > 0
          ? steps.map((step) => ({ at: step.at, reason: step.reason, status: step.status }))
          : [{ at: initialAt, reason: INITIAL_ATTENDANCE_REASON, status: null }];
      await queryInterface.bulkInsert(
        'attendance_status_history',
        historySteps.map((step) => ({
          attendance_id: attendanceId,
          change_reason: step.reason,
          changed_at: clock.toUtc(step.at.date, step.at.time),
          created_at: clock.toUtc(step.at.date, step.at.time),
          created_by: professorId,
          occurrence,
          resolution_status: step.status,
        })),
        { transaction },
      );
    }

    return {
      appointments: plan.appointments.length,
      availabilities: plan.availabilities.length,
      users: plan.users.length,
    };
  });
}
