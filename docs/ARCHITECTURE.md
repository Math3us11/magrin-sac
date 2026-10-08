# Arquitetura do Sistema de Agendamento

## Estado

Arquitetura alvo aprovada para o início do MVP. Frontend e backend possuem
scaffolds executáveis no workspace pnpm.

## Princípio

Construir um monólito modular cliente-servidor. Frontend e backend vivem no
mesmo repositório, comunicam-se por uma API REST e evoluem por contratos
explícitos.

```text
Vue 3 + TypeScript
        |
        | HTTP / JSON
        v
Node.js 24 + NestJS + TypeScript
        |
        +------ Sequelize ------ MariaDB
        |
        +------ NotificationService ------ Twilio WhatsApp Sandbox
```

## Stack

| Camada            | Tecnologia                                                                  |
| ----------------- | --------------------------------------------------------------------------- |
| Runtime           | Node.js 24 LTS, pnpm 11                                                     |
| Frontend          | Vue 3, TypeScript, Vite, Tailwind CSS, Vee Validate 4, Yup, Iconify e Maska |
| Backend           | NestJS, TypeScript                                                          |
| API               | REST, JSON                                                                  |
| ORM               | Sequelize 6, sequelize-typescript                                           |
| Migrações         | Umzug                                                                       |
| Banco             | MariaDB                                                                     |
| WhatsApp          | Twilio API for WhatsApp                                                     |
| Teste de WhatsApp | Twilio WhatsApp Sandbox                                                     |
| Arquitetura       | Monólito modular                                                            |

## Frontend implementado

O diretório `frontend/` foi criado com:

- Vue 3 e TypeScript;
- Vite e plugin oficial do Vue;
- Tailwind CSS integrado pelo plugin oficial do Vite;
- Vue Router;
- Pinia preparado para estado compartilhado;
- Vitest e Vue Test Utils;
- ESLint e Prettier;
- estrutura inicial de `assets`, `components`, `composables`, `router`,
  `services`, `stores`, `types` e `views`.
- cliente HTTP baseado em `fetch`, sempre com cookies habilitados;
- store Pinia de autenticação e restauração da sessão por `GET /api/me`;
- tela de login responsiva, proteção de navegação e logout;
- shell autenticado com header e sidebar responsiva alimentada pela API;
- store de navegação com permissões atuais e estados de carregamento e erro;
- store global de notificações e `AppNotify` para feedback de sucesso,
  informação, atenção e erro interpretado pelo cliente HTTP;
- store global de loading com operações identificadas, mantendo o `AppLoading`
  ativo enquanto existir ao menos uma operação bloqueante em andamento;
- componentes básicos de formulário em components/basic, integrados ao
  Vee Validate e a schemas Yup;
- `AppLoading` reutilizável para bloquear visualmente a interface durante
  operações globais, com descrição acessível e ícone configurável, montado uma
  única vez no componente raiz;
- `AppTable` reutilizável com definição declarativa de colunas, tamanhos,
  registros, busca, filtros, paginação controlada, slots de célula e estados de
  carregamento, vazio e erro, além de área tabular com altura limitada e busca
  textual submetida explicitamente;
- `AppTextarea` reutilizável, integrado ao Vee Validate, para campos textuais
  multilinha com ajuda, erro acessível e estados de leitura ou bloqueio;
- `AppSelect` reutilizável para seleções simples controladas ou integradas ao
  Vee Validate, mantendo o mesmo foco e tratamento de erro dos demais campos;
- máscaras opcionais de entrada encapsuladas no `AppInput` com Maska;
- ícones por Iconify Vue com dados Lucide empacotados localmente;
- wizard administrativo de usuários com cursos, períodos e matérias carregados
  da API e matérias filtradas pelos cursos selecionados;
- view administrativa compartilhada para visualizar e editar usuários, com
  campos bloqueados no modo de consulta e as mesmas regras acadêmicas do
  cadastro no modo de edição;
- workspace pnpm configurado na raiz do monorepo.

Views de fluxos específicos são agrupadas por menu pai. Por exemplo, as telas
de administração ficam em `views/administration/`; views globais, como login e
início, permanecem diretamente em `views/`.

A origem da futura API usa `VITE_API_BASE_URL`, com fallback para `/api`.
Durante o desenvolvimento, o Vite encaminha `/api` para o backend local na
porta 3000.

O backend usa o pacote `mariadb` como driver do Sequelize. O Vite e o Vitest
permanecem exclusivos do frontend.

### Ambiente remoto de demonstração

Para apresentações, o monólito pode ser publicado temporariamente por um túnel
nomeado da Cloudflare:

