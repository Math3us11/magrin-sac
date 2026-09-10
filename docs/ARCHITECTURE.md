# Arquitetura do Sistema de Agendamento

## Estado

Arquitetura alvo aprovada para o início do MVP. O frontend já possui scaffold
executável; a estrutura do backend continua planejada.

## Princípio

Construir um monólito modular cliente-servidor. Frontend e backend vivem no
mesmo repositório, comunicam-se por uma API REST e evoluem por contratos
explícitos.

```text
Vue 3 + TypeScript
        |
        | HTTP / JSON
        v
Python + Flask
        |
        +------ SQLAlchemy ------ MariaDB
        |
        +------ NotificationService ------ Twilio WhatsApp Sandbox
```

## Stack

| Camada | Tecnologia |
|---|---|
| Runtime frontend | Node.js 24 LTS, pnpm 11 |
| Frontend | Vue 3, TypeScript, Vite, Tailwind CSS |
| Backend | Python, Flask |
| API | REST, JSON |
| ORM | SQLAlchemy 2.x |
| Migrações | Alembic via Flask-Migrate |
| Banco | MariaDB |
| WhatsApp | Twilio API for WhatsApp |
| Teste de WhatsApp | Twilio WhatsApp Sandbox |
| Arquitetura | Monólito modular |

## Frontend implementado

O diretório `frontend/` foi criado com:

- Vue 3 e TypeScript;
- Vite e plugin oficial do Vue;
- Tailwind CSS integrado pelo plugin oficial do Vite;
- Vue Router;
- Pinia preparado para estado compartilhado;
- Vitest e Vue Test Utils;
- ESLint, Oxlint e Prettier;
- estrutura inicial de `assets`, `components`, `composables`, `router`,
  `services`, `stores`, `types` e `views`.
- workspace pnpm configurado na raiz do monorepo.

A origem da futura API usa `VITE_API_BASE_URL`, com fallback para `/api`.

O driver MariaDB deverá ser escolhido no scaffold após um teste simples de
compatibilidade local. Essa escolha não altera o uso de SQLAlchemy.

## Estrutura alvo inicial

```text
frontend/
  src/
    assets/
    components/
    views/
    router/
    stores/
    services/
    types/
    composables/
backend/
  app/
    auth/
    users/
    availability/
    appointments/
    attendance/
    dashboard/
    notifications/
      providers/
      service.py
      templates.py
    audit/
    models/
    extensions.py
  migrations/
  tests/
  requirements.txt
  run.py
docs/
```

## Responsabilidades do frontend

- apresentar autenticação, calendário, formulários e dashboards;
- controlar navegação e estado de interface;
- centralizar chamadas HTTP em `services`;
- oferecer validação de experiência, sem substituir validação do backend;
- apresentar loading, vazio, erro e sucesso;
- manter acessibilidade e responsividade.

O frontend não deve conter acesso direto ao banco, segredos, credenciais da
Twilio nem decisões finais de autorização ou concorrência.

## Responsabilidades do backend

### `auth`

Autenticação, sessão e autorização. O mecanismo exato de identidade ainda está
em aberto.

### `users`

Usuários, alunos, perfis, permissões, ativação e desativação.

### `availability`

Datas, horários, duração, modalidade, bloqueios e conflitos da agenda publicada.

### `appointments`

Criação, consulta, cancelamento, protocolo, regras do aluno e reserva segura da
disponibilidade.

### `attendance`

Realização, ausência, observações, solução, encaminhamento e evolução da demanda.

### `dashboard`

Consultas agregadas e rastreáveis aos registros que compõem os indicadores.

### `notifications`

Templates, orquestração, provedor Twilio, tentativas e falhas. Nenhum outro
módulo importa a SDK do provedor.

### `audit`

Trilha de operações relevantes com ator, ação, alvo e data. Auditoria de negócio
não substitui logging técnico.

## Dependências permitidas

```text
HTTP routes/controllers
          |
          v
application/domain services
          |
          +------> repositories / SQLAlchemy
          |
          +------> NotificationService interface
                         |
                         v
                  Twilio provider
```

- Rotas podem depender de serviços, schemas e autenticação.
- Serviços podem depender de repositórios e portas de integração.
- O provedor Twilio implementa uma porta do módulo de notificações.
- Modelos de domínio não dependem de Flask, Vue ou Twilio.
- Módulos não devem acessar tabelas de outros contextos por SQL solto.

## Consistência da reserva

A criação do agendamento precisa combinar:

1. validação de entrada e autorização;
2. nova leitura da disponibilidade;
3. transação;
4. proteção no banco contra mais de um agendamento ativo no horário;
5. protocolo único;
6. commit;
7. notificação posterior ao commit.

A estratégia física de constraint/lock será definida junto ao modelo MariaDB e
deve possuir teste concorrente.

## Notificações

```text
agendamento confirmado
        |
        v
commit no MariaDB
        |
        v
NotificationService
        |
        +------ sucesso: registrar entrega
        |
        +------ falha: registrar tentativa e permitir diagnóstico
```

O MVP não exige broker. A implementação inicial pode realizar a tentativa após o
commit, desde que preserve o agendamento e deixe caminho explícito para reenvio.

## Configuração

O repositório deverá versionar `.env.example`, nunca `.env` real. Variáveis
previstas:

```env
FLASK_ENV=development
SECRET_KEY=
DATABASE_URL=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_WHATSAPP_FROM=
```

Nomes finais e variáveis de frontend serão definidos no scaffold e registrados
no README da raiz.

## Evolução

Microserviços, filas, cache distribuído ou separação do módulo de notificações
somente devem ser considerados após evidência de necessidade. Antes disso, a
prioridade é uma aplicação simples, testável e consistente.
