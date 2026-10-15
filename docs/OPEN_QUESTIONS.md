# Pendências de produto e arquitetura

## Estado

Estas questões não estão aprovadas. Recomendações abaixo servem para conduzir o
alinhamento, não para autorizar implementação silenciosa.

## Bloqueadores do primeiro scaffold funcional

### 1. Autenticação — resolvida

**Decisão:** o MVP usa contas locais com senha protegida por hash e access token
JWT em cookie `HttpOnly`. A sessão permanece stateful no MariaDB para revogação,
inatividade e desativação imediata do usuário. Não haverá refresh token no
primeiro fluxo. A fronteira de identidade permanece preparada para futura
integração institucional. Consulte a ADR-016.

### 1.1. Tempos de sessão

Definir os limites institucionais de inatividade e duração absoluta da sessão.
Como ponto inicial para validação, considerar 30 minutos de inatividade e 8
horas de duração absoluta. Esses números ainda não estão aprovados e não devem
ser fixados silenciosamente no código.

### 2. Perfis e permissões

**Decisão parcial:** o administrador possui consulta global das disponibilidades
e dos agendamentos por permissões `*.read.any`, distintas das capacidades
`*.own` de professor e aluno. A consulta global não autoriza automaticamente
criação, bloqueio, cancelamento ou alteração em nome de terceiros. Essas ações
exigirão permissões próprias, identificação do ator e auditoria. Consulte a
ADR-025.

**Pendente:** definir o que diferencia coordenador e usuário administrativo,
além dos poderes excepcionais de alteração da agenda.

### 2.1. Provisionamento de contas — decisão parcial

**Decisão:** professor e administrador não possuem autocadastro público; essas
contas são criadas por rotina interna autorizada. O primeiro incremento do
frontend oferece somente login e será validado inicialmente com uma conta de
administrador inserida de forma controlada no banco.

**Pendente:** definir como confirmar o vínculo acadêmico antes de liberar um
futuro cadastro de aluno. Até essa definição, não existe rota nem formulário de
cadastro público e a interface não permite selecionar um perfil privilegiado.

### 3. Regras de cancelamento — resolvida

**Decisão:** aluno pode cancelar somente o próprio agendamento confirmado e o
professor somente um agendamento vinculado à própria disponibilidade, ambos com
motivo obrigatório e antecedência mínima de duas horas. O administrador pode
cancelar qualquer agendamento confirmado até seu início, inclusive dentro das
duas horas, mas deve informar motivo e confirmar a própria senha.

O cancelamento preserva o registro, grava `cancelled_at`, `cancelled_by`,
`cancellation_reason` e `updated_by`, e libera imediatamente o intervalo porque
somente agendamentos confirmados ocupam disponibilidade. A senha administrativa
serve apenas para confirmação, trafega no envelope criptografado e não é
persistida.

### 4. Limite de agendamentos

Definir quantidade de agendamentos futuros por aluno e se um cancelamento libera
imediatamente um novo agendamento.

### 5. Timezone institucional — resolvida

**Decisão:** o timezone institucional é `America/Porto_Velho`. Datas e horários
são informados e exibidos nesse fuso; o backend deverá persistir os instantes de
forma normalizada e converter nas fronteiras, sem depender do fuso do servidor.
Consulte a ADR-022.

### 6. Modelo de disponibilidade

O primeiro formulário usa início e fim livres, com término obrigatoriamente
posterior ao início. O modo semanal expande a semana selecionada, seus dias e
janelas em disponibilidades concretas sem persistir recorrência. Ainda é
necessário definir antecedência mínima, janela máxima de agendamento e
comportamento de horários já reservados quando a agenda muda.

## Decisões do módulo de atendimento e bloqueadores dos indicadores

### 7. Atendimento realizado

**Decisão aprovada:** professor responsável ou administrador registra o resultado
após o início previsto. Atendimento realizado e ausência são ocorrências
distintas; não há confirmação adicional do aluno.

### 8. Não resolvido versus em tratativa

