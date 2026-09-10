# AGENTS.md

## Escopo

Estas instruções valem para todo o repositório.

## Projeto

Este projeto implementará um sistema web de agendamento de atendimentos da
coordenação do curso de Ciência da Computação.

O repositório está na fase de alinhamento e preparação. Antes de criar ou
alterar o scaffold, leia a documentação em `docs/`, principalmente:

- `docs/README.md`;
- `docs/PRODUCT_SCOPE.md`;
- `docs/ARCHITECTURE.md`;
- `docs/REQUIREMENTS.md`;
- `docs/OPEN_QUESTIONS.md`.

Não trate itens de `docs/OPEN_QUESTIONS.md` como decisões aprovadas.

## Objetivo do MVP

Entregar o fluxo vertical mínimo:

1. a coordenação publica disponibilidades;
2. o aluno consulta horários livres;
3. o aluno agenda um atendimento presencial ou online;
4. o backend confirma a reserva de forma concorrente e segura;
5. a coordenação visualiza a agenda e registra o atendimento;
6. o atendimento é classificado como resolvido, não resolvido ou em tratativa;
7. o dashboard apresenta os quatro indicadores principais;
8. notificações de WhatsApp são tentadas sem comprometer a operação principal.

## Stack aprovada

- Runtime do frontend: Node.js 24 LTS e pnpm 11.
- Frontend: Vue 3, TypeScript, Vite e Tailwind CSS.
- Backend: Python e Flask, expondo API REST com JSON.
- Persistência: MariaDB, SQLAlchemy 2.x e Alembic/Flask-Migrate.
- Notificações: Twilio API for WhatsApp; Sandbox durante desenvolvimento.
- Arquitetura: monólito modular em um único repositório.

Não introduza outro framework principal, ORM, banco, microserviços ou broker de
mensagens sem uma decisão arquitetural registrada em `docs/DECISIONS.md`.

## Fronteiras arquiteturais

- O frontend não acessa o banco e não é a fonte de verdade de regras críticas.
- Rotas/controllers devem tratar HTTP e delegar regras para serviços de
  aplicação ou domínio.
- O acesso ao banco deve passar pelo SQLAlchemy.
- A integração com a Twilio deve permanecer atrás do módulo de notificações.
- Módulos de domínio não devem importar nem chamar a SDK da Twilio diretamente.
- Auditoria e histórico não devem ser misturados com logs técnicos.
- A primeira versão deve permanecer um monólito modular.

Estrutura alvo inicial:

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
    audit/
    models/
    extensions.py
  migrations/
  tests/
  requirements.txt
  run.py
docs/
```

A estrutura pode ser refinada durante o scaffold, desde que preserve as
responsabilidades descritas em `docs/ARCHITECTURE.md`.

## Regras de domínio obrigatórias

- Um horário não pode possuir mais de um agendamento ativo.
- Um aluno não pode possuir agendamentos conflitantes.
- A disponibilidade deve ser validada novamente na confirmação.
- A proteção contra dupla reserva deve existir no banco e no backend; uma
  checagem prévia no frontend não é suficiente.
- A confirmação do agendamento deve ocorrer em transação.
- Cada agendamento deve possuir protocolo único.
- Um atendimento realizado deve estar associado a um agendamento.
- Cancelamentos e ausências não são atendimentos resolvidos.
- Demandas em tratativa devem registrar informação mínima de continuidade.
- Alterações administrativas relevantes devem ser auditáveis.
- Registros necessários ao histórico não devem ser apagados fisicamente sem
  política explícita de retenção.

Quando uma regra depender de definição institucional ainda pendente, consulte
`docs/OPEN_QUESTIONS.md` e não escolha silenciosamente uma interpretação.

## Regra obrigatória de notificações

Uma falha no WhatsApp nunca deve desfazer um agendamento válido.

O fluxo deve ser:

1. validar;
2. persistir e concluir a transação;
3. tentar notificar;
4. registrar sucesso ou falha para diagnóstico e reenvio futuro.

Nunca mantenha credenciais da Twilio no código, no frontend ou em arquivos
versionados.

## Segurança, privacidade e LGPD

- Aplicar autenticação e autorização no backend.
- Um aluno só pode acessar seus próprios agendamentos e dados autorizados.
- Observações internas da coordenação não podem ser expostas ao aluno.
- Senhas devem usar hash seguro e nunca ser registradas em texto puro.
- Validar e sanitizar toda entrada externa.
- Não expor dados pessoais em URLs, logs ou mensagens de erro.
- Segredos devem ficar em variáveis de ambiente; versionar apenas exemplos sem
  valores reais.
- Usar consultas parametrizadas por meio do ORM.
- Proteger operações administrativas e registrar o responsável.
- Tratar requisitos de retenção, backup e restauração antes da produção.

## Convenções de implementação

### Backend

- Preferir módulos pequenos e responsabilidades explícitas.
- Manter regras de negócio fora de views/routes sempre que possível.
- Tipar o código Python e validar payloads na fronteira HTTP.
- Versionar toda alteração estrutural do banco por migration.
- Responder erros em formato consistente, sem stack trace ou detalhes internos.
- Tratar data e hora com timezone explícito; a definição oficial permanece em
  `docs/OPEN_QUESTIONS.md`.

### Frontend

- Usar pnpm a partir da raiz do workspace; não gerar `package-lock.json` ou
  `yarn.lock`.
- TypeScript é obrigatório.
- Centralizar consumo da API em `services`.
- Manter componentes reutilizáveis e estados de loading, vazio, erro e sucesso.
- Garantir navegação por teclado, foco visível, rótulos e mensagens textuais.
- Não duplicar no frontend uma regra crítica sem equivalente no backend.

## Testes mínimos

Antes de considerar uma alteração concluída, executar os scripts existentes de
lint, testes e build e cobrir proporcionalmente o risco alterado.

O conjunto mínimo deve verificar:

1. concorrência: duas confirmações não reservam o mesmo horário;
2. autorização: aluno não acessa dados de outro aluno;
3. conflito: aluno não cria compromissos sobrepostos;
4. transação: falha de notificação não remove o agendamento;
5. indicadores: cancelamentos e ausências seguem a regra documentada;
6. auditoria: operação administrativa registra ator, ação e data;
7. acessibilidade dos fluxos principais;
8. migrations aplicam e revertem de forma previsível.

Enquanto não existirem scripts executáveis, registre essa limitação na entrega e
atualize `docs/ROADMAP.md`.

## Documentação viva

- Mudança de arquitetura: atualizar `docs/ARCHITECTURE.md` e
  `docs/DECISIONS.md`.
- Mudança de regra ou escopo: atualizar `docs/PRODUCT_SCOPE.md` e
  `docs/REQUIREMENTS.md`.
- Decisão institucional pendente: atualizar `docs/OPEN_QUESTIONS.md`.
- Mudança de endpoint ou contrato: atualizar `docs/API_CONTRACT.md`.
- Mudança de entidade, relacionamento ou estado: atualizar
  `docs/DOMAIN_MODEL.md`.
- Avanço de fase: atualizar `docs/ROADMAP.md`.

Não deixe a documentação descrever comportamento que o código já não possui.

## Critério de pronto

Uma funcionalidade só está pronta quando:

- funciona no fluxo completo correspondente;
- respeita as regras de domínio, segurança e autorização;
- possui migration quando altera persistência;
- possui testes proporcionais ao risco;
- trata erros de forma compreensível;
- atualiza a documentação afetada;
- não transforma uma pendência de negócio em decisão implícita.
