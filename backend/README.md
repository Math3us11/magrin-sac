# Backend

API REST do Sistema de Agendamento, implementada com Node.js 24, NestJS,
TypeScript, Sequelize e MariaDB.

## Executar

Na raiz do monorepo:

```bash
pnpm install
pnpm --filter backend db:create
pnpm --filter backend db:check
pnpm start:dev
```

Dentro de `backend/`:

```bash
pnpm start:dev
```

A API usa o prefixo `/api` e expõe inicialmente:

- `GET /api/health`;
- `POST /api/auth/login`;
- `POST /api/auth/logout`;
- `GET /api/me`.

## Banco

- `db:create`: cria o banco configurado, caso ainda não exista;
- `db:check`: valida a conexão;
- `db:migrate:status`: mostra migrations executadas e pendentes;
- `db:migrate`: aplica migrations;
- `db:migrate:undo`: reverte a última migration;
- `db:setup`: cria o banco e aplica migrations.

O Sequelize usa `synchronize: false`. Toda mudança estrutural deve ser criada
como migration versionada.

A migration inicial cria:

- `users` e `auth_sessions` para identidade e sessão stateful;
- `system_parameters` para valores operacionais não secretos;
- `integration_endpoints` para URLs e referências a segredos externos;
- `system_options` e `system_option_items` para vocabulários configuráveis.

Todas as tabelas possuem colunas de criação, atualização e exclusão lógica com
autoria. Segredos reais, chaves de criptografia e credenciais de infraestrutura
não são armazenados nessas tabelas.

## JWT e cookie de sessão

O login valida a senha com Argon2id, cria `auth_sessions` em transação e envia o
JWT somente pelo cookie. O módulo compartilhado `HelpersModule` concentra os
providers de hash, JWT e cookie. `JwtSessionService.read()` sempre verifica assinatura HS256,
emissor, audiência, expiração e finalidade do token. O JWT completo não é salvo
no banco; `auth_sessions.token_id` guarda seu `jti` para vinculá-lo à sessão
revogável.

`SessionCookieService` lê, grava e remove o JWT em cookie `HttpOnly`,
`SameSite=Lax`, com caminho `/api` e `Secure` em produção. Defina as variáveis
`AUTH_SESSION_*` de `.env.example` antes de iniciar a API. Para HS256, gere pelo
menos 32 bytes aleatórios, armazene a representação codificada no ambiente e
nunca versione esse valor.

Requisições de escrita da autenticação exigem o cabeçalho `Origin` igual a
`CORS_ORIGIN`. O navegador deve enviar cookies com `credentials: 'include'`.
O timeout por inatividade ainda depende da decisão registrada em
`docs/OPEN_QUESTIONS.md`; por enquanto a API registra `last_activity_at`, valida
revogação, expiração absoluta e o estado ativo do usuário.

## Organização

```text
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
    audit/
    appointments/
    attendance/
    auth/
      dto/
    availability/
    dashboard/
    notifications/
    users/
  types/
```

Cada módulo deve receber `controller`, `service`, `dto` e demais arquivos
somente quando houver responsabilidade concreta. Models ficam centralizados em
`src/models` e são registrados explicitamente. Decorators, guards, helpers e
tipos transversais ficam diretamente em `src/` para reutilização entre módulos.
Cada helper possui uma pasta própria, com seu service e module; o
`HelpersModule` apenas agrega e reexporta esses módulos.
