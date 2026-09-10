# Contrato inicial da API

## Estado

Proposta de recursos para orientar o primeiro alinhamento. Rotas, payloads e
códigos ainda devem ser validados antes da implementação.

## Convenções

- Prefixo sugerido: `/api`.
- JSON para request e response, exceto respostas sem corpo.
- Datas e horários em ISO 8601 com timezone explícito.
- Identificadores opacos; não expor dados pessoais em URLs.
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

## Recursos propostos

### Sessão

```text
POST /api/auth/login
POST /api/auth/logout
GET  /api/me
```

O contrato de login depende da decisão entre autenticação local e institucional.

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

