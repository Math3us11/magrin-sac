# Fluxo Git e promoção da versão estável

## Objetivo

Este documento define como desenvolver, versionar e publicar alterações sem
misturar código em andamento com a versão apresentada pelo Cloudflare Tunnel.

O fluxo oficial é:

```text
branch de trabalho → Pull Request → develop → Pull Request → main → túnel
```

## Responsabilidade de cada branch

- `develop`: branch padrão, base das novas alterações e integração do trabalho
  em desenvolvimento;
- `main`: versão estável de demonstração, única branch aceita pelo ambiente do
  túnel;
- `feat/*`: nova funcionalidade;
- `fix/*`: correção de defeito;
- `docs/*`: alteração exclusivamente documental;
- `refactor/*`: reorganização sem mudança intencional de comportamento;
- `test/*`: cobertura ou infraestrutura de testes;
- `chore/*`: manutenção técnica que não se enquadra nas categorias anteriores.

`develop` e `main` são protegidas. Não faça commits ou pushes diretamente
nelas. O worktree `.worktrees/stable` materializa a `main` e também não deve
receber edições manuais.

## Iniciar uma alteração

Na pasta principal do projeto:

```bash
git switch develop
git pull --ff-only origin develop
git switch -c feat/nome-da-funcionalidade
```

Substitua `feat/` pelo prefixo adequado. Use nomes curtos em kebab-case que
descrevam uma única responsabilidade.

Durante o desenvolvimento, use terminais separados:

```bash
pnpm dev
```

```bash
pnpm start:dev
```

Esse ambiente utiliza `DB_DATABASE` e não altera o banco estável indicado por
`STABLE_DB_DATABASE`.

## Concluir e versionar a alteração

1. revise o diff e confirme que não existem arquivos ou segredos indevidos;
2. atualize a documentação afetada;
3. execute testes proporcionais ao risco; antes de concluir uma funcionalidade,
   prefira a verificação completa:

```bash
pnpm check
```

4. crie o commit na branch de trabalho:

```bash
git status --short
git add <arquivos-da-alteracao>
git commit -m "tipo: descricao objetiva"
```

5. publique somente a branch de trabalho:

```bash
git push -u origin feat/nome-da-funcionalidade
```

6. crie o Pull Request com a branch de trabalho como origem e `develop` como
   destino. O PR deve resumir a alteração, registrar as validações executadas e
   apontar limitações conhecidas.

O autor não pode aprovar o próprio PR no GitHub. Enquanto existir apenas um
mantenedor, as regras mantêm o PR obrigatório com zero aprovações exigidas. Isso
preserva o histórico e a revisão do diff sem bloquear o merge. Quando houver
outro mantenedor, a exigência pode voltar para uma aprovação.

## Atualizar a versão estável

Depois de integrar e validar as alterações em `develop`, crie um segundo Pull
Request:

```text
origem: develop
destino: main
```

Não use push direto para promover a versão. Depois do merge em `main`, pare uma
execução estável anterior e atualize o worktree:

```bash
pnpm stable:sync
pnpm stable
```

Em outro terminal:

```bash
pnpm tunnel
```

`pnpm stable` executa a `main` no worktree separado; ele não troca a branch da
pasta principal. `pnpm stable:sync` busca e avança até `origin/main`, mas não
cria commits, merges ou Pull Requests.

## Sincronizar depois dos merges

Após o primeiro PR:

```bash
git switch develop
git pull --ff-only origin develop
```

Após a promoção para `main`, `pnpm stable:sync` atualiza a worktree estável. A
branch de trabalho já integrada pode ser removida quando não for mais necessária:

```bash
git branch -d feat/nome-da-funcionalidade
git push origin --delete feat/nome-da-funcionalidade
```

A exclusão local ou remota deve ser explícita; não remova branches ainda abertas
ou sem confirmação de integração.

## Regras para agentes

Ao executar alterações no repositório, o agente deve:

1. confirmar que a base local está limpa e sincronizada;
2. criar uma branch de trabalho antes da primeira edição;
3. preservar alterações preexistentes do usuário;
4. não fazer push direto para `develop` ou `main`;
5. criar commits e Pull Requests somente quando solicitado a versionar, concluir
   ou publicar o trabalho;
6. não mesclar PRs nem excluir branches sem autorização explícita;
7. informar a branch, o commit, os testes e o destino do PR na entrega.
