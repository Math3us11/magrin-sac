# Contrato inicial da API

## Estado

Contrato evolutivo. O recorte de sessão descrito abaixo está implementado; os
demais recursos continuam como proposta até a implementação correspondente.

## Convenções

- Prefixo sugerido: `/api`.
- JSON para request e response, exceto respostas sem corpo.
- Datas e horários em ISO 8601 com timezone explícito.
- Identificadores numéricos podem ser usados nos recursos internos; toda
  consulta deve recalcular autorização e não pode depender da dificuldade de
  adivinhar um identificador. Dados pessoais não são expostos em URLs.
- Paginação para coleções administrativas.
- Erros com código estável, mensagem segura e detalhes por campo quando
  aplicável.
- Autorização sempre recalculada no backend.

Respostas de operações podem incluir `message` para feedback global. O campo
opcional `type` aceita `success`, `info`, `warning` ou `error`. Na ausência de
`type`, o frontend trata mensagens de respostas `2xx` como sucesso e classifica
erros pelo status HTTP. Consultas sem `message` não geram notificação de sucesso.

Exemplo de erro:

```json
{
  "error": {
    "code": "APPOINTMENT_SLOT_UNAVAILABLE",
    "message": "O horário selecionado não está mais disponível.",
    "fields": {}
  }
}
```

## Recursos

### Sessão

```text
POST /api/auth/login
POST /api/auth/logout
POST /api/auth/first-access/password
GET  /api/auth/credential-key
GET  /api/me
GET  /api/me/navigation
```

Não existe endpoint de cadastro público neste incremento. Contas de professor e
administrador são provisionadas internamente; o cadastro de aluno aguarda a
definição de uma validação institucional.

O login inicial usa e-mail e senha e cria uma sessão stateful no backend. O
access token é um JWT assinado e enviado exclusivamente em cookie `HttpOnly`;
ele não é retornado no JSON nem persistido pelo JavaScript. Não há refresh token
no MVP. O backend já controla revogação, duração absoluta e estado do usuário
consultando a sessão no MariaDB, além de registrar a última atividade. A
expiração por inatividade permanece pendente dos valores em
`OPEN_QUESTIONS.md`.

Antes do login, o cliente consulta `GET /api/auth/credential-key`. A resposta
não contém segredo e não deve ser armazenada em cache:

```json
{
  "algorithm": "RSA-OAEP-256+A256GCM",
  "keyId": "identificador-sha256-da-chave",
  "serverTime": 1791043200000,
  "publicKey": {
    "kty": "RSA",
    "n": "modulo-em-base64url",
    "e": "AQAB",
    "alg": "RSA-OAEP-256",
    "ext": true,
    "key_ops": ["encrypt"]
  }
}
```

Requisição de login:

```json
{
  "email": "aluno@example.com",
  "credential": {
    "algorithm": "RSA-OAEP-256+A256GCM",
    "ciphertext": "senha-cifrada-em-base64url",
    "encryptedKey": "chave-aes-protegida-em-base64url",
    "iv": "vetor-de-inicializacao",
    "issuedAt": 1791043200000,
    "keyId": "identificador-sha256-da-chave",
    "purpose": "login"
  }
}
```

Resposta `200` de login, também acompanhada de `Set-Cookie`:

```json
{
  "user": {
    "id": 3,
    "name": "Aluno Exemplo",
    "email": "aluno@example.com",
    "birthDate": "2000-01-02",
    "userType": "aluno",
    "mustChangePassword": true
  }
}
```

Credenciais inválidas respondem `401` com mensagem genérica, sem revelar se o
e-mail existe. `GET /api/me` retorna o mesmo objeto de usuário, sem o envelope
`user`. `POST /api/auth/logout` é idempotente, revoga a sessão reconhecida,
remove o cookie e responde `204` sem corpo.

Quando `mustChangePassword` for `true`, a sessão fica restrita à consulta de
`GET /api/me`, ao logout e à definição da senha inicial. Qualquer outro endpoint
protegido responde `403`; o bloqueio é aplicado pelo backend e não depende do
guard de navegação do frontend.

