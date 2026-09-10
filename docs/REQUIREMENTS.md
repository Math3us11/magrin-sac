# Requisitos priorizados

## Estado

Este documento transforma o levantamento amplo em uma baseline executável para
o MVP. Os identificadores `RF`, `RNF` e `RN` preservam a rastreabilidade com o
documento de requisitos original.

## Requisitos funcionais do MVP

### Acesso e usuários

- Autenticar usuários e distinguir perfis autorizados (`RF01`–`RF03`, `RF06`).
- Cadastrar, editar, ativar e desativar usuários autorizados (`RF05`).
- Manter os dados mínimos do aluno (`RF07`).
- Garantir que o aluno consulte apenas seus próprios dados (`RNF18`).
- Recuperação de senha (`RF04`) depende da decisão sobre autenticação.

### Disponibilidade

- Cadastrar datas, horários, duração e modalidade (`RF08`–`RF11`).
- Bloquear horários livres e impedir disponibilidades conflitantes
  (`RF12`, `RF13`).
- Consultar agenda por data ou período e mostrar ao aluno apenas opções aptas
  (`RF14`, `RF15`).
- Remover da consulta um horário com agendamento ativo (`RF16`).

### Agendamento

- Selecionar data, horário e modalidade e informar assunto (`RF17`–`RF20`).
- Revalidar a disponibilidade na confirmação (`RF21`).
- Impedir dupla reserva e conflito do próprio aluno (`RF22`, `RF23`).
- Gerar protocolo único (`RF24`, `RN04`).
- Consultar próximos agendamentos e histórico (`RF25`, `RF26`).
- Cancelar conforme regras configuradas e auditar a operação (`RF27`, `RF28`,
  `RF30`).
- Alteração administrativa de data/horário (`RF29`) entra após o fluxo básico de
  cancelamento e nova reserva, salvo prioridade confirmada.

### Atendimento

- Registrar realização ou ausência (`RF31`, `RF32`).
- Registrar observações internas, solução e encaminhamentos (`RF33`,
  `RF37`, `RF38`).
- Classificar como resolvido, não resolvido ou em tratativa
  (`RF34`–`RF36`).
- Registrar responsável e prazo quando a regra de tratativa exigir (`RF39`).
- Preservar histórico de status e permitir filtros essenciais (`RF40`–`RF42`).
- Não expor observações internas ao aluno (`RF43`).

### Indicadores

- Calcular os quatro totais principais (`RF44`–`RF47`).
- Oferecer filtro por período no primeiro incremento útil (`RF48`).
- Permitir rastrear os registros que compõem um indicador (`RF54`).
- Percentual de resolução (`RF55`) só deve ser publicado após a definição do
  denominador.
- Filtros avançados e séries históricas (`RF49`–`RF53`) são evolução do MVP.

### Notificações

- Enviar confirmação, cancelamento e lembrete por WhatsApp conforme o
  alinhamento técnico.
- Registrar cada tentativa e seu resultado (`RF56`, `RF58`–`RF60`, adaptados ao
  canal aprovado).
- Uma falha de envio não reverte a operação principal.
- E-mail (`RF57`) permanece fora da primeira integração.

### Auditoria

- Registrar criação, alteração e cancelamento de agendamentos (`RF61`–`RF63`).
- Registrar o ator de operações administrativas (`RF64`).
- Preservar histórico mesmo após desativação do usuário (`RF65`).

## Requisitos não funcionais prioritários

### Segurança e privacidade

- Hash seguro de senha quando houver credenciais locais (`RNF15`).
- HTTPS em ambientes publicados (`RNF16`).
- Autorização obrigatória no servidor (`RNF17`, `RNF18`).
- Validação e sanitização de entrada (`RNF19`, `RNF20`).
- Sessão segura e registro controlado de tentativas suspeitas
  (`RNF21`, `RNF22`).
- Menor privilégio, LGPD e ausência de dados pessoais em URLs e logs
  (`RNF23`–`RNF26`).

### Consistência

- Transação na confirmação (`RNF57`).
- Garantia de unicidade de agendamento ativo por horário (`RNF11`, `RNF58`).
- Integridade referencial (`RNF59`).
- Preservação de registros históricos (`RNF60`).
- Indicadores derivados dos dados atuais (`RNF61`).
- Timezone explícito (`RNF62`).

### Qualidade

- Módulos com responsabilidades claras (`RNF34`, `RNF35`).
- Documentação de instalação e operação (`RNF36`).
- Controle de versão e revisão de alterações relevantes (`RNF37`, `RNF38`).
- Testes de regras críticas, concorrência e indicadores (`RNF39`–`RNF41`).
- Configurações institucionais parametrizáveis (`RNF42`).
- Logs úteis sem conteúdo sensível (`RNF43`).

### Experiência e acessibilidade

- Interface objetiva, consistente e responsiva (`RNF01`–`RNF08`).
- Fluxo de consulta e início do agendamento em até cinco telas principais
  (`RNF02`).
- Navegação por teclado, foco visível, rótulos e erros textuais
  (`RNF44`–`RNF47`).
- Calendário com alternativa acessível e estados que não dependem apenas de cor
  (`RNF48`–`RNF52`).

### Desempenho

As metas iniciais são páginas principais em até três segundos e consultas comuns
de disponibilidade em até dois segundos (`RNF09`, `RNF10`). Essas metas precisam
de ambiente e volume de referência antes de virarem teste de aceite automatizado.

## Regras de negócio invariantes

- Aluno inativo não agenda (`RN01`).
- Um horário não recebe mais de um agendamento ativo (`RN02`).
- Um aluno não mantém agendamentos conflitantes (`RN03`).
- Todo agendamento possui protocolo e disponibilidade (`RN04`, `RN05`).
- Todo atendimento realizado se relaciona a um agendamento (`RN06`).
- Resolvido exige solução ou encaminhamento (`RN07`).
- Em tratativa exige informação de continuidade (`RN08`).
- Não resolvido exige justificativa (`RN09`).
- Cancelado não conta como realizado (`RN10`).
- Ausência é categoria separada e não recebe classificação automática
  (`RN12`).
- Histórico e exceções administrativas são auditáveis (`RN13`, `RN14`).
- Modalidade escolhida deve ser permitida no horário (`RN15`).

`RN11`, a definição exata de atendimento realizado, permanece pendente.

## Critérios de aceite do primeiro fluxo vertical

1. Um aluno autorizado consulta horários disponíveis.
2. O aluno cria um agendamento válido e recebe um protocolo.
3. Duas solicitações concorrentes não reservam o mesmo horário.
4. A agenda administrativa exibe o novo compromisso.
5. A coordenação registra realização, ausência e resultado quando aplicável.
6. Os quatro indicadores refletem os registros atuais.
7. O aluno não acessa dados de outro aluno nem observações internas.
8. Operações administrativas relevantes aparecem na auditoria.
9. Falha da Twilio não remove nem invalida o agendamento.
10. Os fluxos principais funcionam em desktop e viewport móvel e possuem testes
    automatizados ou roteiro documentado.

