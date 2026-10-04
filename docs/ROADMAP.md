# Plano inicial de implementação

## Estado

Sequência recomendada. A Fase 1 está em andamento: os scaffolds de frontend e
backend foram criados; o modelo físico de domínio permanece pendente.

## Fase 0 — Alinhamento essencial

Objetivo: remover as ambiguidades que alteram banco, autenticação e contratos.

Entregas:

- decidir autenticação e matriz mínima de permissões;
- [x] decidir o timezone institucional como `America/Porto_Velho`;
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
- [x] `.env.example` global na raiz, compartilhado por frontend, backend e
      comandos de banco, sem segredos reais;
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
- [x] feedback global reutilizável com AppNotify e classificação centralizada
      das respostas HTTP em sucesso, informação, atenção e erro;
- [x] overlay global reutilizável com AppLoading e store concorrente para
      operações bloqueantes;
- [x] validar usuário ativo, sessão revogada e expiração absoluta;
- [x] criar de forma controlada a primeira conta de administrador;
- [x] criar a base física de permissões, tipos de usuário e navegação
      hierárquica;
- [x] cadastrar a matriz e os menus iniciais de aluno, professor e
      administrador;
- [x] expor permissões e árvore de navegação do usuário autenticado;
- [x] consumir a navegação no frontend e criar o shell responsivo autenticado;
- [x] criar protótipo visual da index com atalhos por permissão e blocos
      ilustrativos para agenda, campanhas e avisos;
- [x] criar o menu administrativo e a view inicial de usuários, organizando
      views específicas por menu pai;
- [x] esboçar a listagem e criar o wizard responsivo de quatro etapas do cadastro
      administrativo, com vínculo acadêmico por perfil e revisão sem
      persistência simulada;
- [x] criar e popular o catálogo inicial de cursos, mantendo disciplinas como
      entidade futura separada;
- [x] criar e popular o catálogo inicial de matérias sem presumir vínculos com
      cursos ou vigência de grade curricular;
- [x] criar períodos acadêmicos de 1 a 12 e as relações iniciais
      curso-matéria e usuário-matéria-período;
- [x] popular 627 relações curso-matéria para os dez cursos com levantamento
      verificável, sem inferir relações para os demais;
- [x] expor cursos, períodos e matérias por curso em endpoints administrativos
      protegidos e consumir esses catálogos no wizard de usuários;
- [x] persistir o cadastro administrativo de aluno, professor e administrador
      com DTO condicional, senha temporária em Argon2id, auditoria, permissão e
      vínculos acadêmicos transacionais;
- [x] proteger os payloads de login e cadastro com envelope híbrido AES-GCM e
      RSA-OAEP, mantendo a chave privada fora do frontend e do banco;
- [x] criar a tabela reutilizável e listar usuários na index administrativa com
      busca submetida explicitamente, filtros, paginação, área de altura estável
      e coluna extensível de ações, sem expor CPF, telefone ou credenciais;
- [x] visualizar e editar usuários em uma view compartilhada, mantendo regras
      condicionais de perfil, atualização transacional e histórico dos vínculos;
- [x] excluir logicamente cadastros indevidos pela listagem, com confirmação da
      senha administrativa, autoria em `deleted_by` e revogação de sessões;
- [x] implementar a troca obrigatória da senha temporária no primeiro acesso na
      mesma tela de login, com bloqueio das demais APIs, novo hash e revogação
      das sessões temporárias;
- [ ] modelar versões de grade e relacionar cursos, matérias e períodos após
      validação institucional;
- [ ] definir a validação institucional para futuro cadastro de aluno;
- [ ] aplicar o timeout por inatividade após aprovação dos tempos de sessão;
- [x] usuários ativos/inativos no gerenciamento administrativo;
- perfis e permissões mínimas;
- proteção de rotas administrativas;
- testes de isolamento entre alunos.

Critério de saída: cada ator acessa somente as operações autorizadas.

## Fase 3 — Primeiro fluxo vertical de agendamento

Objetivo: provar a regra mais crítica ponta a ponta.

Entregas:

- [x] criar a rota inicial da agenda do professor, com permissão própria, menu,
      atalho e estado vazio sem dados simulados;
- [x] criar o `AppModal` genérico e o formulário de preparação em lote das
      disponibilidades, com validações locais;
- [x] persistir a publicação atômica das disponibilidades do professor, com
      modalidades normalizadas, timezone explícito e proteção contra conflitos;
- [x] gerar disponibilidades por semana selecionada, dias e múltiplas janelas no
      frontend, mantendo cada ocorrência concreta no contrato existente;
- [x] apresentar as disponibilidades publicadas em um calendário mensal
      reutilizável, com navegação e detalhamento do dia selecionado;
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
