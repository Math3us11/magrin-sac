# Roteiro de demonstração

## Preparar os dados

Os dados de demonstração usam apenas contas fictícias `@demo.test` (ADR-031).
No `.env` do ambiente que será apresentado, defina:

```bash
DEMO_SEED_ENABLED=true
DEMO_SEED_PASSWORD=<senha forte usada pelas seis contas>
```

Com as migrations aplicadas, execute:

```bash
pnpm --filter backend db:seed:demo
```

O comando usa o banco do `.env` do diretório em que é executado, então vale
tanto para o desenvolvimento quanto para o worktree estável. Execute-o de novo
na véspera da apresentação: as datas são relativas ao dia, e a recriação mantém
o passado e o futuro em torno de hoje. Ao terminar, volte `DEMO_SEED_ENABLED`
para `false`.

O compromisso de hoje só é criado quando o comando roda até as 19h59 (horário de
Porto Velho), porque precisa caber uma janela futura no mesmo dia.

## Contas

| Perfil        | Conta                      | Papel na demonstração                   |
| ------------- | -------------------------- | --------------------------------------- |
| Administrador | `coordenacao@demo.test`    | Agenda geral, dashboard, auditoria      |
| Professor     | `helena.duarte@demo.test`  | Agenda com horário bloqueado            |
| Professor     | `ricardo.lima@demo.test`   | Atendimento aguardando registro         |
| Aluno         | `ana.souza@demo.test`      | Próximo compromisso e histórico variado |
| Aluno         | `bruno.costa@demo.test`    | Tratativa concluída e não resolvido     |
| Aluno         | `carla.mendes@demo.test`   | Tratativa em aberto e cancelamento      |

Todas usam a senha definida em `DEMO_SEED_PASSWORD` e entram sem troca
obrigatória de senha.

## O que já vem preparado

Datas em dias úteis, relativas ao dia da execução (D):

- **D-5:** Ana com atendimento resolvido (orientação de TCC); Bruno com
  atendimento não resolvido (revisão de nota fora do prazo).
- **D-4:** Carla com demanda em tratativa (aproveitamento de disciplina, prazo
  futuro); Ana ausente.
- **D-3:** Bruno com tratativa encerrada como resolvida, com dois registros no
  histórico; Carla cancelou com motivo.
- **D-1:** Ana resolvida por encaminhamento; Bruno com atendimento já ocorrido e
  **ainda sem registro**.
- **Hoje:** Carla com compromisso presencial com a professora Helena.
- **D+1 a D+5:** horários livres nas duas modalidades, um horário bloqueado
  (Helena, D+2) e agendamentos confirmados de Ana, Bruno e Carla.

## Sugestão de roteiro

1. **Aluno (Ana):** a página inicial mostra o próximo compromisso. Em "Novo
   agendamento", escolha um horário livre, revise e confirme; mostre o protocolo.
   Em "Meus agendamentos", abra o histórico com concluídos e ausência e cancele o
   novo agendamento informando o motivo.
2. **Professor (Ricardo):** em "Disponibilidades", registre o atendimento de
   Bruno que ficou pendente. Em "Atendimentos", abra a tratativa de Carla e
   atualize para resolvido, com solução e motivo; mostre o histórico.
3. **Professor (Helena):** publique novos horários para a próxima semana e
   desbloqueie o horário de D+2.
4. **Administrador:** no dashboard, mostre os quatro indicadores e use "Ver
   registros" para abrir os atendimentos que compõem cada total. Na agenda geral,
   mostre a visão de todos os professores. Em "Auditoria", mostre as operações
   feitas durante a apresentação, com responsável, data e motivo.
5. **Concorrência (opcional):** com duas janelas de alunos diferentes, tente
   confirmar o mesmo horário ao mesmo tempo; somente uma reserva é aceita.

As notificações de WhatsApp continuam desativadas enquanto a Twilio não estiver
configurada; o agendamento é confirmado normalmente.