A mesma tela de login apresenta então uma segunda etapa. O cliente confirma a
senha localmente e envia apenas a nova senha no envelope de finalidade
`first-access-password`:

```text
POST /api/auth/first-access/password
```

```json
{
  "credential": {
    "algorithm": "RSA-OAEP-256+A256GCM",
    "ciphertext": "nova-senha-cifrada-em-base64url",
    "encryptedKey": "chave-aes-protegida-em-base64url",
    "iv": "vetor-de-inicializacao",
    "issuedAt": 1791043200000,
    "keyId": "identificador-sha256-da-chave",
    "purpose": "first-access-password"
  }
}
```

A nova senha deve possuir entre 8 e 128 caracteres e ser diferente da senha
temporária. Em uma transação, o backend substitui o hash Argon2id, remove o
indicador de troca obrigatória e revoga todas as sessões ativas do usuário. A
resposta `200` limpa o cookie atual e orienta um novo login:

```json
{
  "message": "Senha definida com sucesso. Entre novamente para continuar."
}
```

A senha temporária nunca é retornada por nenhum endpoint. A confirmação da nova
senha existe somente no formulário e não é enviada ao backend.

O JWT contém somente `sub` (usuário), `sid` (sessão), `jti` (identificador do
token), `token_use`, `iat`, `exp`, `iss` e `aud`. Nome, e-mail, tipo, CPF e
permissões não entram no token; são carregados da fonte atual para evitar dados
sensíveis ou autorização desatualizada.

O frontend nunca persiste o token em `localStorage`. Login e logout exigem o
cabeçalho `Origin` correspondente a `CORS_ORIGIN`; uma origem ausente ou
diferente responde `403`. Os demais endpoints de escrita deverão aplicar a
mesma proteção ao serem implementados.

O cliente web centraliza essas chamadas em `services`, sempre envia
`credentials: 'include'`, recupera a identidade por `/api/me` ao iniciar e usa
guards de navegação apenas para experiência. A autorização definitiva continua
obrigatoriamente no backend.

`GET /api/me/navigation` exige uma sessão válida e recalcula no banco as
permissões do tipo atual do usuário. A resposta contém os códigos de permissão e
a árvore de navegação já filtrada. Agrupadores sem filhos autorizados são
omitidos:

```json
{
  "permissions": ["reports.dashboard.view", "availability.manage.own"],
  "items": [
    {
      "id": 1,
      "code": "home",
      "label": "Início",
      "routeName": "home",
      "iconKey": "house",
      "children": []
    },
    {
      "id": 2,
      "code": "reports",
      "label": "Relatórios",
      "routeName": null,
      "iconKey": "chart-no-axes-combined",
      "children": [
        {
          "id": 3,
          "code": "reports.dashboard",
          "label": "Dashboard",
          "routeName": "reports-dashboard",
          "iconKey": "chart-no-axes-combined",
          "children": []
        }
      ]
    },
    {
      "id": 4,
      "code": "agenda",
      "label": "Agenda",
      "routeName": null,
      "iconKey": "calendar-check",
      "children": [
        {
          "id": 5,
          "code": "agenda.availability",
          "label": "Disponibilidades",
          "routeName": "professor-availability",
          "iconKey": "clock-3",
          "children": []
        }
      ]
    }
  ]
}
```

### Agenda própria do professor

```text
GET  /api/professor/availability
POST /api/professor/availability
```

As duas operações exigem `availability.manage.own`. O proprietário é sempre
derivado da sessão autenticada; o contrato não aceita `professorId`.

A publicação recebe um lote de até 500 intervalos no horário institucional:

```json
{
  "items": [
    {
      "date": "2026-10-05",
      "startTime": "14:00",
      "endTime": "14:45",
      "modalities": ["presencial", "online"]
    }
  ]
}
```

O lote é atômico. O backend converte os horários de `America/Porto_Velho` para
UTC, exige período futuro e término posterior ao início, rejeita conflitos
internos ou já persistidos e responde `409 Conflict` sem salvar parcialmente.
Uma publicação bem-sucedida retorna `201`:

