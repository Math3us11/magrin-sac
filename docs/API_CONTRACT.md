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

Requisição de login:

```json
{
  "email": "aluno@example.com",
  "password": "senha-do-usuario"
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
    "userType": "aluno"
  }
}
```

Credenciais inválidas respondem `401` com mensagem genérica, sem revelar se o
e-mail existe. `GET /api/me` retorna o mesmo objeto de usuário, sem o envelope
`user`. `POST /api/auth/logout` é idempotente, revoga a sessão reconhecida,
remove o cookie e responde `204` sem corpo.

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
  "permissions": ["reports.dashboard.view"],
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
    }
  ]
}
```

### Disponibilidade do aluno

```text
GET /api/availability?from=...&to=...&modality=...
```

Retorna apenas opções aptas no instante da consulta. A resposta não garante a
reserva; a confirmação revalida a disponibilidade.

### Agendamentos do aluno

```text
POST /api/appointments
GET  /api/appointments/mine
GET  /api/appointments/:appointmentId
POST /api/appointments/:appointmentId/cancel
```

Criação sugerida:

```json
{
  "availabilityId": "identificador-opaco",
  "modality": "online-ou-presencial",
  "subject": "Assunto do atendimento",
  "details": "Informações complementares"
}
```

Uma criação bem-sucedida retorna o agendamento confirmado e seu protocolo. Se o
horário tiver sido ocupado, a API responde conflito sem criar registro ativo.

### Administração de disponibilidade

```text
GET   /api/admin/availability
POST  /api/admin/availability
PATCH /api/admin/availability/:availabilityId
POST  /api/admin/availability/:availabilityId/block
```

Excluir fisicamente uma disponibilidade usada não deve fazer parte do contrato.

### Agenda administrativa

```text
GET /api/admin/appointments?from=...&to=...&status=...&page=...
GET /api/admin/appointments/:appointmentId
POST /api/admin/appointments/:appointmentId/cancel
```

Alteração direta de horário permanece condicionada à regra institucional e ao
desenho de histórico.

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
GET   /api/admin/users
POST  /api/admin/users
PATCH /api/admin/users/:userId
```

O escopo mínimo do gerenciamento de permissões depende da decisão de identidade.

## Semântica de concorrência

`POST /api/appointments` deve ser atômico. A sequência esperada é:

1. autenticar e autorizar;
2. validar payload;
3. iniciar transação;
4. revalidar a disponibilidade;
5. aplicar proteção de banco contra reserva duplicada;
6. criar protocolo e agendamento;
7. commit;
8. tentar notificação fora da transação principal.

Uma falha de notificação nunca muda uma resposta de agendamento confirmado para
falha de reserva.

## Próximo passo

Depois do workshop de domínio, criar schemas de request/response, matriz de
permissões por rota e exemplos de erro antes de implementar o frontend.