**Decisão aprovada:** não resolvido significa demanda encerrada sem solução e
exige justificativa; em tratativa permanece aberta. As transições posteriores e
a possibilidade de reabertura ainda precisam ser definidas.

### 9. Continuidade da tratativa

**Decisão aprovada para o primeiro registro:** responsável, próximo passo e prazo
são obrigatórios. Múltiplas etapas e notificações ao aluno continuam pendentes.

### 10. Categorias de atendimento

A coordenação deve fornecer a lista oficial e decidir quem pode administrá-la.

### 11. Fórmula de resolução

Definir o denominador do percentual: atendimentos realizados, excluindo ou não
ausências e itens em tratativa. Os quatro totais podem existir antes dessa
decisão.

## Pendências do fluxo e integrações

### 12. Atendimento online — decisão parcial

O primeiro cadastro apenas marca a modalidade, sem solicitar link. Geração de
sala e integração com videoconferência permanecem fora do MVP. A origem de um
eventual link futuro ainda precisa ser definida.

### 13. Atendimento presencial — decisão parcial

O primeiro cadastro apenas marca a modalidade, sem solicitar sala. Local fixo
ou configurável, quantidade de salas e necessidade de capacidade permanecem
pendentes para uma evolução posterior.

### 14. WhatsApp — adiada

Confirmar conta Twilio, política de opt-in, formato dos números, templates,
limites do Sandbox e destino permitido em desenvolvimento.

**Decisão de planejamento:** a integração e as notificações adicionais ficam
adiadas para a Fase 7. O trabalho atual segue para atendimento e demanda; a base
já existente de notificações permanece isolada e não será ampliada nesta fase.

### 15. Lembretes

Definir antecedência, frequência, reenvio e mecanismo de execução periódica.

### 16. Alteração de agendamento

Definir se a coordenação altera diretamente data/horário ou cancela e cria uma
nova reserva vinculada ao histórico.

## Operação, dados e conformidade

### 17. Volume esperado

Informar número de usuários, horários e atendimentos para validar índices, metas
de desempenho e paginação.

### 18. Infraestrutura

Definir hospedagem, MariaDB, domínio, HTTPS, ambientes e responsáveis por
operação.

### 19. LGPD e retenção

Definir finalidade, base de tratamento, dados mínimos, prazos de retenção,
anonimização e atendimento de solicitações do titular.

### 20. Backup e restauração

Definir frequência, retenção, criptografia, responsável e teste de restauração.

### 21. Relatórios e exportação

Validar necessidade de planilha, PDF, impressão e dados nominais. Permanecem fora
do primeiro fluxo vertical.

### 22. Atendimento em grupo

Confirmar que o MVP é individual. Caso contrário, o modelo de capacidade,
participantes, presença e métricas precisa ser redesenhado antes do banco.

### 23. Grade curricular

Definir como representar versões de matriz, períodos, carga horária,
pré-requisitos, componentes obrigatórios e eletivos. Até essa decisão, cursos e
matérias permanecem em catálogos independentes e nenhuma grade é inferida a
partir dos documentos de referência. O período de 1 a 12 já é um vocabulário
administrável no vínculo entre usuário e matéria; ainda falta decidir se uma
futura versão de grade terá também um período recomendado próprio.

### 24. Histórico acadêmico e conclusão de matérias

Definir como registrar aprovação, reprovação, aproveitamento, dispensa e
conclusão. Essa decisão será necessária para impedir que um aluno selecione como
novo vínculo uma matéria já concluída, sem tratar apenas a existência de um
registro anterior como aprovação.

## Registro de respostas

Ao resolver uma pendência:

1. registrar a decisão em `DECISIONS.md` quando afetar arquitetura;
2. atualizar `PRODUCT_SCOPE.md` ou `REQUIREMENTS.md`;
3. ajustar `DOMAIN_MODEL.md` e `API_CONTRACT.md` quando aplicável;
4. remover a questão desta lista ou marcá-la como resolvida com referência à
   decisão.
