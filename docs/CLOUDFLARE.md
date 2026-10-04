# Cloudflare Tunnel para demonstração

## Estado

O repositório está preparado para publicar temporariamente o sistema em
`agenda.magrinapp.com`. O túnel nomeado `magrin-sac` foi criado em 4 de outubro
de 2026 e teve quatro conexões QUIC validadas. A política Cloudflare Access foi
configurada com uma lista inicial de e-mail permitido e, em seguida, a rota DNS
foi criada. Uma requisição externa sem sessão recebeu redirecionamento para o
login do Access, confirmando que a aplicação não ficou exposta diretamente.

Este é um ambiente de demonstração. O processo força `APP_ENV=development` e
não deve ser tratado como implantação de produção.

## Arquitetura

```text
Internet
  → https://agenda.magrinapp.com
  → Cloudflare Access
  → Cloudflare Tunnel
  → http://127.0.0.1:3100 (NestJS + build Vue)
       ├── /api/*
       └── SPA e assets estáticos
  → MariaDB em 127.0.0.1:3306
```

Nenhuma porta do roteador precisa ser aberta. O backend e o banco permanecem
presos à máquina local; somente o conector `cloudflared` estabelece conexões de
saída com a Cloudflare.

## O que os comandos fazem

`pnpm stable` executa `pnpm remote` dentro do worktree da branch `main`. O
iniciador remoto:

1. carrega o `.env` global;
2. valida UUID, domínio e origem local do túnel;
3. confirma que o código pertence à branch `main`;
4. executa o build do frontend e do backend;
5. cria, quando necessário, o banco indicado por `STABLE_DB_DATABASE`;
6. aplica migrations pendentes somente nesse banco;
7. inicia o NestJS em `127.0.0.1:3100` com `APP_ENV=development`;
8. serve o build Vue no mesmo processo;
9. restringe CORS à origem HTTPS pública;
10. força o cookie de sessão como `Secure`;
11. confirma a SPA e `GET /api/health` antes de declarar o serviço pronto.

`pnpm tunnel` valida a credencial do túnel, repete os checks locais e somente
então inicia `cloudflared`.

## Provisionamento inicial

### 1. Proteger o hostname com Cloudflare Access

Faça esta etapa antes de criar a rota DNS:

1. abra o painel Cloudflare Zero Trust;
2. acesse `Access controls > Applications`;
3. crie uma aplicação `Self-hosted and private`;
4. configure `agenda.magrinapp.com`;
5. adicione uma política `Allow` apenas para os e-mails dos participantes;
6. use o provedor de identidade disponível ou código de uso único;
7. salve e confirme que a aplicação aparece ativa.

### 2. Autorizar a CLI e criar o túnel

```powershell
cloudflared tunnel login
cloudflared tunnel create magrin-sac
cloudflared tunnel list
```

No login, selecione a zona `magrinapp.com`. Copie o UUID retornado para o `.env`:

```dotenv
CLOUDFLARE_TUNNEL_ID=00000000-0000-0000-0000-000000000000
CLOUDFLARE_PUBLIC_HOSTNAME=agenda.magrinapp.com
CLOUDFLARE_TUNNEL_ORIGIN=http://127.0.0.1:3100
```

O arquivo `%USERPROFILE%\.cloudflared\<UUID>.json` é uma credencial e não deve
entrar no repositório. `CLOUDFLARE_TUNNEL_CREDENTIALS_FILE` só precisa ser
preenchida se o arquivo estiver em outro local.

### 3. Criar a rota DNS

Somente depois de a política Access estar pronta:

```powershell
cloudflared tunnel route dns magrin-sac agenda.magrinapp.com
```

## Uso durante a apresentação

Na primeira utilização, prepare o worktree da `main`:

```powershell
pnpm.cmd stable:prepare
```

Quando uma nova versão já tiver sido integrada e enviada para `origin/main`,
sincronize a cópia estável:

```powershell
pnpm.cmd stable:sync
```

Esses comandos não promovem `develop` para `main`. A promoção continua sendo
uma decisão explícita de release por merge ou pull request.

Confirme que o MariaDB está ativo. No primeiro terminal:

```powershell
pnpm.cmd stable
```

Depois que aparecer `Aplicação pronta`, abra outro terminal:

```powershell
pnpm.cmd tunnel
```

Valide `https://agenda.magrinapp.com` em janela anônima ou pelo celular. O
primeiro acesso deve mostrar a autenticação do Cloudflare Access; depois dela, o
login do próprio sistema.

Mantenha o computador ligado e sem suspensão durante a apresentação. Encerre os
dois processos com `Ctrl+C` ao terminar.

## Diagnóstico

```powershell
cloudflared --version
cloudflared tunnel list
cloudflared tunnel info magrin-sac
```

- `CLOUDFLARE_TUNNEL_ID` inválido: copie o UUID exibido por `tunnel list`;
- credencial ausente: confirme o arquivo em `%USERPROFILE%\.cloudflared`;
- health check indisponível: inicie o MariaDB e depois execute `pnpm stable`;
- erro informando branch diferente de `main`: use `pnpm stable`, não execute
  `pnpm remote` no diretório de desenvolvimento;
- `502 Bad Gateway`: confirme que o processo remoto continua em
  `127.0.0.1:3100`;
- operação de escrita rejeitada por origem: confirme exatamente
  `CLOUDFLARE_PUBLIC_HOSTNAME=agenda.magrinapp.com`;
- página acessível sem autenticação da Cloudflare: interrompa o túnel e corrija
  a política Access antes de continuar.

Não use Quick Tunnel (`trycloudflare.com`) nesse fluxo: o hostname fixo e a
proteção Access fazem parte da configuração planejada.

## Limites conhecidos

- não há disponibilidade quando o computador local, o MariaDB ou a internet
  estiverem indisponíveis;
- o banco continua local e depende da política futura de backup e restauração;
- logs e monitoramento ainda são os do processo local;
- esta configuração não resolve a decisão institucional de hospedagem em
  produção registrada em `OPEN_QUESTIONS.md`.
