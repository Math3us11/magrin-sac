# Decisões arquiteturais

## ADR-001 — Monorepo com monólito modular

**Estado:** aceita.

Frontend e backend ficam no mesmo repositório. O backend é uma única aplicação
Flask organizada por módulos de negócio.

Motivo: reduzir custo operacional e facilitar o desenvolvimento em grupo no
MVP, sem impedir separações futuras sustentadas por necessidade real.

## ADR-002 — Vue 3 e TypeScript no frontend

**Estado:** aceita.

O frontend utiliza Vue 3, TypeScript, Vite e Tailwind CSS.

Motivo: stack definida no alinhamento técnico e adequada a uma interface
responsiva baseada em calendário, formulários e dashboard.

## ADR-003 — Flask e REST/JSON no backend

**Estado:** aceita.

O backend utiliza Python e Flask e oferece contratos REST em JSON.

Motivo: centralizar autenticação, autorização, persistência e regras críticas em
uma API independente da interface.

## ADR-004 — SQLAlchemy e migrations versionadas

**Estado:** aceita.

O acesso ao MariaDB utiliza SQLAlchemy 2.x. Alterações estruturais usam
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

## ADR-010 — Node.js 24 no frontend

**Estado:** aceita.

O frontend utiliza Node.js 24 LTS. A versão principal é registrada em `.nvmrc`
e restringida no campo `engines` do pacote do frontend.

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

## Como adicionar uma decisão

Registrar contexto, decisão, motivo, consequências e estado. Quando uma decisão
substituir outra, manter a anterior e marcá-la como superada.
