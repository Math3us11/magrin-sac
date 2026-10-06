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

Copie o arquivo global de exemplo para a raiz do repositório e preencha os
valores locais:

```bash
cp .env.example .env
```

No PowerShell, use `Copy-Item .env.example .env`. Frontend, backend e comandos
de banco leem esse mesmo arquivo. Somente variáveis prefixadas com `VITE_` são
expostas ao código executado no navegador; nunca use esse prefixo em segredos.

## Executar o frontend

```bash
pnpm dev --host
```

## Preparar e executar o backend

Com o `.env` global configurado na raiz:

```bash
pnpm --filter backend db:create
pnpm --filter backend db:setup
pnpm start:dev
```

Para criar a primeira conta administrativa local, preencha somente no seu
`.env` global as variáveis `BOOTSTRAP_ADMIN_*` descritas em `.env.example` e
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

## Fluxo de branches e Pull Requests

`develop` é a base do desenvolvimento e `main` contém somente a versão estável
usada pelo túnel. Cada alteração deve começar em uma branch própria criada a
partir da `develop` atualizada:

```bash
git switch develop
git pull --ff-only origin develop
git switch -c feat/nome-da-funcionalidade
```

O fluxo de integração é:

```text
feat/* | fix/* | docs/* → Pull Request → develop
develop                 → Pull Request → main → túnel
```

Não faça push direto para `develop` ou `main`. Consulte
`docs/GIT_WORKFLOW.md` para os comandos de versionamento, atualização local,
limpeza das branches e promoção da versão estável.

## Demonstração remota com Cloudflare Tunnel

O projeto pode publicar temporariamente o build completo em
`https://agenda.magrinapp.com`, sem abrir portas no roteador. A API e o frontend
ficam no mesmo processo local em `127.0.0.1:3100`; o MariaDB não é publicado.

O código publicado vem sempre da branch `main`, mantida em um worktree local
separado. O diretório principal pode continuar em `develop` ou numa branch de
funcionalidade sem alterar a demonstração. Prepare o worktree uma vez:

```powershell
pnpm.cmd stable:prepare
```

Depois do provisionamento descrito em `docs/CLOUDFLARE.md`, use dois terminais:

```powershell
pnpm.cmd stable
pnpm.cmd tunnel
```

Esse fluxo mantém `APP_ENV=development` de forma explícita. Ele gera builds
estáveis, aplica migrations pendentes e força o cookie de sessão como `Secure`
durante o acesso HTTPS. `pnpm remote` rejeita qualquer branch diferente de
`main`. Não representa a infraestrutura de produção definitiva.

Consulte `docs/README.md` antes de alterações de arquitetura ou escopo.
