# Diagnóstico do Codex no VS Code

Data do registro: 2 de outubro de 2026
Projeto: `magrin-sac`

## Resumo

Durante o uso do Codex no VS Code foram identificados dois problemas distintos:

1. uma mensagem antiga permanece visualmente na fila do chat e reaparece após
   recarregar a janela;
2. o executor local não consegue iniciar comandos e retorna
   `setup refresh had errors`.

A comunicação com o chat continua funcionando. O problema de execução acontece
antes da abertura do PowerShell e, portanto, não foi causado por um comando do
projeto, pelo `pnpm`, pelo Node.js ou pelo Git.

## Problema 1: mensagem antiga persistida na fila

### Sintomas

- A mensagem `teste` aparece acima do campo de composição com indicador de
  carregamento e opção de exclusão.
- A exclusão pela lixeira remove a mensagem apenas temporariamente.
- Após executar `Developer: Reload Window`, a mensagem reaparece.
- Em momentos anteriores, mensagens antigas foram enviadas novamente, dando a
  impressão de repetição automática.

### Evidências

- O chat antigo aparece como inativo no estado registrado pelo Codex.
- O turno que contém `teste` já está concluído.
- Não existe um novo turno ativo ou pendente no histórico registrado.
- A cópia visível reaparece somente na interface do VS Code.

### Conclusão

A mensagem visível é um item persistido no estado local da extensão. Ela não é
um novo turno pendente no servidor. A recarga da janela restaura esse estado,
por isso a exclusão feita apenas pela interface não permanece.

O comportamento normal de uma fila é aguardar o turno atual terminar e então
enviar a continuação. A restauração de uma mensagem já concluída após sua
exclusão é anormal.

## Problema 2: falha do executor local

### Erro observado

```text
Failed to create unified exec process:
helper_unknown_error: setup refresh had errors
```

### Sintomas

- O erro ocorre até com comandos mínimos e somente de leitura, como
  `Get-Location`.
- O PowerShell não chega a ser iniciado.
- `git status` e os scripts do projeto também não podem ser executados pelo
  Codex.
- Criar um chat novo não resolveu o problema.
- Reiniciar ou recarregar o VS Code não resolveu o problema.

### Conclusão

O defeito está na preparação do executor local ou no estado da extensão/host,
e não na lógica do projeto. Como a mesma falha ocorre em um chat novo, ela não
está limitada ao histórico da conversa antiga.

Pode existir uma causa comum entre o estado inconsistente da fila e a falha de
preparação do executor, mas essa relação ainda não foi comprovada. Os logs da
extensão são necessários para identificar a causa exata.

## Ações que não resolveram

- Excluir a mensagem antiga pela lixeira.
- Executar `Developer: Reload Window`.
- Atualizar o VS Code.
- Reiniciar os processos relacionados ao VS Code/Codex.
- Criar um chat novo com `Work locally` selecionado.

## Conduta segura enquanto o problema persiste

- Não clicar em `Resume`, `Retry` ou no botão de envio da mensagem antiga.
- Não continuar o trabalho pelo chat antigo enquanto a fila fantasma estiver
  presente.
- Usar um chat novo para comunicação.
- Executar comandos manualmente no terminal somente quando necessário e revisar
  seus efeitos antes da execução.
- Não apagar dados da extensão nem reinstalá-la antes de coletar os logs, pois
  isso pode remover evidências úteis para o diagnóstico.

## Próximos passos de diagnóstico

1. Abrir **Exibir → Saída** no VS Code.
2. Selecionar o canal **Codex** ou **ChatGPT**, conforme o nome disponível.
3. Reproduzir a exclusão da mensagem e executar `Developer: Reload Window`.
4. Salvar as linhas registradas imediatamente antes e depois da recarga.
5. Se o canal não existir, abrir os logs do **Extension Host** pelo comando
   `Developer: Show Logs`.
6. Registrar as versões do VS Code e da extensão do Codex.
7. Procurar nos logs ocorrências de `setup refresh`, `unified exec`, `helper` e
   erros de persistência ou sincronização.

## Critério para considerar o problema resolvido

O ambiente só deve ser considerado recuperado quando todos os testes abaixo
forem aprovados:

1. uma mensagem curta é recebida exatamente uma vez;
2. nenhuma mensagem excluída reaparece após recarregar a janela;
3. `Get-Location` é executado pelo Codex;
4. `git status --short` é executado dentro do projeto;
5. um novo chat e o chat atual conseguem usar o executor local sem
   `setup refresh had errors`.

## Resolução aplicada em 2 de outubro de 2026

O arquivo `C:\Users\mathe\.codex\.sandbox\sandbox.2026-10-02.log` identificou
que o sandbox não conseguia atualizar a ACL de
`E:\projetos\magrin-sac\.git`. A pasta pertencia a
`MATH\CodexSandboxOffline`, e a etapa de preparação falhava ao tentar aplicar a
ACE de negação usada para proteger os metadados Git.

A correção mínima foi restaurar, em um PowerShell elevado, somente o
proprietário da pasta `.git` superior para `MATH\mathe`, sem usar operações
recursivas ou redefinir as demais ACLs. Depois da correção, `Get-Location` e
`git status --short` voltaram a funcionar pelo executor do Codex.

O defeito da fila foi registrado separadamente pela extensão
`openai.chatgpt-26.928.40906`: ao liberar o bloqueio de envio, a webview tentou
executar `JSON.parse` sobre `undefined`. A recuperação do executor não demonstra
que esse segundo defeito foi corrigido; a fila deve continuar sendo observada.

## Referência

- [Mastering remote engineering work from your phone](https://developers.openai.com/blog/mastering-codex-remote-for-engineering),
  documentação oficial da OpenAI que descreve a diferença entre mensagens em
  fila e mensagens usadas para orientar um turno em andamento.
