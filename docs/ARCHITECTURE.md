# Arquitetura do Sistema de Agendamento

## Estado

Arquitetura alvo aprovada para o início do MVP. Frontend e backend possuem
scaffolds executáveis no workspace pnpm.

## Princípio

Construir um monólito modular cliente-servidor. Frontend e backend vivem no
mesmo repositório, comunicam-se por uma API REST e evoluem por contratos
explícitos.

```text
Vue 3 + TypeScript
        |
        | HTTP / JSON
        v
Node.js 24 + NestJS + TypeScript
        |
        +------ Sequelize ------ MariaDB
        |
        +------ NotificationService ------ Twilio WhatsApp Sandbox
```

## Stack

| Camada | Tecnologia |
|---|---|
| Runtime | Node.js 24 LTS, pnpm 11 |
| Frontend | Vue 3, TypeScript, Vite, Tailwind CSS |
| Backend | NestJS, TypeScript |
| API | REST, JSON |
| ORM | Sequelize 6, sequelize-typescript |
| Migrações | Umzug |
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
- ESLint e Prettier;
- estrutura inicial de `assets`, `components`, `composables`, `router`,
  `services`, `stores`, `types` e `views`.
- workspace pnpm configurado na raiz do monorepo.

A origem da futura API usa `VITE_API_BASE_URL`, com fallback para `/api`.
Durante o desenvolvimento, o Vite encaminha `/api` para o backend local na
porta 3000.

O backend usa o pacote `mariadb` como driver do Sequelize. O Vite e o Vitest
permanecem exclusivos do frontend.

### Identidade visual e temas

O frontend usa tokens CSS semânticos integrados ao Tailwind. A paleta parte das
cores institucionais `#ce0055`, `#0054b2` e `#ffffff`, com variações próprias
para contraste em tema claro e escuro. O tema claro é o padrão; a preferência
selecionada é aplicada ao elemento `html` e persistida no navegador pelo
composable `useTheme`.

Componentes consomem responsabilidades como superfície, conteúdo, borda, foco,
marca e estado, sem repetir valores hexadecimais. As regras completas e o uso
das logos estão em `docs/DESIGN_SYSTEM.md`.

## Backend implementado

O diretório `backend/` foi criado com:

- Node.js 24, NestJS e TypeScript ESM com resolução `NodeNext`;
- configuração de ambiente validada por Joi;
- Sequelize, sequelize-typescript e driver `mariadb`;
- `synchronize: false` e registro explícito de models;
- runner de migrations Umzug;
- comando idempotente para criar o banco configurado;
- health check em `GET /api/health`, incluindo autenticação no banco;
- login, logout e identidade atual com sessão stateful em cookie `HttpOnly`;
- hash e verificação de senhas com Argon2id;
- módulos iniciais de autenticação, usuários, disponibilidade, agendamentos,
  atendimento, dashboard, notificações e auditoria;
- ESLint e Prettier, sem Vite, Vitest ou Oxlint.

O módulo de autenticação já aplica a separação entre controller, service e DTOs.
Decorators, guards, helpers e tipos transversais ficam diretamente em `src/`
para reutilização entre os módulos de domínio.

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
  src/
    config/
    database/
      migrations/
    decorators/
    guards/
    health/
    helpers/
      cookie/
        cookie.module.ts
        cookie.service.ts
      jwt/
        jwt.module.ts
        jwt.service.ts
      password/
        password.module.ts
        password.service.ts
      helpers.module.ts
    models/
    modules/
      auth/
      users/
      availability/
      appointments/
      attendance/
      dashboard/
      notifications/
      audit/
    types/
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

### `modules/auth`

Autenticação local, sessão e autorização. `AuthController` trata a fronteira
HTTP e `AuthService` coordena usuário e sessão. A infraestrutura compartilhada
em `src/guards`, `src/decorators` e `src/helpers` protege a origem, resolve a
identidade atual e encapsula Argon2id, JWT e cookie.

Cada helper transversal possui pasta, service e module próprios. O
`HelpersModule` raiz atua somente como agregador e reexporta `CookieModule`,
`JwtHelperModule` e `PasswordModule`.

Controllers protegidos podem combinar `SessionAuthGuard` com `@CurrentUser()`.
O guard valida token, sessão e usuário uma vez e o decorator entrega a identidade
já autenticada ao controller, sem duplicar leitura de cookie nos módulos.

