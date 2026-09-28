# Decisões arquiteturais

## ADR-001 — Monorepo com monólito modular

**Estado:** aceita.

Frontend e backend ficam no mesmo repositório. O backend é uma única aplicação
NestJS organizada por módulos de negócio.

Motivo: reduzir custo operacional e facilitar o desenvolvimento em grupo no
MVP, sem impedir separações futuras sustentadas por necessidade real.

## ADR-002 — Vue 3 e TypeScript no frontend

**Estado:** aceita.

O frontend utiliza Vue 3, TypeScript, Vite e Tailwind CSS.

Motivo: stack definida no alinhamento técnico e adequada a uma interface
responsiva baseada em calendário, formulários e dashboard.

## ADR-003 — Flask e REST/JSON no backend

**Estado:** superada pela ADR-012.

O backend utilizava Python e Flask e oferecia contratos REST em JSON.

Motivo: centralizar autenticação, autorização, persistência e regras críticas em
uma API independente da interface.

## ADR-004 — SQLAlchemy e migrations versionadas

**Estado:** superada pela ADR-013.

O acesso ao MariaDB utilizava SQLAlchemy 2.x. Alterações estruturais usavam
Alembic/Flask-Migrate.

Motivo: Sequelize pertence ao ecossistema Node.js; SQLAlchemy fornece ORM,
transações e integração natural com o backend Python.

## ADR-005 — Twilio isolada no módulo de notificações

**Estado:** aceita.

A primeira integração de WhatsApp utiliza Twilio e o Sandbox em desenvolvimento.
A SDK é acessada somente por um provider dentro de `notifications`.

Motivo: permitir troca de provedor e impedir acoplamento do domínio a uma API
externa.

## ADR-006 — Notificação após a transação principal

**Estado:** aceita.

O agendamento é validado, persistido e confirmado antes da tentativa de envio.
Falha no WhatsApp é registrada, mas não desfaz o agendamento.

Motivo: disponibilidade de um serviço externo não pode comprometer a integridade
da agenda.

## ADR-007 — Concorrência protegida no banco e no backend

**Estado:** aceita.

A confirmação revalida a disponibilidade dentro de uma transação e depende de
proteção efetiva no MariaDB contra mais de um agendamento ativo no horário.

Motivo: verificações no frontend ou um `SELECT` anterior não impedem duas
requisições simultâneas.

## ADR-008 — Histórico preservado

**Estado:** aceita.

Agendamentos, atendimentos e ações administrativas necessários a auditoria não
devem ser removidos fisicamente por operações comuns. Desativação de usuário não
apaga o histórico.

Motivo: indicadores, rastreabilidade e responsabilidade administrativa dependem
dos registros anteriores.

## ADR-009 — Indicadores derivados dos registros

**Estado:** aceita.

O dashboard calcula os indicadores a partir de agendamentos e atendimentos, com
filtros e critérios documentados, em vez de manter contadores independentes.

Motivo: evitar divergência entre o histórico e os totais apresentados.

## ADR-010 — Node.js 24 no monorepo

**Estado:** aceita.

Frontend e backend utilizam Node.js 24 LTS. A versão principal é registrada em
`.nvmrc` e restringida no campo `engines` dos pacotes.

Motivo: manter um runtime LTS único e reproduzível para desenvolvimento, testes
e build.

## ADR-011 — pnpm como gerenciador do workspace

**Estado:** aceita.

O monorepo utiliza pnpm 11, fixado pelo campo `packageManager` da raiz. O
workspace é declarado em `pnpm-workspace.yaml` e mantém um único
`pnpm-lock.yaml` na raiz.

Não devem ser versionados `package-lock.json` ou `yarn.lock`.

Motivo: compartilhar o armazenamento de dependências, executar scripts pela
raiz e preparar o repositório para novos pacotes frontend sem múltiplos
lockfiles.

## ADR-012 — Node.js 24, NestJS e TypeScript no backend

**Estado:** aceita.

O backend utiliza o mesmo Node.js 24 LTS do frontend, com NestJS e TypeScript
ESM. A API continua REST/JSON e o backend não usa Vite nem Vitest.

Motivo: unificar o runtime do monorepo e adotar a estrutura modular já conhecida
pela equipe, com módulos, controllers, services e DTOs explícitos.

Consequência: a ADR-003 fica superada. O frontend continua usando Vite e Vitest
sem compartilhar essas ferramentas com o backend.

## ADR-013 — Sequelize e Umzug no MariaDB

