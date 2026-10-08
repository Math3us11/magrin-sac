# Modelo de domínio inicial

## Estado

Primeiro recorte físico aprovado e versionado para identidade, sessões e
configuração. O modelo de agendamento e atendimento continua como proposta até
as pendências institucionais correspondentes serem resolvidas.

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
`agenda` com o item `agenda.availability`.

### Aluno

Especialização ou perfil associado a usuário, com matrícula, curso e outros
dados mínimos definidos pela instituição.

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

O modelo físico `notifications` referencia o agendamento e persiste canal, tipo,
apenas uma dica mascarada do destino, estado, referência do provedor, código de
erro sanitizado e data da tentativa. O telefone completo existe somente em
memória durante a chamada ao provider. A primeira implementação registra falha
quando o provider ainda não está configurado, preservando o caminho de reenvio.

### Auditoria

Registra ator, ação administrativa, tipo e identificador do alvo, data e
metadados mínimos. Não deve guardar segredos ou cópias desnecessárias de dados
pessoais.

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

Os nomes finais dos enums e transições permitidas devem ser definidos no
workshop de domínio.

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