### `modules/users`

Usuários, alunos, perfis, permissões, ativação e desativação.

### `modules/availability`

Datas, horários, duração, modalidade, bloqueios e conflitos da agenda publicada.

### `modules/appointments`

Criação, consulta, cancelamento, protocolo, regras do aluno e reserva segura da
disponibilidade.

### `modules/attendance`

Realização, ausência, observações, solução, encaminhamento e evolução da demanda.

### `modules/dashboard`

Consultas agregadas e rastreáveis aos registros que compõem os indicadores.

### `modules/notifications`

Templates, orquestração, provedor Twilio, tentativas e falhas. Nenhum outro
módulo importa a SDK do provedor.

### `modules/audit`

Trilha de operações relevantes com ator, ação, alvo e data. Auditoria de negócio
não substitui logging técnico.

## Dependências permitidas

```text
NestJS controllers
          |
          v
application/domain services
          |
          +------> repositories / Sequelize
          |
          +------> NotificationService interface
                         |
                         v
                  Twilio provider
```

- Controllers podem depender de services, DTOs e autenticação.
- Services podem depender de models/repositórios e portas de integração.
- O provedor Twilio implementa uma porta do módulo de notificações.
- Regras de domínio não dependem de NestJS, Vue ou Twilio.
- Módulos não devem acessar tabelas de outros contextos por SQL solto.

Models Sequelize ficam centralizados em `backend/src/models` e são registrados
explicitamente. O backend usa `synchronize: false`; alterações de schema são
feitas somente por migrations Umzug versionadas.

### Primeiro recorte físico

A migration inicial cria `users`, `auth_sessions`, `system_parameters`,
`integration_endpoints`, `system_options` e `system_option_items`. Todas usam
exclusão lógica e colunas de autoria `created_by`, `updated_by` e `deleted_by`,
além dos respectivos timestamps.

`users.id` é a chave primária e também pode identificar o recurso na API. E-mail
e CPF possuem unicidade no banco. O CPF é armazenado normalizado com 11 dígitos,
sem pontuação, e permanece excluído das consultas padrão do model. A autorização
de cada recurso é obrigatória mesmo quando um identificador sequencial for
conhecido por outro usuário.

`auth_sessions` armazena o `jti` do JWT e o estado da sessão. O helper de JWT
assina e verifica apenas identificadores mínimos; depois da verificação
criptográfica, o backend consulta a sessão e o usuário antes de autorizar a
requisição. Portanto, o JWT não torna a autenticação stateless.

O access token trafega em cookie `HttpOnly`, `SameSite=Lax`, restrito ao caminho
`/api` e marcado como `Secure` em produção. O parser de cookies e CORS com
credenciais estão preparados. Login e logout validam `Origin` contra
`CORS_ORIGIN`; novos endpoints de escrita deverão reutilizar essa proteção.

O login cria a sessão dentro de uma transação e o logout marca `revoked_at`. O
guard valida JWT, vínculo com a sessão, expiração absoluta e usuário ativo antes
de anexar a identidade à requisição. `last_activity_at` já é atualizado, mas a
expiração por inatividade só será ativada depois da aprovação dos tempos de
sessão em `OPEN_QUESTIONS.md`.

### Configuração em camadas

Configurações de bootstrap e segredos continuam fora do banco. Isso inclui
conexão MariaDB, credenciais e tokens de provedores. A
tabela `system_parameters` guarda somente parâmetros operacionais não secretos.
`integration_endpoints` pode guardar URL e nomes das variáveis que apontam para
segredos externos, nunca os valores secretos.

Providers de configuração poderão combinar ambiente e banco, sem copiar dados
para `process.env`. Alterações de parâmetro em runtime exigirão estratégia
explícita de cache e invalidação quando o módulo correspondente for criado.

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
NODE_ENV=development
PORT=3000
CORS_ORIGIN=http://localhost:5173
DB_DIALECT=mariadb
DB_HOST=localhost
DB_PORT=3306
DB_DATABASE=magrin_sac
DB_USERNAME=
DB_PASSWORD=
AUTH_SESSION_COOKIE_NAME=magrin_sac_session
AUTH_SESSION_JWT_AUDIENCE=magrin-sac-frontend
AUTH_SESSION_JWT_ISSUER=magrin-sac-api
AUTH_SESSION_JWT_SECRET=
AUTH_SESSION_JWT_TTL_SECONDS=
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