```json
{
  "message": "Disponibilidade publicada com sucesso.",
  "availabilities": [
    {
      "id": 15,
      "startsAt": "2026-10-05T18:00:00.000Z",
      "endsAt": "2026-10-05T18:45:00.000Z",
      "state": "ativa",
      "modalities": ["presencial", "online"]
    }
  ]
}
```

O `GET` retorna as disponibilidades futuras não canceladas e os totais de
disponíveis, reservadas e bloqueadas. Instantes da resposta são ISO 8601 em UTC;
o cliente os exibe no timezone institucional.

O modo semanal do frontend é somente um gerador: a semana selecionada, apenas os
dias marcados e todas as janelas preenchidas são expandidos em itens concretos
desse mesmo payload. Nenhuma regra de recorrência é persistida no primeiro
recorte.

### Disponibilidade do aluno

```text
GET /api/availability?from=AAAA-MM-DD&to=AAAA-MM-DD&modality=...
```

`from` e `to` são obrigatórios, inclusivos e interpretados no timezone
institucional. `modality` é opcional e aceita `presencial` ou `online`. A rota
exige a permissão `appointments.create`.

```json
{
  "range": {
    "from": "2026-10-01",
    "to": "2026-10-31"
  },
  "availabilities": [
    {
      "id": 15,
      "startsAt": "2026-10-07T12:00:00.000Z",
      "endsAt": "2026-10-07T16:00:00.000Z",
      "professor": {
        "id": 8,
        "name": "Professor"
      },
      "modalities": ["presencial", "online"],
      "freeIntervals": [
        {
          "startsAt": "2026-10-07T12:00:00.000Z",
          "endsAt": "2026-10-07T14:00:00.000Z"
        }
      ]
    }
  ]
}
```

A API desconta agendamentos confirmados e retorna somente os trechos livres,
sem expor identidade ou dados de outros alunos. A resposta representa um retrato
do instante da consulta e não garante a reserva; a confirmação revalida a
disponibilidade dentro de transação.

### Agendamentos do aluno

```text
POST /api/appointments
GET  /api/appointments/mine
GET  /api/appointments/:appointmentId
POST /api/appointments/:appointmentId/cancel
```

O `POST` está implementado e exige `appointments.create`. O usuário reservado é
sempre derivado da sessão autenticada; o payload não aceita `studentId`.

```json
{
  "availabilityId": 15,
  "startsAt": "2026-10-05T18:30:00.000Z",
  "endsAt": "2026-10-05T19:10:00.000Z",
  "modality": "online",
  "subject": "Assunto do atendimento",
  "details": "Informações complementares"
}
```

Início e término devem estar contidos na mesma janela de disponibilidade. Uma
criação bem-sucedida retorna o agendamento confirmado e seu protocolo. Se
qualquer parte do intervalo tiver sido ocupada, a API responde conflito sem
criar registro ativo.

```json
{
  "appointment": {
    "id": 30,
    "protocol": "AG-20261007-A1B2C3D4E5",
    "startsAt": "2026-10-05T18:30:00.000Z",
    "endsAt": "2026-10-05T19:10:00.000Z",
    "modality": "online",
    "subject": "Assunto do atendimento",
    "details": "Informações complementares",
    "status": "confirmado",
    "professor": { "id": 8, "name": "Professor" }
  },
  "message": "Agendamento confirmado com sucesso."
}
```

A confirmação bloqueia no banco a conta solicitante e a disponibilidade, nessa
ordem, e consulta com lock os intervalos confirmados da janela e do próprio
usuário. Essa ordem serializa tanto reservas concorrentes da mesma janela quanto
compromissos simultâneos do mesmo usuário em disponibilidades diferentes.

O `GET /api/appointments/mine` está implementado e exige
`appointments.read.own`. O identificador do aluno é obtido exclusivamente da
sessão; o endpoint não aceita `studentId`. Há dois modos de consulta:

```text
GET /api/appointments/mine?scope=upcoming&page=1&pageSize=8
GET /api/appointments/mine?scope=history&status=concluido&modality=online&page=1&pageSize=8
GET /api/appointments/mine?from=2026-10-01&to=2026-10-31&modality=presencial
```

