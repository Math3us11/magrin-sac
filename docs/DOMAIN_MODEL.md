# Modelo de domínio inicial

## Estado

Proposta para a oficina inicial de banco e contratos. Nomes físicos, colunas e
enums ainda não estão aprovados.

## Agregados e entidades

### Usuário

Representa a identidade autenticada e seu estado de acesso.

Dados esperados: identificador, nome, e-mail, estado ativo, credencial local
quando aplicável, perfis e permissões.

### Aluno

Especialização ou perfil associado a usuário, com matrícula, curso e outros
dados mínimos definidos pela instituição.

### Disponibilidade

Intervalo publicado pela coordenação com início, fim/duração, modalidades
permitidas, estado ativo ou bloqueado e responsável pela criação.

### Agendamento

Reserva de um aluno sobre uma disponibilidade, com protocolo, modalidade,
assunto, detalhes, estado e dados de cancelamento quando aplicável.

### Atendimento

Registro do que ocorreu em um agendamento: realização ou ausência, observações
internas, solução, encaminhamento, classificação da demanda e continuidade.

### Categoria de atendimento

Vocabulário administrado pela coordenação para classificar assuntos e permitir
indicadores comparáveis.

### Histórico de atendimento

Registra transições da demanda, justificativa, responsável e data.

### Notificação

Registra canal, tipo, destino protegido, estado da tentativa, erro sanitizado e
datas. Não é fonte de verdade do agendamento.

### Auditoria

Registra ator, ação administrativa, tipo e identificador do alvo, data e
metadados mínimos. Não deve guardar segredos ou cópias desnecessárias de dados
pessoais.

## Relacionamentos propostos

```text
Usuário 1 ----- 0..1 Aluno
Usuário * ----- * Perfil/Permissão

Usuário 1 ----- * Disponibilidade criada
Aluno   1 ----- * Agendamento
Disponibilidade 1 ----- * Agendamento histórico
Agendamento 1 ----- 0..1 Atendimento
Atendimento * ----- 0..1 Categoria
Atendimento 1 ----- * Histórico de status
Agendamento 1 ----- * Notificação
Usuário 1 ----- * Auditoria como ator
```

Uma disponibilidade pode manter agendamentos históricos cancelados, mas deve
ter no máximo um agendamento ativo. O modelo físico precisa representar essa
regra sem perder o histórico.

## Estados conceituais

### Disponibilidade

- disponível;
- reservada;
- bloqueada;
- expirada.

### Agendamento

- confirmado;
- cancelado;
- concluído ou associado a atendimento realizado;
- ausência registrada.

### Resultado da demanda

- resolvido;
- não resolvido;
- em tratativa.

Realização do compromisso e resultado da demanda são dimensões diferentes. Uma
ausência não deve receber automaticamente um resultado de resolução.

### Notificação

- pendente;
- enviada;
- falhou.

Os nomes finais dos enums e transições permitidas devem ser definidos no
workshop de domínio.

## Invariantes

1. O protocolo do agendamento é único.
2. Uma disponibilidade tem no máximo um agendamento ativo.
3. Um aluno não possui intervalos ativos conflitantes.
4. A modalidade do agendamento é aceita pela disponibilidade.
5. Atendimento realizado referencia um agendamento existente.
6. Resolvido registra solução ou encaminhamento.
7. Não resolvido registra justificativa.
8. Em tratativa registra continuidade mínima.
9. Toda mudança administrativa relevante identifica o ator.
10. Desativar usuário não apaga o histórico.

## Pontos para o modelo físico

- Definir como MariaDB garantirá a unicidade de apenas um agendamento ativo por
  disponibilidade.
- Definir estratégia de concorrência: update condicional, lock ou outra forma
  compatível com a constraint escolhida.
- Padronizar armazenamento de datas em UTC e conversão para o timezone oficial,
  após decisão institucional.
- Definir política de exclusão lógica e retenção de dados pessoais.
- Definir se perfis e permissões exigem tabelas flexíveis no MVP ou se papéis
  fixos são suficientes.
- Definir se o atendimento online armazena um link manual.

