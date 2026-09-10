# Sistema de Agendamento da Coordenação

Monorepo do sistema web de agendamento de atendimentos da coordenação do curso
de Ciência da Computação.

## Estado atual

- documentação inicial consolidada;
- repositório Git inicializado na branch `main`;
- frontend Vue criado;
- backend ainda não iniciado.

## Estrutura

```text
frontend/   Vue 3, TypeScript, Vite, Tailwind CSS
docs/       escopo, arquitetura, requisitos e decisões
AGENTS.md   instruções do projeto para agentes
```

O diretório `backend/` será criado na próxima etapa com Flask, SQLAlchemy e
MariaDB.

## Requisitos do frontend

- Node.js 24;
- pnpm 11.18.0.

Com NVM for Windows:

```powershell
nvm use 24
```

## Executar o frontend

```powershell
pnpm install
pnpm dev
```

## Verificações

```powershell
pnpm type-check
pnpm lint
pnpm test
pnpm build
```

Consulte `docs/README.md` antes de alterações de arquitetura ou escopo.