```text
Internet
  → https://agenda.magrinapp.com
  → Cloudflare Access
  → Cloudflare Tunnel
  → http://127.0.0.1:3100
       ├── /api/* → controllers NestJS
       └── demais GETs → build SPA do Vue
  → MariaDB local, sem exposição pública
```

Nesse modo, o NestJS serve os arquivos gerados em `frontend/dist` e aplica
fallback para `index.html` somente em requisições GET não pertencentes a
`/api`. A branch `main` fica materializada no worktree ignorado
`.worktrees/stable`, enquanto o diretório principal permanece livre para
`develop` e branches de funcionalidade. `pnpm stable` inicia o comando remoto
dentro desse worktree; o iniciador rejeita qualquer branch diferente de `main`.

O banco também é isolado: `DB_DATABASE` pertence ao desenvolvimento e
`STABLE_DB_DATABASE` identifica o schema usado pela demonstração. O comando
estável compila os dois pacotes, cria o banco quando necessário, aplica suas
migrations e inicia o serviço preso ao loopback. `pnpm tunnel` só inicia o
conector depois de validar credencial, health check com banco alcançável e
entrega da SPA.

O ambiente permanece `APP_ENV=development`, pois esta é uma demonstração do
sistema ainda em construção. Apesar disso, a execução remota força o cookie de
sessão como `Secure`, usa HTTPS na origem pública e restringe `CORS_ORIGIN` ao
hostname configurado. Cloudflare Access deve ser criado antes da rota DNS. Essa
topologia não define hospedagem de produção, disponibilidade contínua, backup ou
responsabilidade operacional.

Os guards do Vue Router melhoram a navegação, mas não são fronteira de
segurança. Cada operação protegida continua validando autenticação e autorização
no backend.

### Identidade visual e temas

O frontend usa tokens CSS semânticos integrados ao Tailwind. A paleta parte das
cores institucionais `#ce0055`, `#0054b2` e `#ffffff`, com variações próprias
para contraste em tema claro e escuro. O tema claro é o padrão; a preferência
selecionada é aplicada ao elemento `html` e persistida no navegador pelo
composable `useTheme`.

Componentes consomem responsabilidades como superfície, conteúdo, borda, foco,
marca e estado, sem repetir valores hexadecimais. As regras completas e o uso
das logos estão em `docs/DESIGN_SYSTEM.md`.

## Backend implementado

O diretório `backend/` foi criado com:

- Node.js 24, NestJS e TypeScript ESM com resolução `NodeNext`;
- configuração de ambiente validada por Joi;
- Sequelize, sequelize-typescript e driver `mariadb`;
- `synchronize: false` e registro explícito de models;
- runner de migrations Umzug;
- comando idempotente para criar o banco configurado;
- health check em `GET /api/health`, incluindo autenticação no banco;
- login, logout e identidade atual com sessão stateful em cookie `HttpOnly`;
- envelope híbrido de credenciais com AES-GCM e RSA-OAEP antes do envio;
- hash e verificação de senhas com Argon2id;
- rotina interna e idempotente para provisionar a primeira conta
  administrativa sem endpoint público;
- módulos iniciais de autenticação, usuários, disponibilidade, agendamentos,
  atendimento, dashboard, notificações e auditoria;
- ESLint e Prettier, sem Vite, Vitest ou Oxlint.

O módulo de autenticação já aplica a separação entre controller, service e DTOs.
Decorators, guards, helpers e tipos transversais ficam diretamente em `src/`
para reutilização entre os módulos de domínio.

## Estrutura alvo inicial

```text
frontend/
  src/
    assets/
    icons/
    components/
      basic/
        AppButton.vue
        AppForm.vue
        AppInput.vue
    views/
      administration/
    router/
    stores/
    services/
    types/
    composables/
    validations/
backend/
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
      auth/
      navigation/
      users/
      availability/
      appointments/
      attendance/
      dashboard/
      notifications/
      audit/
    types/
docs/
```

## Responsabilidades do frontend

- apresentar autenticação, calendário, formulários e dashboards;
- controlar navegação e estado de interface;
- centralizar chamadas HTTP em `services`;
- oferecer validação de experiência, sem substituir validação do backend;
- apresentar loading, vazio, erro e sucesso;
- manter acessibilidade e responsividade.

O frontend não deve conter acesso direto ao banco, segredos, credenciais da
Twilio nem decisões finais de autorização ou concorrência.

## Responsabilidades do backend

### `modules/auth`

