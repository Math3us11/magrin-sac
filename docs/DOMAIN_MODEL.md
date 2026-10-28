# Modelo de domínio inicial

## Estado

Primeiro recorte físico aprovado e versionado para identidade, sessões,
configuração, disponibilidade, agendamento e registro inicial de atendimento.
As transições básicas da demanda estão aprovadas e implementadas. Categorias e
múltiplas etapas estruturadas de continuidade continuam pendentes.

## Agregados e entidades

### Usuário

Representa a identidade autenticada e seu estado de acesso.

Possui identificador numérico, nome, e-mail, data de nascimento, telefone,
tipo, estado ativo, indicador de troca obrigatória e hash de senha. Os
tipos iniciais são `aluno`, `professor` e `administrador`.

E-mail e CPF são únicos mesmo após exclusão lógica. O CPF é armazenado
normalizado com 11 dígitos e sem pontuação. Ele é excluído do escopo padrão do
model e só deve ser selecionado por fluxos autorizados de cadastro e validação.
O telefone é obrigatório no cadastro e na edição administrativa, normalizado
para 10 ou 11 dígitos e excluído do escopo padrão. A coluna permanece tolerante
a `NULL` somente para compatibilidade com identidades técnicas ou registros
anteriores a essa regra. Novos cadastros administrativos recebem
`must_change_password = true`. Após autenticar com a senha temporária, o usuário
fica restrito ao fluxo de primeiro acesso. A definição de uma senha pessoal
substitui o hash, altera o indicador para `false` e revoga todas as sessões
ativas, exigindo uma nova autenticação.

Cadastros indevidos podem passar por exclusão lógica administrativa. Nesse
fluxo, o usuário fica inativo, `deleted_at` marca o momento da exclusão e
`deleted_by` identifica o administrador responsável. Sessões ativas são
revogadas, mas vínculos e registros históricos não são removidos. E-mail e CPF
continuam reservados após a exclusão lógica.

### Sessão de autenticação

Representa uma sessão stateful de usuário. Guarda o identificador do JWT
(`jti`), última atividade, expiração absoluta, última reautenticação e eventual
revogação. O JWT completo apresentado pelo navegador não é persistido no banco.

### Parâmetro de sistema

Valor operacional não secreto identificado por nome único. Não pode ser usado
para credenciais, chaves de criptografia ou configuração necessária para abrir
a conexão com o próprio banco.

O `SystemParametersService` lê os parâmetros declarados em um catálogo tipado,
com intervalo permitido e valor aprovado. O primeiro parâmetro é
`APPOINTMENT_CANCELLATION_MIN_NOTICE_MINUTES`, inteiro de 0 a 10080, semeado com
`120`. Valor ausente ou inválido não interrompe a operação: o serviço usa o valor
aprovado e registra um aviso no log técnico (ADR-029).

### Endpoint de integração

URL nomeada de um serviço externo. Quando houver autenticação, guarda apenas os
nomes das variáveis externas que fornecem secret ou API key, nunca seus valores.

### Opção de sistema e item de opção

Vocabulário administrável composto por um grupo e seus itens de nome/valor. Um
valor é único dentro do grupo. Tipos usados para autorização não dependem dessa
tabela: regras críticas permanecem tipadas e validadas no backend.

### Permissão e permissão por tipo de usuário

Uma permissão representa uma capacidade estável do backend, identificada por um
código único. `user_type_permissions` associa os tipos iniciais `aluno`,
`professor` e `administrador` às capacidades liberadas. A matriz concreta
começa com acesso ao dashboard de relatórios para professor e administrador e
acesso à criação e consulta dos próprios agendamentos para aluno e
administrador. A capacidade `users.manage` é exclusiva do administrador no
primeiro recorte. O professor recebe `availability.manage.own` para acessar
exclusivamente a estrutura da própria agenda.

### Item de menu

Representa uma entrada da navegação. Possui código único, rótulo, nome de rota,
chave de ícone, ordem, estado ativo e referência opcional ao item pai e à
permissão exigida. A hierarquia organiza menus e submenus, mas não concede
acesso por si só. O primeiro conjunto contém `home`, o grupo `reports` com
`reports.dashboard` e o grupo `appointments` com `appointments.new` e
`appointments.mine`. O grupo administrativo acrescenta `administration.users`,
visível somente para quem possui `users.manage`. O professor recebe o grupo
`agenda` com os itens `agenda.availability` e `agenda.attendances`. O agrupador
administrativo também possui `administration.attendances` para a consulta e
evolução global autorizada.

