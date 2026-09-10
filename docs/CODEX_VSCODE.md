# Codex no VS Code

## Estado

O projeto está preparado para ser aberto com a extensão oficial do Codex no
VS Code.

Não existe dependência npm ou Python do Codex que precise ser adicionada à
aplicação. A integração acontece pela extensão do editor e pela instalação da
CLI no ambiente do desenvolvedor.

## Componentes esperados

- extensão do VS Code: `openai.chatgpt`;
- CLI disponível no terminal: `codex`;
- instruções do projeto: `AGENTS.md` na raiz;
- documentação de contexto: diretório `docs/`.

O arquivo `.vscode/extensions.json` faz o VS Code recomendar a extensão ao abrir
este repositório em uma máquina onde ela ainda não esteja instalada.

## Primeiro uso

1. Abra a pasta do projeto no VS Code:

   ```powershell
   code E:\projetos\magrin-sac
   ```

2. Aceite a recomendação da extensão Codex, caso ela ainda não esteja
   instalada.
3. Abra a Command Palette com `Ctrl+Shift+P`.
4. Execute `Codex: Open Codex Sidebar`.
5. Faça login quando solicitado.
6. Inicie uma conversa a partir da raiz do projeto.

## Contexto carregado pelo Codex

O Codex procura `AGENTS.md` a partir da raiz do projeto e usa essas instruções
antes de trabalhar. Neste projeto, o arquivo orienta o agente a ler a
documentação principal em `docs/` e a não transformar pendências de produto em
decisões implícitas.

Depois de alterar `AGENTS.md`, inicie uma nova sessão do Codex para garantir que
a cadeia de instruções seja reconstruída.

## Verificação local

No terminal integrado do VS Code:

```powershell
codex --version
code --list-extensions --show-versions
```

A segunda saída deve conter uma entrada iniciada por:

```text
openai.chatgpt@
```

Para confirmar que o Codex reconhece as instruções do repositório, inicie uma
sessão na raiz e peça:

```text
Resuma as instruções ativas deste projeto e diga quais documentos devem ser
lidos antes do scaffold.
```

O resultado esperado deve mencionar `AGENTS.md`, `docs/README.md`, o escopo, a
arquitetura, os requisitos e as pendências.

## Configuração e segredos

- Não versionar tokens, chaves da OpenAI ou dados de login.
- Não criar um `.env` da aplicação apenas para autenticar a extensão.
- Configurações pessoais do Codex permanecem no perfil do usuário, fora do
  repositório.
- Configurações compartilhadas só devem entrar no projeto quando forem
  necessárias e não contiverem credenciais.