Autenticação local, sessão e autorização. `AuthController` trata a fronteira
HTTP e `AuthService` coordena usuário e sessão. A infraestrutura compartilhada
em `src/guards`, `src/decorators` e `src/helpers` protege a origem, resolve a
identidade atual e encapsula Argon2id, JWT e cookie.

Cada helper transversal possui pasta, service e module próprios. O
`HelpersModule` raiz atua somente como agregador e reexporta `CookieModule`,
`JwtHelperModule` e `PasswordModule`.

Controllers protegidos podem combinar `SessionAuthGuard` com `@CurrentUser()`.
O guard valida token, sessão e usuário uma vez e o decorator entrega a identidade
já autenticada ao controller, sem duplicar leitura de cookie nos módulos.
Sessões cujo usuário ainda precisa substituir a senha temporária são bloqueadas
pelo mesmo guard em todos os recursos, exceto nos handlers explicitamente
marcados para identidade atual e conclusão do primeiro acesso. A troca atualiza
o hash e revoga as sessões ativas em uma única transação.

### `modules/users`

Usuários, alunos, perfis, permissões, ativação e desativação. O primeiro recorte
expõe, somente para quem possui `users.manage`, os catálogos necessários ao
cadastro administrativo: cursos ativos, períodos acadêmicos e relações ativas
entre curso e matéria. A listagem administrativa é paginada e seleciona somente
campos não sensíveis necessários à tabela. A consulta individual e a atualização
completa também exigem `users.manage`; somente a consulta individual protegida
retorna CPF, telefone e vínculos para a manutenção administrativa.

### `modules/navigation`

Consulta a navegação do usuário autenticado, monta a árvore de menus e remove
agrupadores sem filhos permitidos. O módulo usa o serviço de permissões
exportado por `modules/auth`, mas não concede autorização por conta própria.

### `modules/availability`

Datas, horários, duração, modalidade, bloqueios e conflitos da agenda publicada.

### `modules/appointments`

Criação, consulta, cancelamento, protocolo, regras do aluno e reserva segura da
disponibilidade. O primeiro recorte implementado consulta as janelas ativas por
mês e modalidade, desconta os intervalos de agendamentos confirmados e devolve
somente trechos livres e a identificação pública do professor. A confirmação
usa transação, locks da conta e da disponibilidade, revalidação de conflitos e
protocolo aleatório único antes de responder ao frontend. A área autenticada do
aluno consulta próximos compromissos, histórico paginado ou um período de até
62 dias para o calendário; em todos os casos o serviço aplica o identificador
da sessão no filtro e não aceita identidade de aluno enviada pelo cliente.

### `modules/attendance`

Realização, ausência, observações, solução, encaminhamento e evolução da demanda.

### `modules/dashboard`

Consultas agregadas e rastreáveis aos registros que compõem os indicadores.

### `modules/notifications`

Orquestração, porta do provedor WhatsApp, tentativas e falhas. Nenhum outro
módulo importa a SDK do provedor. A implementação atual registra cada tentativa
em `notifications`, mascara o destino e usa um provider indisponível explícito
até a configuração futura da Twilio.

### `modules/audit`

Trilha de operações relevantes com ator, ação, alvo e data. Auditoria de negócio
não substitui logging técnico.

## Dependências permitidas

```text
NestJS controllers
          |
          v
application/domain services
          |
          +------> repositories / Sequelize
          |
          +------> NotificationService interface
                         |
                         v
                  Twilio provider
```

- Controllers podem depender de services, DTOs e autenticação.
- Services podem depender de models/repositórios e portas de integração.
- O provedor Twilio implementa uma porta do módulo de notificações.
- Regras de domínio não dependem de NestJS, Vue ou Twilio.
- Módulos não devem acessar tabelas de outros contextos por SQL solto.

Models Sequelize ficam centralizados em `backend/src/models` e são registrados
explicitamente. O backend usa `synchronize: false`; alterações de schema são
feitas somente por migrations Umzug versionadas.

### Primeiro recorte físico

A migration inicial cria `users`, `auth_sessions`, `system_parameters`,
`integration_endpoints`, `system_options` e `system_option_items`. Todas usam
exclusão lógica e colunas de autoria `created_by`, `updated_by` e `deleted_by`,
além dos respectivos timestamps.

`users.id` é a chave primária e também pode identificar o recurso na API. E-mail
e CPF possuem unicidade no banco. O CPF é armazenado normalizado com 11 dígitos,
sem pontuação, e permanece excluído das consultas padrão do model. A autorização
de cada recurso é obrigatória mesmo quando um identificador sequencial for
conhecido por outro usuário.