`upcoming` retorna apenas compromissos futuros confirmados em ordem crescente.
`history` reúne compromissos passados e registros que já não estão confirmados,
em ordem decrescente. A consulta por período alimenta o calendário, exige as
duas datas e aceita no máximo 62 dias. `status` aceita `confirmado`, `cancelado`,
`concluido` ou `ausencia`; `modality` aceita `presencial` ou `online`.

A resposta inclui somente dados do próprio usuário: protocolo, intervalo,
situação, assunto, detalhes fornecidos pelo aluno, modalidade, professor e,
quando existente, o motivo do cancelamento. Dados de outros alunos e observações
internas de atendimento não fazem parte do contrato.

```json
{
  "appointments": [
    {
      "id": 30,
      "protocol": "AG-20261007-A1B2C3D4E5",
      "startsAt": "2026-10-08T12:00:00.000Z",
      "endsAt": "2026-10-08T13:00:00.000Z",
      "modality": "online",
      "subject": "Orientação acadêmica",
      "details": "Levar histórico acadêmico.",
      "status": "confirmado",
      "professor": { "id": 8, "name": "Professor" },
      "cancelledAt": null,
      "cancellationReason": null
    }
  ],
  "page": 1,
  "pageSize": 8,
  "total": 1
}
```

### Administração de disponibilidade

```text
GET /api/admin/availability?from=AAAA-MM-DD&to=AAAA-MM-DD&modality=...&state=...
```

O `GET` está implementado e exige `availability.read.any`. Retorna todas as
disponibilidades do período, inclusive de professores inativos ou excluídos
logicamente quando preservados no histórico, com identificação pública do
professor, modalidades, estado e resumo agregado. `modality` e `state` são
filtros opcionais.

Criação, edição, bloqueio e cancelamento administrativos permanecem fora deste
recorte. Quando implementados, usarão permissões de escrita distintas,
registrarão o ator e não excluirão fisicamente uma disponibilidade usada.

### Agenda administrativa

```text
GET /api/admin/appointments?from=AAAA-MM-DD&to=AAAA-MM-DD&status=...
```

O `GET` está implementado e exige `appointments.read.any`. A resposta contém
protocolo, intervalo, estado, assunto, modalidade e identificação mínima de
aluno e professor. Credenciais, contato, detalhes internos e observações de
atendimento não fazem parte dessa listagem.

Consulta detalhada, cancelamento e alteração direta de horário permanecem
condicionados às regras institucionais e ao desenho de histórico.

### Registro de atendimento

```text
PUT   /api/admin/appointments/:appointmentId/attendance
PATCH /api/admin/attendances/:attendanceId/status
GET   /api/admin/attendances/:attendanceId/history
```

O backend deve validar os campos condicionais de cada resultado.

### Dashboard

```text
GET /api/admin/dashboard?from=...&to=...
```

Resposta mínima conceitual:

```json
{
  "performed": 0,
  "resolved": 0,
  "unresolved": 0,
  "inProgress": 0,
  "filters": {
    "from": null,
    "to": null
  }
}
```

Os nomes finais devem seguir uma convenção única. O endpoint precisa usar as
mesmas regras de contabilização documentadas em `REQUIREMENTS.md`.

### Usuários e permissões

```text
GET   /api/admin/users/registration-options
GET   /api/admin/users/registration-options/subjects?courseIds=1&courseIds=2
GET   /api/admin/users?page=1&pageSize=20&search=maria&userType=aluno&isActive=true
GET   /api/admin/users/:userId
POST  /api/admin/users
PATCH /api/admin/users/:userId
DELETE /api/admin/users/:userId
```

`GET /api/admin/users` está implementado, exige `users.manage` e aceita `page`
a partir de 1, `pageSize` entre 1 e 100, busca opcional por nome ou e-mail em
`search`, filtro de perfil em `userType` e filtro booleano em `isActive`. A
consulta seleciona explicitamente somente dados próprios da listagem; CPF,
telefone e hash de senha não fazem parte da resposta:

