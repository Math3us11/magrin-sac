# Modelo de domínio inicial

## Estado

Primeiro recorte físico aprovado e versionado para identidade, sessões e
configuração. O modelo de agendamento e atendimento continua como proposta até
as pendências institucionais correspondentes serem resolvidas.

## Agregados e entidades

### Usuário

Representa a identidade autenticada e seu estado de acesso.

Possui identificador numérico, nome, e-mail, data de nascimento opcional, tipo,
estado ativo e hash de senha. Os tipos iniciais são `aluno`, `professor` e
`administrador`; a matriz de permissões de cada tipo ainda está pendente.

E-mail e CPF são únicos mesmo após exclusão lógica. O CPF é armazenado
normalizado com 11 dígitos e sem pontuação. Ele é excluído do escopo padrão do
model e só deve ser selecionado por fluxos autorizados de cadastro e validação.

### Sessão de autenticação

Representa uma sessão stateful de usuário. Guarda o identificador do JWT
(`jti`), última atividade, expiração absoluta, última reautenticação e eventual
revogação. O JWT completo apresentado pelo navegador não é persistido no banco.

### Parâmetro de sistema

Valor operacional não secreto identificado por nome único. Não pode ser usado
para credenciais, chaves de criptografia ou configuração necessária para abrir
a conexão com o próprio banco.

### Endpoint de integração

URL nomeada de um serviço externo. Quando houver autenticação, guarda apenas os
nomes das variáveis externas que fornecem secret ou API key, nunca seus valores.

### Opção de sistema e item de opção

Vocabulário administrável composto por um grupo e seus itens de nome/valor. Um
valor é único dentro do grupo. Tipos usados para autorização não dependem dessa
tabela: regras críticas permanecem tipadas e validadas no backend.

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
Usuário 1 ----- * Sessão de autenticação
Usuário 1 ----- 0..1 Aluno
Usuário 1 ----- * registros como autor de auditoria
Opção de sistema 1 ----- * Item de opção

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
11. E-mail e CPF normalizado identificam no máximo um usuário, inclusive entre
    excluídos logicamente.
12. O JWT completo não é persistido; a sessão armazena somente seu `jti` e pode
    ser revogada no backend.
13. Parâmetros e endpoints não armazenam segredos reais.
14. Todo item possui valor único dentro de sua opção de sistema.

## Convenção de auditoria

As tabelas físicas do primeiro recorte possuem:

- `created_at` e `created_by`;
- `updated_at` e `updated_by`;
- `deleted_at` e `deleted_by`.

Timestamps de criação e atualização são obrigatórios. Colunas de autoria podem
ser nulas em bootstrap e rotinas técnicas sem ator autenticado. Exclusões comuns
são lógicas; as referências de autoria impedem apagar fisicamente um usuário
necessário ao histórico.

## Pontos para o modelo físico

- Definir como MariaDB garantirá a unicidade de apenas um agendamento ativo por
  disponibilidade.
- Definir estratégia de concorrência: update condicional, lock ou outra forma
  compatível com a constraint escolhida.
- Padronizar armazenamento de datas em UTC e conversão para o timezone oficial,
  após decisão institucional.
- Definir política de exclusão lógica e retenção de dados pessoais.
- Definir a matriz de permissões dos tipos fixos `aluno`, `professor` e
  `administrador` e se uma evolução futura exigirá papéis compostos.
- Definir se o atendimento online armazena um link manual.