`courses` mantém o catálogo acadêmico usado pelos futuros vínculos de alunos,
professores e disciplinas. O primeiro recorte separa graduação de
pós-graduação e não presume modalidade ou grau acadêmico sem fonte consistente.

`subjects` mantém um catálogo independente de matérias com código, nome e estado
ativo. `course_subjects` relaciona as matérias disponíveis em cada curso sem
atribuir período ou afirmar uma versão de grade. `user_subjects` registra o
vínculo concreto de um usuário com essa combinação de curso e matéria. O item da
opção `ACADEMIC_PERIOD` é obrigatório para aluno e nulo para professor, cujo
período dependerá da futura oferta ou turma. O período do usuário não limita o
catálogo de matérias do curso.

O seed inicial de `course_subjects` reaproveita os grupos do levantamento que
originou o catálogo e cria 627 relações para dez cursos: Agronomia, Ciências
Contábeis, Biomedicina, Ciência da Computação, Medicina, Direito, Enfermagem,
Farmácia, Fisioterapia e Medicina Veterinária. Cursos sem matriz verificada
permanecem sem relações, em vez de receber associações inferidas.

O versionamento das grades curriculares, equivalências e conclusão de matérias
continuam separados até a validação institucional correspondente.

`auth_sessions` armazena o `jti` do JWT e o estado da sessão. O helper de JWT
assina e verifica apenas identificadores mínimos; depois da verificação
criptográfica, o backend consulta a sessão e o usuário antes de autorizar a
requisição. Portanto, o JWT não torna a autenticação stateless.

O access token trafega em cookie `HttpOnly`, `SameSite=Lax`, restrito ao caminho
`/api` e marcado como `Secure` em produção. O parser de cookies e CORS com
credenciais estão preparados. Login e logout validam `Origin` contra
`CORS_ORIGIN`; novos endpoints de escrita deverão reutilizar essa proteção.

O login cria a sessão dentro de uma transação e o logout marca `revoked_at`. O
guard valida JWT, vínculo com a sessão, expiração absoluta e usuário ativo antes
de anexar a identidade à requisição. `last_activity_at` já é atualizado, mas a
expiração por inatividade só será ativada depois da aprovação dos tempos de
sessão em `OPEN_QUESTIONS.md`.

### Navegação e permissões

A navegação dinâmica usa `menu_items`, com hierarquia por `parent_id`, ordem,
chave de ícone e nome de uma rota previamente registrada no Vue. O banco não
armazena componentes nem URLs executáveis. Agrupadores sem rota podem ficar
visíveis quando possuírem ao menos um filho autorizado.

`permissions` define capacidades estáveis do backend e
`user_type_permissions` associa essas capacidades aos tipos iniciais
`aluno`, `professor` e `administrador`. A permissão ligada ao menu serve
para filtrar a navegação, mas não substitui guards e validações de autorização
nos endpoints.

O conjunto inicial mantém `home` global para usuários autenticados. Professores
e administradores recebem `reports.dashboard.view`; alunos e administradores
recebem `appointments.create` e `appointments.read.own`. Os agrupadores
`reports` e `appointments` não possuem permissão própria e só devem aparecer
quando ao menos um filho permanecer visível.

Administradores também recebem `users.manage`, que libera o agrupador
`administration` e seu filho `administration.users`. A rota correspondente é
protegida no frontend. No backend, um decorator transversal declara a permissão
necessária e o guard recalcula a capacidade em cada requisição. Os endpoints de
opções, listagem, consulta, criação e edição de usuário reutilizam essa proteção;
a escrita também exige origem permitida.

As capacidades `availability.read.any` e `appointments.read.any` liberam para o
administrador a rota `administration-schedule` e os endpoints globais de
consulta. Elas não ampliam permissões `own`, não funcionam como bypass geral do
guard e não concedem escrita em nome de terceiros. A agenda geral seleciona
somente os dados necessários à operação e mantém credenciais e campos internos
fora das respostas de listagem.

Professores recebem `availability.manage.own`, que libera o agrupador `agenda`,
o item `agenda.availability` e a rota frontend `professor-availability`. Esta
capacidade representa somente a agenda do usuário autenticado. A administração
global usa as permissões distintas descritas acima e nunca amplia implicitamente
o escopo de `own`.

`availabilities` armazena o proprietário, os instantes em UTC e o estado
operacional. `availability_modalities` relaciona cada intervalo a um ou dois
itens ativos da opção `APPOINTMENT_MODALITY`; a combinação presencial + online
é exibida como “ambas”, sem criar um valor composto no catálogo. A publicação
de um lote bloqueia a linha do professor, verifica sobreposições e persiste
intervalos e modalidades na mesma transação. O frontend envia horários locais
de `America/Porto_Velho`, mas não envia o identificador do professor.

