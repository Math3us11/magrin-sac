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
proteção efetiva no MariaDB contra sobreposição entre agendamentos ativos no
mesmo período da janela.

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

## ADR-019 — Envelope híbrido para credenciais de senha

**Estado:** aceita.

Login, cadastro administrativo e definição da senha no primeiro acesso enviam a
credencial em um envelope híbrido. O navegador gera uma chave AES-GCM de 256
bits para cada operação e protege essa chave com a chave pública RSA-OAEP
SHA-256 fornecida pelo backend. O envelope autentica finalidade, `keyId` e
horário do servidor e possui validade curta.

A chave privada RSA permanece exclusivamente no backend, configurada por
`PASSWORD_ENCRYPTION_PRIVATE_KEY_BASE64` ou por um cofre de segredos. Ela nunca
é exposta por variável `VITE_*`, persistida em `system_parameters` ou copiada
para o banco. Em desenvolvimento e testes, a ausência da variável cria uma
chave efêmera por processo; produção falha na inicialização sem uma chave
configurada.

Motivo: impedir que a senha apareça em texto legível no corpo JSON observado
entre as camadas da aplicação, sem distribuir um segredo simétrico no bundle do
frontend. Algoritmos e primitivas são fornecidos por Web Crypto no cliente e
`node:crypto` no servidor; não há algoritmo criptográfico próprio.

Consequência: HTTPS continua obrigatório, porque o envelope não substitui a
autenticação do servidor, a integridade do tráfego ou as proteções contra replay
do TLS. O backend descriptografa a senha apenas em memória e mantém Argon2id
como proteção persistente. Rotação da chave altera o `keyId`; o cliente consulta
a chave pública imediatamente antes de cada envio.

Na definição da senha inicial, a finalidade autenticada do envelope é
`first-access-password`. A confirmação permanece apenas na interface; o backend
recebe a nova senha uma vez, cria um novo hash Argon2id e nunca devolve a senha
temporária.

A confirmação de exclusão de usuário também usa o envelope, com a finalidade
isolada `user-deletion-confirmation`. Assim, a senha administrativa não aparece
em texto legível no payload e o envelope não pode ser reutilizado no login ou em
outro fluxo.

## ADR-020 — Exclusão lógica de cadastro indevido

**Estado:** aceita.

Um administrador com `users.manage` pode excluir um cadastro de usuário criado
indevidamente após confirmar a própria senha. A operação é lógica: desativa o
usuário, registra `deleted_at`, `deleted_by` e `updated_by`, revoga suas sessões
ativas e preserva vínculos e histórico. A própria conta do administrador não
pode ser excluída por esse fluxo.

Motivo: retirar da operação cotidiana um cadastro que não deveria existir sem
apagar evidências, autoria ou dados necessários à integridade histórica.

Consequência: e-mail e CPF continuam reservados depois da exclusão lógica. O
fluxo não substitui a futura política institucional de retenção, anonimização e
atendimento de solicitações LGPD.

## ADR-021 — Agenda própria do professor

**Estado:** aceita.

O primeiro recorte da agenda atribui ao professor a capacidade
`availability.manage.own`. Ela libera a rota `/professor/agenda` e representa
somente as disponibilidades pertencentes ao usuário autenticado. Administração
de agendas de terceiros deverá usar uma capacidade separada.

Motivo: oferecer um início simples e aderente ao menor privilégio, sem misturar
a agenda pessoal do professor com poderes globais da coordenação.

Consequência: o backend futuro deverá derivar o proprietário da sessão, e não de
um identificador arbitrário enviado pelo frontend. Antecedência mínima, janela
de agendamento e alterações sobre horários reservados continuam pendentes em
`OPEN_QUESTIONS.md`.

## ADR-022 — Formulário inicial de disponibilidade e timezone

**Estado:** aceita.

O timezone institucional é `America/Porto_Velho`. O primeiro cadastro de
disponibilidade permite que o professor escolha livremente data, início, fim e
uma ou ambas as modalidades `presencial` e `online`. O término deve ser
posterior ao início, o período deve estar no futuro e intervalos preparados para
a mesma data não podem se sobrepor. Sala e link não fazem parte deste recorte.

A interface monta uma lista de horários para revisão antes da publicação. O
formulário usa o componente genérico `AppModal`; fluxos modais com domínio ou
complexidade próprios podem ganhar componentes especializados sem ampliar a
responsabilidade da base.

