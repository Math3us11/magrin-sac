# Escopo do produto

## Estado

Baseline do MVP. Recursos fora desta baseline permanecem como backlog e não
devem ser implementados automaticamente.

## Problema

Alunos precisam consultar horários e agendar atendimentos com a coordenação sem
trocas manuais e conflitos de agenda. A coordenação precisa administrar sua
disponibilidade, acompanhar demandas e medir os resultados dos atendimentos.

## Objetivo

Centralizar o fluxo de atendimento da coordenação, desde a publicação da
disponibilidade até o registro do resultado, preservando histórico, permissões e
indicadores confiáveis.

## Atores

### Aluno

- autentica-se;
- consulta horários livres;
- agenda atendimento presencial ou online;
- consulta seus próximos agendamentos e histórico;
- cancela quando a regra institucional permitir.

### Coordenação

- administra disponibilidades e bloqueios;
- consulta a agenda;
- visualiza detalhes autorizados;
- registra realização, ausência, observações e encaminhamentos;
- classifica a demanda;
- acompanha itens em tratativa.

### Usuário administrativo

Pode apoiar agenda, cadastros, atendimento e consulta, conforme permissões que
ainda serão detalhadas.

### Administrador do sistema

Gerencia usuários, perfis, parâmetros e permissões técnicas e administrativas.

## Fluxo principal do MVP

```text
Coordenação publica disponibilidade
                |
                v
Aluno consulta e seleciona horário
                |
                v
Backend revalida regras e concorrência
                |
                v
Transação confirma o agendamento
                |
                +------> tentativa de notificação
                |
                v
Coordenação realiza e registra atendimento
                |
                v
Dashboard recalcula indicadores
```

## Escopo do MVP

### Acesso

- autenticação de alunos e equipe autorizada;
- controle de acesso por perfil e permissão;
- ativação e desativação de usuários;
- isolamento dos dados de cada aluno.

### Disponibilidade

- criação de datas e horários;
- duração e modalidade permitida;
- bloqueio de horários;
- consulta por data ou período;
- prevenção de disponibilidades conflitantes.

### Agendamento

- consulta de horários livres;
- escolha de modalidade;
- assunto e informações complementares;
- confirmação concorrente e segura;
- protocolo único;
- consulta de agendamentos futuros e históricos;
- cancelamento conforme regra configurada.

### Atendimento

- registro de realização ou ausência;
- observações internas;
- solução ou encaminhamento;
- classificação como resolvido, não resolvido ou em tratativa;
- histórico de alterações.

### Dashboard

- total de atendimentos realizados;
- total resolvido;
- total não resolvido;
- total em tratativa;
- filtro inicial por período, se não ampliar significativamente o primeiro
  incremento.

### Notificações

- confirmação de agendamento;
- cancelamento;
- lembrete;
- registro do resultado da tentativa de envio.

## Casos de uso de referência

| ID | Caso de uso | Prioridade inicial |
|---|---|---|
| UC01 | Autenticar usuário | MVP |
| UC02 | Consultar horários disponíveis | MVP |
| UC03 | Realizar agendamento | MVP |
| UC04 | Consultar meus agendamentos | MVP |
| UC05 | Cancelar agendamento | MVP |
| UC06 | Gerenciar disponibilidade | MVP |
| UC07 | Consultar agenda de atendimentos | MVP |
| UC08 | Registrar realização do atendimento | MVP |
| UC09 | Atualizar status da demanda | MVP |
| UC10 | Consultar estatísticas de atendimento | MVP |
| UC11 | Gerenciar usuários e permissões | MVP mínimo |

## Fora do MVP

- chatbot ou atendimento conversacional por WhatsApp;
- microserviço separado de notificações;
- integração direta com WhatsApp Cloud API da Meta;
- geração automática de sala de videoconferência;
- integração com sistema acadêmico ou diretório institucional;
- múltiplos canais de notificação;
- exportações e relatórios analíticos avançados;
- atendimento coletivo;
- arquitetura distribuída, filas ou mensageria sem necessidade validada;
- gestão de notas, frequência, matrícula, finanças ou documentos acadêmicos.

## Indicadores

O dashboard deve derivar seus valores dos registros de atendimento, não de
contadores independentes.

A fórmula de percentual de resolução continua pendente porque depende da
definição institucional do denominador. Até a decisão, o MVP deve priorizar os
quatro totais e tornar explícito quais registros compõem cada indicador.