```json
{
  "page": 1,
  "pageSize": 20,
  "total": 1,
  "users": [
    {
      "id": 1,
      "name": "Administrador",
      "email": "admin@example.com",
      "userType": "administrador",
      "isActive": true,
      "mustChangePassword": false,
      "createdAt": "2026-10-03T12:00:00.000Z"
    }
  ]
}
```

`GET /api/admin/users/:userId` está implementado e exige `users.manage`. A
resposta reúne os dados completos necessários à visualização administrativa,
incluindo CPF, telefone e vínculos acadêmicos, mas nunca retorna hash ou outra
credencial. CPF e telefone permanecem restritos a essa operação protegida:

```json
{
  "id": 7,
  "name": "Maria da Silva",
  "email": "maria@example.com",
  "birthDate": "2004-07-17",
  "cpf": "12345678900",
  "phone": "69999999999",
  "userType": "aluno",
  "isActive": true,
  "mustChangePassword": false,
  "createdAt": "2026-10-01T12:00:00.000Z",
  "updatedAt": "2026-10-03T12:00:00.000Z",
  "academic": {
    "courseIds": [1],
    "courseSubjectIds": [30, 31],
    "courses": [{ "id": 1, "name": "Ciência da Computação" }],
    "subjects": [
      {
        "courseSubjectId": 30,
        "courseId": 1,
        "courseName": "Ciência da Computação",
        "subjectId": 44,
        "subjectName": "Algoritmos e Programação"
      }
    ],
    "academicPeriod": { "id": 6, "name": "6º período", "value": "6" }
  }
}
```

Os dois endpoints de opções estão implementados e exigem sessão válida e a
permissão `users.manage`. O primeiro retorna os cursos ativos e os itens da opção
`ACADEMIC_PERIOD`:

```json
{
  "courses": [
    {
      "id": 1,
      "code": "ciencia-computacao",
      "name": "Ciência da Computação",
      "educationLevel": "graduacao"
    }
  ],
  "academicPeriods": [{ "id": 12, "name": "1º período", "value": "1" }]
}
```

A consulta de matérias aceita de 1 a 50 ocorrências de `courseIds`, considera
somente cursos, matérias e relações ativas e preserva o identificador da relação
`course_subjects`, usado pelo cadastro:

```json
{
  "subjects": [
    {
      "courseSubjectId": 30,
      "courseId": 1,
      "courseName": "Ciência da Computação",
      "subjectId": 44,
      "subjectCode": "algoritmos-e-programacao",
      "subjectName": "Algoritmos e Programação"
    }
  ]
}
```

O frontend consome essas consultas no wizard administrativo e apresenta estados
de carregamento e erro.

`POST /api/admin/users` está implementado, exige sessão válida, origem permitida
e a permissão `users.manage`. O cadastro de aluno usa o seguinte formato:

```json
{
  "name": "Maria da Silva",
  "email": "maria@example.com",
  "birthDate": "2004-07-17",
  "cpf": "12345678900",
  "phone": "69999999999",
  "userType": "aluno",
  "isActive": true,
  "temporaryPassword": {
    "algorithm": "RSA-OAEP-256+A256GCM",
    "ciphertext": "senha-cifrada-em-base64url",
    "encryptedKey": "chave-aes-protegida-em-base64url",
    "iv": "vetor-de-inicializacao",
    "issuedAt": 1791043200000,
    "keyId": "identificador-sha256-da-chave",
    "purpose": "user-registration"
  },
  "academic": {
    "courseIds": [1],
    "courseSubjectIds": [30, 31],
    "academicPeriodId": 6
  }
}
```

As regras condicionais do payload são:

- `phone` é obrigatório, normalizado e deve conter 10 ou 11 dígitos com DDD;
- `administrador` não recebe `academic`;
- `aluno` informa exatamente um curso, período válido e uma ou mais matérias;
- `professor` informa um ou mais cursos e matérias, sem período acadêmico;
- cada curso selecionado deve possuir ao menos uma matéria selecionada;
- toda matéria deve pertencer a um dos cursos selecionados por meio de
  `course_subjects` ativo.

