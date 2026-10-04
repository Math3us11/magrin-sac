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

Toda configuração é carregada do `.env` na raiz do monorepo. Crie-o a partir
do `.env.example` global; não crie outro arquivo dentro de `backend/`.

Dentro de `backend/`:

```bash
pnpm start:dev
```

A API usa o prefixo `/api` e expõe inicialmente:

- `GET /api/health`;
- `GET /api/auth/credential-key`;
- `POST /api/auth/login`;
- `POST /api/auth/logout`;
- `GET /api/me`;
- `GET /api/me/navigation`.

## Banco

- `db:create`: cria o banco configurado, caso ainda não exista;
- `db:check`: valida a conexão;
- `db:migrate:status`: mostra migrations executadas e pendentes;
- `db:migrate`: aplica migrations;
- `db:migrate:undo`: reverte a última migration;
- `db:setup`: cria o banco e aplica migrations;
- `db:bootstrap:admin`: cria ou atualiza, de forma controlada, a primeira conta
  administrativa.

Para provisionar o administrador, defina localmente as variáveis
`BOOTSTRAP_ADMIN_NAME`, `BOOTSTRAP_ADMIN_EMAIL`, `BOOTSTRAP_ADMIN_PASSWORD`,
`BOOTSTRAP_ADMIN_CPF` e `BOOTSTRAP_ADMIN_BIRTH_DATE` e execute:

```bash
pnpm --filter backend db:bootstrap:admin
```

A data usa o formato `YYYY-MM-DD`, o CPF é normalizado para 11 dígitos e a
senha nunca é persistida em texto puro. A rotina é idempotente para a mesma
combinação de e-mail e CPF e recusa conflitos com contas existentes.

O Sequelize usa `synchronize: false`. Toda mudança estrutural deve ser criada
como migration versionada.

A migration inicial cria:

- `users` e `auth_sessions` para identidade e sessão stateful;
- `system_parameters` para valores operacionais não secretos;
- `integration_endpoints` para URLs e referências a segredos externos;
- `system_options` e `system_option_items` para vocabulários configuráveis.

A migration de navegação e autorização cria:

- `permissions`, com códigos estáveis usados pelo backend;
- `user_type_permissions`, associando os tipos iniciais às permissões;
- `menu_items`, com rota nominal, ícone, ordenação e hierarquia por
  `parent_id`.

O menu controla apenas a navegação apresentada. A autorização real continuará
sendo aplicada pelos guards e services do backend.

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
`AUTH_SESSION_*` do `.env.example` global antes de iniciar a API. Para HS256,
gere pelo menos 32 bytes aleatórios, armazene a representação codificada no
ambiente e nunca versione esse valor.

Requisições de escrita da autenticação exigem o cabeçalho `Origin` igual a
`CORS_ORIGIN`. O navegador deve enviar cookies com `credentials: 'include'`.
O timeout por inatividade ainda depende da decisão registrada em
`docs/OPEN_QUESTIONS.md`; por enquanto a API registra `last_activity_at`, valida
revogação, expiração absoluta e o estado ativo do usuário.

## Criptografia de credenciais

O frontend consulta a chave pública em `GET /api/auth/credential-key`, cria uma
chave AES-GCM efêmera para cada senha e protege essa chave com RSA-OAEP SHA-256.
O backend abre o envelope somente na fronteira HTTP e entrega a senha em memória
ao serviço de autenticação ou cadastro, que continua usando Argon2id.

Em desenvolvimento e testes, a API gera uma chave RSA efêmera ao iniciar. Em
produção, gere uma chave persistente com:

```bash
pnpm --filter backend credential-key:generate
```

Copie a linha emitida para o ambiente seguro da API. A variável
`PASSWORD_ENCRYPTION_PRIVATE_KEY_BASE64` contém uma chave privada PKCS#8 e nunca
deve ser versionada, enviada ao frontend ou persistida no MariaDB. Em ambiente
local, ela fica no `.env` global; a chave pública é derivada automaticamente.
HTTPS permanece obrigatório.

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
    credential-encryption/
      credential-encryption.dto.ts
      credential-encryption.module.ts
      credential-encryption.service.ts
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
    navigation/
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