O cadastro administrativo envia um único payload ao módulo `users`. O
controller valida o DTO e delega ao service, que confere identidade única,
perfil e vínculos acadêmicos antes de criar `users` e `user_subjects` na mesma
transação. A senha temporária só chega ao service em memória e é convertida em
hash Argon2id antes da persistência. Na fronteira HTTP, o controller abre o
envelope híbrido emitido pelo frontend; services de domínio continuam recebendo
somente a senha transitória em memória. O frontend usa Web Crypto com AES-GCM e
RSA-OAEP, e HTTPS permanece obrigatório.

A atualização administrativa reutiliza as validações de identidade, perfil e
vínculo, mas não recebe senha. Usuário e vínculos são atualizados em uma única
transação; relações removidas ficam inativas, relações existentes podem ser
reativadas e `updated_by` identifica o ator.

### Configuração em camadas

Configurações de bootstrap e segredos continuam fora do banco. Isso inclui
conexão MariaDB, credenciais, tokens de provedores e a chave privada usada para
abrir envelopes de senha. A
tabela `system_parameters` guarda somente parâmetros operacionais não secretos.
`integration_endpoints` pode guardar URL e nomes das variáveis que apontam para
segredos externos, nunca os valores secretos.

Providers de configuração poderão combinar ambiente e banco, sem copiar dados
para `process.env`. Alterações de parâmetro em runtime exigirão estratégia
explícita de cache e invalidação quando o módulo correspondente for criado.

## Consistência da reserva

A criação do agendamento precisa combinar:

1. validação de entrada e autorização;
2. nova leitura da disponibilidade;
3. transação;
4. bloqueio da janela e consulta transacional para impedir sobreposição entre
   agendamentos ativos;
5. protocolo único;
6. commit;
7. notificação posterior ao commit.

A implementação bloqueia primeiro a conta solicitante e depois a disponibilidade
com `SELECT ... FOR UPDATE`. As consultas de sobreposição também são leituras
com lock, garantindo visão atual após a espera. Essa ordem evita dupla reserva
na mesma janela e conflito do mesmo usuário entre janelas diferentes; o fluxo
possui teste concorrente automatizado.

## Notificações

```text
agendamento confirmado
        |
        v
commit no MariaDB
        |
        v
NotificationService
        |
        +------ sucesso: registrar entrega
        |
        +------ falha: registrar tentativa e permitir diagnóstico
```

O MVP não exige broker. A implementação inicial pode realizar a tentativa após o
commit, desde que preserve o agendamento e deixe caminho explícito para reenvio.

## Configuração

O repositório versiona um único `.env.example` na raiz e nunca o `.env` real.
Frontend, backend e comandos de banco carregam o `.env` da raiz. O Vite expõe
somente variáveis `VITE_*`; esse prefixo não pode ser usado para segredos.
Variáveis previstas:

```env
APP_ENV=development
APP_HOST=127.0.0.1
APP_SERVE_FRONTEND=false
APP_TIMEZONE=America/Porto_Velho
VITE_API_BASE_URL=/api
PORT=3000
CORS_ORIGIN=http://localhost:5173
DB_DIALECT=mariadb
DB_HOST=localhost
DB_PORT=3306
DB_DATABASE=magrin_sac
STABLE_DB_DATABASE=magrin_sac_stable
DB_USERNAME=
DB_PASSWORD=
AUTH_SESSION_COOKIE_NAME=magrin_sac_session
AUTH_SESSION_COOKIE_SECURE=false
AUTH_SESSION_JWT_AUDIENCE=magrin-sac-frontend
AUTH_SESSION_JWT_ISSUER=magrin-sac-api
AUTH_SESSION_JWT_SECRET=
AUTH_SESSION_JWT_TTL_SECONDS=
PASSWORD_ENCRYPTION_PRIVATE_KEY_BASE64=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_WHATSAPP_FROM=
CLOUDFLARE_TUNNEL_ID=
CLOUDFLARE_PUBLIC_HOSTNAME=agenda.magrinapp.com
CLOUDFLARE_TUNNEL_ORIGIN=http://127.0.0.1:3100
CLOUDFLARE_TUNNEL_CREDENTIALS_FILE=
```

Novas variáveis devem ser adicionadas ao exemplo global e à validação do pacote
responsável por consumi-las.

## Evolução

Microserviços, filas, cache distribuído ou separação do módulo de notificações
somente devem ser considerados após evidência de necessidade. Antes disso, a
prioridade é uma aplicação simples, testável e consistente.