Nome, e-mail, CPF e telefone são obrigatórios e normalizados no DTO. E-mail e CPF são
verificados inclusive contra registros excluídos logicamente; duplicidade
retorna `409`. A criação do usuário e de todos os vínculos acadêmicos ocorre em
uma única transação. A senha temporária é transformada em hash Argon2id antes da
persistência. Dados do usuário e credenciais nunca aparecem na resposta:

```json
{
  "message": "Usuário criado com sucesso."
}
```

O navegador cria uma chave AES-GCM de 256 bits por envio, cifra a senha e protege
essa chave efêmera com RSA-OAEP SHA-256. Metadados autenticados vinculam o
envelope ao login ou ao cadastro, ao `keyId` atual e ao horário do servidor; o
backend rejeita envelopes adulterados, expirados ou usados em outro contexto.
A chave privada RSA existe somente no servidor. HTTPS continua obrigatório,
pois a camada de aplicação não substitui autenticação do servidor, integridade
do transporte ou proteção contra replay da conexão. O backend descriptografa a
senha somente em memória e a converte em Argon2id antes da persistência.

Chaves secretas não são incluídas no bundle do frontend nem armazenadas em
`system_parameters`. O backend registra `must_change_password` e restringe a
sessão até a conclusão do endpoint de primeiro acesso descrito acima. Após a
confirmação do cadastro administrativo, o frontend permite iniciar outro
cadastro com o formulário limpo ou voltar à listagem.

`PATCH /api/admin/users/:userId` está implementado, exige sessão válida, origem
permitida e `users.manage`. Ele recebe o mesmo conjunto de dados do cadastro,
exceto `temporaryPassword`, que permanece fora da manutenção geral. O payload é
completo, aplica as mesmas regras condicionais de perfil e retorna somente:

```json
{
  "message": "Usuário atualizado com sucesso."
}
```

E-mail e CPF permanecem únicos, desconsiderando o próprio usuário durante a
validação. Dados pessoais, situação, perfil e vínculos acadêmicos são atualizados
na mesma transação. Vínculos removidos ficam inativos para preservar histórico;
vínculos existentes são reativados quando aplicável. `updated_by` registra o
administrador responsável.

`DELETE /api/admin/users/:userId` está implementado para corrigir cadastros
administrativos indevidos. Exige `users.manage`, origem permitida e confirmação
com a senha da conta administrativa autenticada. A senha usa o mesmo envelope
híbrido, com a finalidade exclusiva `user-deletion-confirmation`:

```json
{
  "credential": {
    "algorithm": "RSA-OAEP-256+A256GCM",
    "ciphertext": "senha-do-administrador-cifrada",
    "encryptedKey": "chave-aes-protegida-em-base64url",
    "iv": "vetor-de-inicializacao",
    "issuedAt": 1791043200000,
    "keyId": "identificador-sha256-da-chave",
    "purpose": "user-deletion-confirmation"
  }
}
```

A operação é uma exclusão lógica transacional: define `is_active = false`,
registra o administrador em `deleted_by` e `updated_by`, preenche `deleted_at` e
revoga todas as sessões ativas do usuário excluído. O histórico e os vínculos
permanecem preservados. Um administrador não pode excluir a própria conta. Senha
incorreta responde `403`; usuário inexistente ou já excluído responde `404`.

```json
{
  "message": "Usuário excluído com sucesso."
}
```

## Semântica de concorrência

`POST /api/appointments` é atômico. A sequência implementada é:

1. autenticar e autorizar;
2. validar payload;
3. iniciar transação;
4. revalidar a disponibilidade;
5. aplicar proteção de banco contra reserva duplicada;
6. criar protocolo e agendamento;
7. commit;
8. tentar notificação fora da transação principal.

Uma falha de notificação nunca muda uma resposta de agendamento confirmado para
falha de reserva. A tentativa é persistida fora da transação principal com
destino mascarado, estado e código de erro sanitizado. Enquanto o provider
Twilio não estiver configurado, ela fica registrada como `falhou` com
`provider_not_configured`.

## Próximo passo

Definir as regras institucionais de cancelamento antes de implementar
`POST /api/appointments/:appointmentId/cancel`, incluindo prazo, ator, motivo e
efeito sobre a disponibilidade, sem apagar o histórico.
