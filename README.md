# Sistema de Agendamento da Coordenação

Monorepo do sistema web de agendamento de atendimentos da coordenação do curso
de Ciência da Computação.

## Estado atual

- documentação inicial consolidada;
- repositório Git com `develop` como branch padrão e `main` reservada para
  entregas;
- frontend Vue criado;
- backend NestJS criado com Sequelize, MariaDB, health check e autenticação
  stateful inicial;
- migration inicial de identidade e configuração aplicada; o modelo do fluxo
  vertical de agendamento ainda está pendente.

## Estrutura

```text
frontend/   Vue 3, TypeScript, Vite, Tailwind CSS
backend/    Node.js 24, NestJS, TypeScript, Sequelize
docs/       escopo, arquitetura, requisitos e decisões
AGENTS.md   instruções do projeto para agentes
```

## Requisitos

- Node.js 24;
- pnpm 11.18.0;
- MariaDB disponível em desenvolvimento.

Com NVM for Windows:

```powershell
nvm use 24
```

## Instalação

```bash
pnpm install
```

## Executar o frontend

```bash
pnpm dev --host
```

## Preparar e executar o backend

Crie `backend/.env` a partir de `backend/.env.example`. Depois:

```bash
pnpm --filter backend db:create
pnpm --filter backend db:setup
pnpm start:dev
```

Para criar a primeira conta administrativa local, preencha somente no seu
`backend/.env` as variáveis `BOOTSTRAP_ADMIN_*` descritas em `.env.example` e
execute:

```bash
pnpm --filter backend db:bootstrap:admin
```

A API fica em `http://localhost:3000/api`. O health check é
`GET /api/health`. A autenticação oferece `POST /api/auth/login`,
`POST /api/auth/logout` e `GET /api/me`.

## Verificações do workspace

```bash
pnpm type-check
pnpm lint
pnpm test
pnpm build
pnpm check
```

Consulte `docs/README.md` antes de alterações de arquitetura ou escopo.
