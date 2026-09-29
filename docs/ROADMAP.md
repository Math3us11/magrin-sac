# Plano inicial de implementação

## Estado

Sequência recomendada. A Fase 1 está em andamento: os scaffolds de frontend e
backend foram criados; o modelo físico de domínio permanece pendente.

## Fase 0 — Alinhamento essencial

Objetivo: remover as ambiguidades que alteram banco, autenticação e contratos.

Entregas:

- decidir autenticação e matriz mínima de permissões;
- decidir timezone;
- definir regras de disponibilidade, cancelamento e limite por aluno;
- validar conceito de realizado, ausência e estados da demanda;
- aprovar modelo de domínio inicial;
- aprovar os contratos do primeiro fluxo vertical.

Critério de saída: nenhum bloqueador do primeiro fluxo permanece implícito.

## Fase 1 — Scaffold e qualidade básica

Objetivo: criar a base executável do monorepo.

Entregas:

- [x] frontend Vue 3 + TypeScript + Vite + Tailwind;
- [x] paleta institucional por tokens e temas claro/escuro;
- [x] backend NestJS + TypeScript com configuração por ambiente;
- [x] validar MariaDB local e conexão Sequelize;
- [x] runner de migrations Umzug com `synchronize: false`;
- [x] migration inicial de identidade, sessões e configuração;
- [x] `.env.example` do frontend e `.gitignore` da raiz;
- [x] `.env.example` do backend sem segredos;
- [x] validar lint, formatação, testes e build do workspace;
- [x] health check do backend;
- [x] README da raiz com execução local do frontend e backend.
- [x] adicionar testes automatizados do backend com o test runner nativo do
  Node.js, sem Vite/Vitest.

Critério de saída: uma pessoa nova clona, configura e executa o projeto seguindo
somente a documentação.

## Fase 2 — Identidade e autorização

Objetivo: estabelecer usuários e fronteiras de acesso antes de dados sensíveis.

Entregas:

- [x] autenticação local e mecanismo de sessão aprovados;
- [x] login, logout e endpoint de identidade atual;
- [x] cliente web de sessão, tela de login responsiva, proteção de navegação e
  logout no frontend;
- [x] base de formulários reutilizáveis com AppForm, AppInput, AppButton,
  Vee Validate e schemas Yup;
- [x] validar usuário ativo, sessão revogada e expiração absoluta;
- [ ] criar de forma controlada a primeira conta de administrador;
- [ ] definir a validação institucional para futuro cadastro de aluno;
- [ ] aplicar o timeout por inatividade após aprovação dos tempos de sessão;
- usuários ativos/inativos no gerenciamento administrativo;
- perfis e permissões mínimas;
- proteção de rotas administrativas;
- testes de isolamento entre alunos.

Critério de saída: cada ator acessa somente as operações autorizadas.

## Fase 3 — Primeiro fluxo vertical de agendamento

Objetivo: provar a regra mais crítica ponta a ponta.

Entregas:

- coordenação cria disponibilidade;
- aluno consulta horários;
- aluno confirma agendamento;
- protocolo único;
- proteção concorrente no MariaDB;
- área de próximos agendamentos;
- agenda administrativa mínima;
- testes concorrentes e de autorização.

Critério de saída: duas requisições simultâneas nunca confirmam o mesmo horário.

## Fase 4 — Cancelamento e histórico

Objetivo: completar o ciclo da reserva sem perder rastreabilidade.

Entregas:

- cancelamento conforme regra aprovada;
- liberação controlada da disponibilidade;
- motivo e ator;
- trilha de auditoria;
- histórico do aluno e da coordenação.

Critério de saída: cancelamento altera a disponibilidade corretamente e preserva
o histórico.

## Fase 5 — Atendimento e demanda

Objetivo: registrar o resultado operacional.

Entregas:

- realização e ausência;
- observações internas;
- resolvido, não resolvido e em tratativa;
- solução, justificativa, encaminhamento e continuidade;
- histórico de transições;
- filtros administrativos essenciais.

Critério de saída: cada estado respeita seus campos obrigatórios e permissões.

## Fase 6 — Dashboard

Objetivo: fornecer os quatro indicadores confiáveis.

Entregas:

- totais realizado, resolvido, não resolvido e em tratativa;
- filtro por período;
- rastreabilidade dos registros que compõem cada total;
- testes de cálculo, cancelamento e ausência.

Critério de saída: mudanças nos atendimentos atualizam os indicadores sem
contadores divergentes.

## Fase 7 — WhatsApp

Objetivo: notificar sem comprometer o domínio.

Entregas:

- `NotificationService` e provider Twilio;
- configuração do Sandbox;
- confirmação e cancelamento;
- lembretes após definição do mecanismo de execução;
- persistência de tentativas;
- falhas sanitizadas e caminho de reenvio.

Critério de saída: indisponibilidade da Twilio não invalida agendamento.

## Fase 8 — Endurecimento e apresentação

Objetivo: preparar uma entrega segura e demonstrável.

Entregas:

- revisão de segurança e LGPD;
- acessibilidade dos fluxos principais;
- testes responsivos e nos navegadores-alvo;
- backup e restauração documentados;
- observabilidade mínima;
- seed ou roteiro de demonstração sem dados pessoais reais;
- revisão final da documentação.

## Próxima ação recomendada

Realizar uma reunião curta de domínio usando os seis primeiros bloqueadores de
`OPEN_QUESTIONS.md`. Depois, criar a migration inicial e implementar a Fase 3
como fluxo vertical, evitando construir todos os cadastros antes de provar a
reserva concorrente.