Motivo: permitir intervalos reais da agenda sem impor uma duração ainda não
aprovada, tornar o fuso explícito e reduzir cadastros repetitivos por meio da
revisão em lote.

Consequência: a futura API deverá repetir todas as validações, verificar
conflitos persistidos e derivar o professor da sessão. Instantes serão
normalizados na persistência e convertidos para `America/Porto_Velho` nas
fronteiras. Sala e link poderão ser modelados depois sem fazer parte do contrato
inicial.

As modalidades são normalizadas pela opção de sistema `APPOINTMENT_MODALITY`,
com os itens atômicos `presencial` e `online`. A tabela
`availability_modalities` relaciona cada disponibilidade a um ou aos dois
itens. “Ambas” não é persistida como modalidade, pois representa a combinação
das duas possibilidades e não uma escolha válida de um agendamento.

O envio do lote é atômico. Dentro da transação, o backend bloqueia a linha do
professor, consulta sobreposições e somente então persiste as disponibilidades e
seus vínculos. Isso serializa publicações concorrentes da mesma agenda e impede
que duas requisições passem simultaneamente pela verificação.

O modo “Dias da semana” não cria uma regra recorrente no banco. O frontend
expande a semana selecionada, os dias escolhidos e cada janela em disponibilidades
concretas, mostra o resultado na revisão e envia o mesmo lote do modo por data.
Uma faixa representa uma janela consumível por vários agendamentos com
intervalos não sobrepostos, e não uma reserva indivisível com duração fixa.

## ADR-023 — Publicação temporária por Cloudflare Tunnel

**Estado:** aceita para demonstração; não define produção.

Para apresentações externas durante o desenvolvimento, um túnel nomeado da
Cloudflare publica um único serviço HTTP preso a `127.0.0.1:3100`. O NestJS
entrega tanto `/api/*` quanto o build SPA do Vue, mantendo frontend e API na
mesma origem pública. Cloudflare Access restringe a entrada aos participantes
autorizados e o MariaDB permanece exclusivamente local.

O iniciador remoto mantém `APP_ENV=development`, altera apenas a configuração
efetiva dessa execução e força `AUTH_SESSION_COOKIE_SECURE=true`. Antes de iniciar
o backend ele gera os builds e aplica migrations; antes de iniciar o túnel, o
script confirma as credenciais, o health check do banco e a entrega do frontend.

Motivo: permitir demonstrações pelo domínio já administrado sem abrir portas no
roteador, separar API em outro hostname ou migrar prematuramente o NestJS e o
Sequelize para outro runtime.

Consequência: a aplicação depende do computador, MariaDB e conector locais
permanecerem ligados durante a apresentação. O fluxo não oferece SLA, backup,
alta disponibilidade nem resolve a pendência de infraestrutura de produção em
`OPEN_QUESTIONS.md`.

## ADR-024 — Main isolada como versão estável de demonstração

**Estado:** aceita.

A branch `main` é a única fonte permitida para o ambiente publicado pelo
Cloudflare Tunnel. Um worktree local em `.worktrees/stable` mantém essa versão
disponível simultaneamente ao diretório principal, que pode permanecer em
`develop` ou numa branch `feat/*`. O comando público `pnpm stable` executa a
`main` no worktree, e `pnpm remote` falha se for chamado em outra branch.

Promoções continuam explícitas: funcionalidades entram em `develop` e somente
uma revisão aprovada atualiza `main`. `pnpm stable:sync` apenas avança o worktree
por fast-forward até `origin/main`; ele não promove desenvolvimento nem cria
merge automaticamente.

O ambiente estável usa `STABLE_DB_DATABASE`, enquanto o desenvolvimento usa
`DB_DATABASE`. Os dois schemas podem viver no mesmo MariaDB, mas migrations e
dados de teste de uma versão não alteram a outra.

Motivo: permitir correções e funcionalidades em andamento sem mudar a versão
apresentada, além de evitar que migrations de desenvolvimento tornem o build
estável incompatível.

Consequência: uma nova versão somente chega ao domínio depois de ser integrada
à `main`, sincronizada no worktree e reiniciada. O worktree é gerado localmente,
fica ignorado pelo Git e não deve receber edições manuais.

## Como adicionar uma decisão

Registrar contexto, decisão, motivo, consequências e estado. Quando uma decisão
substituir outra, manter a anterior e marcá-la como superada.
