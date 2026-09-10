# Pendências de produto e arquitetura

## Estado

Estas questões não estão aprovadas. Recomendações abaixo servem para conduzir o
alinhamento, não para autorizar implementação silenciosa.

## Bloqueadores do primeiro scaffold funcional

### 1. Autenticação

Decidir entre:

- contas locais no MVP;
- login institucional desde a primeira versão;
- contas locais com adapter preparado para integração futura.

**Recomendação inicial:** contas locais com hash seguro e fronteira de serviço de
identidade, se a instituição ainda não forneceu protocolo e credenciais.

### 2. Perfis e permissões

Definir o que diferencia coordenador, usuário administrativo e administrador.
Precisamos de uma matriz mínima de ações por perfil.

### 3. Regras de cancelamento

Definir antecedência mínima, motivo obrigatório, liberação do horário e poderes
excepcionais da coordenação.

### 4. Limite de agendamentos

Definir quantidade de agendamentos futuros por aluno e se um cancelamento libera
imediatamente um novo agendamento.

### 5. Timezone institucional

Definir o fuso oficial e regras para persistência/exibição de data e hora.

**Recomendação técnica:** persistir instantes normalizados e converter na
fronteira, sem assumir que o fuso do servidor é o fuso da instituição.

### 6. Modelo de disponibilidade

Definir duração padrão, antecedência mínima, janela máxima de agendamento,
recorrência e comportamento de horários já reservados quando a agenda muda.

## Bloqueadores do módulo de atendimento e indicadores

### 7. Atendimento realizado

Definir o evento que torna um atendimento realizado.

**Recomendação do levantamento:** somente atendimento efetivamente ocorrido;
ausência fica em categoria separada.

### 8. Não resolvido versus em tratativa

Validar se:

- não resolvido significa demanda encerrada sem solução;
- em tratativa significa demanda ainda aberta.

Também definir transições permitidas e possibilidade de reabertura.

### 9. Continuidade da tratativa

Definir responsável, prazo obrigatório, múltiplas etapas e notificações ao aluno.

### 10. Categorias de atendimento

A coordenação deve fornecer a lista oficial e decidir quem pode administrá-la.

### 11. Fórmula de resolução

Definir o denominador do percentual: atendimentos realizados, excluindo ou não
ausências e itens em tratativa. Os quatro totais podem existir antes dessa
decisão.

## Pendências do fluxo e integrações

### 12. Atendimento online

Definir se o MVP apenas marca a modalidade ou armazena link manual. Geração de
sala e integração com videoconferência permanecem fora do MVP.

### 13. Atendimento presencial

Definir local fixo ou configurável, quantidade de salas e necessidade de
capacidade.

### 14. WhatsApp

Confirmar conta Twilio, política de opt-in, formato dos números, templates,
limites do Sandbox e destino permitido em desenvolvimento.

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

## Registro de respostas

Ao resolver uma pendência:

1. registrar a decisão em `DECISIONS.md` quando afetar arquitetura;
2. atualizar `PRODUCT_SCOPE.md` ou `REQUIREMENTS.md`;
3. ajustar `DOMAIN_MODEL.md` e `API_CONTRACT.md` quando aplicável;
4. remover a questão desta lista ou marcá-la como resolvida com referência à
   decisão.