### Aluno

Especialização ou perfil associado a usuário, com matrícula, curso e outros
dados mínimos definidos pela instituição.

A matrícula fica em `users.registration_number`, como texto de até 20 dígitos
para preservar zeros à esquerda. O banco garante que ela contenha somente
números, que seja única — inclusive entre contas excluídas logicamente — e que
apenas usuários do tipo `aluno` a possuam. A coluna aceita nulo para manter os
alunos cadastrados antes da exigência; a API passa a exigi-la no cadastro e na
edição de aluno. O formato oficial permanece pendente em `OPEN_QUESTIONS.md`.

### Curso

Representa um curso de graduação ou pós-graduação disponível no catálogo
acadêmico. Possui código estável, nome, nível de ensino e estado ativo. O seed
inicial parte do levantamento do projeto e do catálogo público da
[Afya Ji-Paraná](https://jiparana.afya.com.br/todos-os-cursos), incluindo
Odontologia, presente na fonte oficial.

Curso não representa matéria ou disciplina. A grade de disciplinas e os
vínculos do professor serão modelados separadamente quando esses dados forem
levantados. Modalidade e grau acadêmico também não são inferidos neste recorte.

### Matéria

Representa uma matéria disponível no catálogo acadêmico, com código estável,
nome e estado ativo. O catálogo inicial reúne nomes encontrados nas matrizes
locais em `docs/pdf/` e as disciplinas explicitamente listadas pela fonte
oficial de Medicina, sem afirmar que todas pertencem à grade vigente de um
curso específico.

Matéria não possui chave estrangeira direta para curso. O catálogo operacional
usa a entidade matéria por curso; uma futura entidade de grade curricular
acrescentará versão da matriz, período recomendado e histórico sem sobrescrever
esse catálogo.

### Matéria por curso

Relaciona uma matéria ao catálogo de um curso. Esse vínculo permite filtrar as
matérias disponíveis após a escolha do curso, mas não define em qual período a
matéria deve ser cursada e ainda não representa uma versão oficial da grade.

O catálogo inicial contém 627 relações obtidas dos dez grupos de matérias já
levantados. As relações preservam a origem por curso e não usam coincidência de
nome para associar os demais cursos.

### Matéria por usuário

Registra que um usuário cursa ou leciona uma matéria pertencente a determinado
curso. Para aluno, o vínculo referencia obrigatoriamente um item da opção
`ACADEMIC_PERIOD`, com valores de 1 a 12, para registrar o período daquele
usuário. Para professor, o período permanece nulo porque estará ligado à futura
oferta ou turma, e não ao vínculo geral com a matéria. Uma mesma matéria pode
aparecer em períodos diferentes sem alterar seu vínculo com o curso. Alterações
administrativas desativam vínculos removidos e reativam os já existentes quando
aplicável, preservando autoria e histórico sem exclusão física.

### Disponibilidade

Intervalo publicado pelo professor proprietário da agenda, com início, fim,
modalidades permitidas, estado ativo ou bloqueado e responsável pela criação.
Início e fim são escolhidos livremente, com término posterior ao início. O
primeiro recorte aceita `presencial`, `online` ou ambas, sem sala ou link.
As modalidades atômicas pertencem à opção de sistema `APPOINTMENT_MODALITY`.
Cada disponibilidade se relaciona com um ou dois itens por meio de
`availability_modalities`; “ambas” é a apresentação de dois vínculos e não um
terceiro valor do catálogo.

O professor proprietário pode bloquear uma janela ativa, ainda não encerrada e
sem agendamento confirmado, e desbloqueá-la depois. Uma janela bloqueada não
aparece na consulta do aluno, continua impedindo a publicação de janelas
sobrepostas e não é excluída. Publicação, bloqueio e desbloqueio são
registrados na trilha de auditoria.

### Agendamento

Reserva de um aluno dentro de uma janela de disponibilidade, com início, fim,
protocolo, modalidade, assunto, detalhes, estado e dados de cancelamento quando
aplicável. Uma janela pode ser consumida por vários agendamentos ativos, desde
que seus intervalos não se sobreponham.

O modelo físico `appointments` preserva o histórico sem exclusão lógica e
registra `availability_id`, `student_id`, `modality_option_item_id`, protocolo,
intervalo, assunto, detalhes, estado, cancelamento e autoria. A chave estrangeira
composta entre disponibilidade e modalidade garante no banco que a modalidade
reservada pertence à janela publicada. Índices por janela e por aluno sustentam
as consultas transacionais de conflito. A confirmação bloqueia primeiro o
usuário solicitante e depois a disponibilidade, revalida estado, professor,
modalidade, contenção e sobreposições antes da criação.

O cancelamento não apaga o agendamento. Aluno e professor precisam respeitar a
antecedência mínima do parâmetro `APPOINTMENT_CANCELLATION_MIN_NOTICE_MINUTES`
(120 minutos por padrão) e agir somente sobre registros próprios ou
atribuídos; o administrador pode agir até o início mediante confirmação da
própria senha. Motivo, instante, ator e autoria da atualização são obrigatórios.
A transação bloqueia a disponibilidade e o agendamento antes da mudança de
estado. Como apenas `confirmado` ocupa intervalo, a transição para `cancelado`
libera o trecho sem alterar ou excluir a disponibilidade original.

### Atendimento

Registro do que ocorreu em um agendamento: realização ou ausência, observações
internas, solução, encaminhamento, classificação da demanda e continuidade.

O modelo físico `attendances` mantém relação única com `appointments`. O registro
só é permitido depois do início previsto e transforma o agendamento confirmado
em `concluido` quando houve atendimento ou `ausencia` quando o aluno não
compareceu. Uma ausência não possui classificação de resolução. Um atendimento
realizado é classificado como `resolvido`, `nao_resolvido` ou `em_tratativa`.
Observações internas nunca fazem parte dos contratos do aluno.

Em tratativa guarda responsável textual, próximo passo e prazo porque o
responsável pode ser uma pessoa ou setor que ainda não possui usuário no sistema.
O catálogo de categorias permanece pendente e não foi incorporado à primeira
migration.

### Categoria de atendimento

Vocabulário administrado pela coordenação para classificar assuntos e permitir
indicadores comparáveis.

### Histórico de atendimento

Registra transições da demanda, justificativa, responsável e data.

O modelo físico `attendance_status_history` registra a ocorrência e a
classificação inicial com ator e instante na mesma transação do atendimento.
Uma demanda `em_tratativa` pode permanecer nesse estado com continuidade
atualizada ou terminar como `resolvido` ou `nao_resolvido`. Cada mudança exige
motivo e cria uma nova entrada de histórico na mesma transação da atualização.
Os estados finais não podem ser reabertos no MVP, e ausências não possuem
transição de resolução.

### Notificação

Registra canal, tipo, destino protegido, estado da tentativa, erro sanitizado e
datas. Não é fonte de verdade do agendamento.

O modelo físico `notifications` referencia o agendamento e persiste canal, tipo,
apenas uma dica mascarada do destino, estado, referência do provedor, código de
erro sanitizado e data da tentativa. O telefone completo existe somente em
memória durante a chamada ao provider. A primeira implementação registra falha
quando o provider ainda não está configurado, preservando o caminho de reenvio.

### Auditoria

Registra ator, ação, tipo e identificador do alvo, instante, motivo quando
houver e os campos alterados com valores anterior e novo. O modelo físico
`audit_logs` é somente de inserção: não possui colunas de atualização nem
exclusão lógica, e `actor_id` referencia `users` com `RESTRICT`, preservando o
responsável mesmo após a desativação ou exclusão lógica da conta (`RF65`).

O registro ocorre na mesma transação da operação auditada; se a operação falhar,
nenhuma linha de auditoria é gravada. As ações registradas no primeiro recorte
são:

- `user.created`, `user.updated` e `user.deleted`;
- `appointment.created` e `appointment.cancelled`, com o motivo do cancelamento;
- `availability.created`, `availability.blocked` e `availability.unblocked`.

Senhas e hashes nunca entram na trilha. CPF, telefone e data de nascimento
aparecem apenas como alterados, sem valores. Assunto e detalhes do agendamento
também ficam fora. Atendimentos continuam auditados por
`attendance_status_history` (ADR-027).

## Relacionamentos propostos

```text
Usuário 1 ----- * Sessão de autenticação
Usuário 1 ----- 0..1 Aluno
Usuário 1 ----- * registros como autor de auditoria
Curso 1 ----- * Matéria por curso * ----- 1 Matéria
Usuário 1 ----- * Matéria por usuário * ----- 1 Matéria por curso
Item de opção 1 ----- * Matéria por usuário como período
Opção de sistema 1 ----- * Item de opção
Permissão 1 ----- * Permissão por tipo de usuário
Permissão 1 ----- * Item de menu
Item de menu 1 ----- * Item de menu filho

Usuário 1 ----- * Disponibilidade criada
Disponibilidade 1 ----- 1..2 Modalidades permitidas * ----- 1 Item de opção
Aluno   1 ----- * Agendamento
Disponibilidade 1 ----- * Agendamento histórico
Agendamento 1 ----- 0..1 Atendimento
Atendimento * ----- 0..1 Categoria
Atendimento 1 ----- * Histórico de status
Agendamento 1 ----- * Notificação
Usuário 1 ----- * Auditoria como ator
```

Uma disponibilidade pode manter agendamentos históricos cancelados e vários
agendamentos ativos. O modelo físico deve impedir sobreposição entre intervalos
ativos sem perder o histórico.

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

No MVP, somente `em_tratativa` possui transições posteriores. Ela pode permanecer
em tratativa, mudar para resolvido ou mudar para não resolvido. Resolvido e não
resolvido são finais e não possuem reabertura.

## Invariantes

1. O protocolo do agendamento é único.
2. Um mesmo subintervalo de disponibilidade não recebe mais de um agendamento
   ativo; agendamentos distintos na mesma janela não podem se sobrepor.
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
15. Um código de permissão identifica no máximo uma capacidade.
16. Um código de menu identifica no máximo uma entrada de navegação.
17. A visibilidade de um menu nunca substitui a autorização do endpoint.
18. Um código identifica no máximo um curso no catálogo.
19. Um nome de curso é único dentro do mesmo nível de ensino.
20. Um código identifica no máximo uma matéria no catálogo.
21. Um nome identifica no máximo uma matéria no catálogo independente.
22. Cada combinação de curso e matéria aparece no máximo uma vez no catálogo.
23. Um aluno não repete a mesma matéria do mesmo curso no mesmo período; o
    professor não repete o mesmo vínculo curso-matéria sem período.
24. O período do usuário não determina quais matérias pertencem ao curso.
25. Todo período usado em matéria por usuário pertence à opção
    `ACADEMIC_PERIOD`.
26. Administrador não possui vínculo acadêmico ativo.
27. Aluno possui exatamente um curso ativo; professor pode possuir um ou mais,
    sempre com pelo menos uma matéria selecionada em cada curso.
28. Toda disponibilidade possui uma ou duas modalidades distintas pertencentes
    à opção `APPOINTMENT_MODALITY`.
29. O término de uma disponibilidade é posterior ao início.
30. Disponibilidades não canceladas do mesmo professor não se sobrepõem.
31. Início e término do agendamento pertencem integralmente à mesma janela de
    disponibilidade.
32. Ausência não recebe classificação nem transição de resolução.
33. Somente `em_tratativa` pode mudar de classificação no MVP.
34. Toda transição de atendimento registra motivo, ator e data na mesma
    transação da atualização.
35. O sistema mantém pelo menos um administrador ativo; o administrador não
    desativa nem rebaixa a própria conta.

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

- Implementar a confirmação com lock da disponibilidade e consulta transacional
  dos intervalos ativos, permitindo vários agendamentos não sobrepostos na mesma
  janela.
- Armazenar instantes normalizados e convertê-los nas fronteiras para o timezone
  institucional `America/Porto_Velho`.
- Definir política de exclusão lógica e retenção de dados pessoais.
- Definir a matriz de permissões dos tipos fixos `aluno`, `professor` e
  `administrador` e se uma evolução futura exigirá papéis compostos.
- Definir se o atendimento online armazena um link manual.