**Estado:** aceita.

O backend utiliza Sequelize 6, sequelize-typescript e o driver `mariadb`.
Alterações de schema são executadas por migrations Umzug versionadas.

`synchronize` permanece desativado e `sync({ alter: true })` não deve ser
usado. Models ficam centralizados em `backend/src/models` e são registrados
explicitamente.

Motivo: manter o banco controlado por migrations e seguir a organização adotada
no projeto de referência `magrin-appointment-api`.

Consequência: a ADR-004 fica superada.

## ADR-014 — ESLint e Prettier como ferramentas de qualidade

**Estado:** aceita.

Frontend e backend usam ESLint para análise estática e Prettier para formatação.
Oxlint não faz parte do workspace.

Motivo: manter o conjunto de ferramentas previsível entre os pacotes e evitar
regras duplicadas ou divergentes.

## ADR-015 — Paleta institucional baseada em tokens semânticos

**Estado:** aceita.

O frontend parte das cores institucionais `#ce0055`, `#0054b2` e `#ffffff`.
As telas consomem tokens semânticos centralizados, com tema claro como padrão e
tema escuro alternável. A preferência é persistida localmente pelo frontend.

As logos oficiais são usadas conforme o contraste da superfície e não são
recoloridas por filtros CSS.

Motivo: preservar a identidade da faculdade e permitir evolução visual e
manutenção dos dois temas sem espalhar cores fixas pelos componentes.

Consequência: novos componentes devem usar os tokens documentados em
`docs/DESIGN_SYSTEM.md`; exceções visuais precisam ser incorporadas à base de
tokens quando forem recorrentes.

## ADR-016 — Autenticação local com JWT e sessão stateful

**Estado:** aceita.

O MVP utiliza contas locais. Senhas são persistidas somente por hash seguro. A
credencial de acesso é um JWT assinado com HS256, transportado em cookie
`HttpOnly`; não haverá refresh token no primeiro fluxo.

O JWT contém apenas identificadores mínimos e seu `jti` é associado a uma
sessão no MariaDB. Verificar assinatura, algoritmo, emissor, audiência e
expiração é necessário, mas não suficiente: o backend também valida revogação,
inatividade, expiração absoluta e estado ativo do usuário. Os valores dos
timeouts ainda dependem de aprovação registrada em `OPEN_QUESTIONS.md`.

Motivo: usar um formato de token padronizado sem perder logout imediato,
timeout por inatividade e desativação de usuário exigidos pelo sistema interno.

Consequência: a solução não é stateless e toda requisição autenticada consulta a
sessão. Uma futura autenticação institucional poderá substituir a etapa de
login, preservando a sessão interna da aplicação.

## ADR-017 — Parâmetros operacionais separados de segredos

**Estado:** aceita.

Parâmetros operacionais não secretos e URLs de integrações podem ser mantidos no
MariaDB. Configurações necessárias para conectar ao próprio banco e valores
secretos permanecem em variáveis de ambiente ou em um cofre de segredos.

As colunas de endpoint guardam somente o nome da variável externa que contém a
credencial. Helpers de configuração não alteram `process.env`; eles expõem uma
interface tipada com precedência e cache explícitos.

Motivo: a aplicação não pode depender do banco para obter as credenciais usadas
para abrir a conexão e uma cópia de segredos na mesma base amplia o impacto de
um vazamento.

## ADR-018 — Auditoria estrutural e identificadores numéricos

**Estado:** aceita.

As tabelas do primeiro recorte usam `created_at/by`, `updated_at/by` e
`deleted_at/by`. As colunas de autoria aceitam `NULL` apenas para bootstrap ou
ações técnicas sem usuário autenticado e referenciam `users` quando preenchidas.

As chaves numéricas também podem identificar recursos na API interna. A
autorização é sempre recalculada no backend e nunca depende de o identificador
ser imprevisível. Exclusão lógica não libera a unicidade de e-mail ou CPF.

O CPF é armazenado normalizado com 11 dígitos para simplificar cadastro e
validação. O model o exclui de consultas padrão e ele não deve aparecer em logs,
URLs ou respostas sem necessidade explícita.

Motivo: preservar rastreabilidade e manter o primeiro modelo simples, sem
permitir que uma identidade excluída seja recriada silenciosamente.

## Como adicionar uma decisão

Registrar contexto, decisão, motivo, consequências e estado. Quando uma decisão
substituir outra, manter a anterior e marcá-la como superada.
