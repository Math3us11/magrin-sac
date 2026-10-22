# Backup e restauração do MariaDB

## Objetivo e limite

Este runbook descreve o procedimento manual de backup e restauração dos bancos
locais usados pelo projeto:

- `DB_DATABASE`: desenvolvimento, normalmente `magrin_sac`;
- `STABLE_DB_DATABASE`: demonstração publicada pelo túnel, normalmente
  `magrin_sac_stable`.

O procedimento reduz o risco operacional do ambiente atual, mas **não define a
política institucional de backup**. Frequência, retenção, criptografia,
responsável e evidência periódica do teste de restauração continuam pendentes em
`OPEN_QUESTIONS.md`. Antes de produção, esses itens precisam ser aprovados.

Os dumps contêm dados pessoais e devem receber a mesma proteção do banco. Nunca
os envie ao Git, anexe em Pull Requests, compartilhe por canais não autorizados
ou mantenha cópias sem necessidade.

## Pré-requisitos

1. MariaDB acessível com os valores do `.env` global (`DB_HOST`, `DB_PORT` e
   `DB_USERNAME`).
2. Cliente da mesma versão principal do servidor ou compatível.
3. Espaço livre suficiente para o dump e para uma restauração de teste.
4. Permissão para consultar todas as tabelas e, na restauração, criar e remover o
   banco de validação.

No PowerShell, confirme as ferramentas:

```powershell
mariadb-dump.exe --version
mariadb.exe --version
```

Se os comandos não forem encontrados, localize a pasta `bin` da instalação do
MariaDB — normalmente dentro de `C:\Program Files\MariaDB <versão>\bin` — e
adicione-a ao `PATH` da sessão. Não copie a senha para o histórico do terminal;
os comandos abaixo usam `--password` para solicitá-la interativamente.

## Onde armazenar

Prefira uma pasta fora do repositório, em volume local criptografado e acessível
somente ao responsável. Exemplo:

```powershell
$backupRoot = Join-Path ([Environment]::GetFolderPath('MyDocuments')) 'magrin-sac-backups'
New-Item -ItemType Directory -Force -Path $backupRoot | Out-Null
```

A pasta `.backups/` está ignorada pelo Git apenas como proteção adicional para
uma emergência. Isso não torna o diretório seguro nem substitui criptografia.

## Criar um backup

### 1. Identificar o banco correto

Confira o `.env` sem copiar `DB_PASSWORD` para comandos ou mensagens. Defina na
sessão somente valores não secretos:

```powershell
$dbHost = 'localhost'
$dbPort = 3306
$dbUser = 'root'
$sourceDatabase = 'magrin_sac'
```

Para a demonstração, altere apenas `$sourceDatabase` para o valor exato de
`STABLE_DB_DATABASE`, normalmente `magrin_sac_stable`. Não presuma que os dois
bancos possuem os mesmos dados.

### 2. Gerar o dump consistente

Não aplique migrations nem execute alterações administrativas durante o backup.
Com tabelas InnoDB, `--single-transaction` obtém uma visão consistente sem
bloquear a aplicação durante toda a cópia:

```powershell
$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$dumpPath = Join-Path $backupRoot "$sourceDatabase-$timestamp.sql"

mariadb-dump.exe `
  --host=$dbHost `
  --port=$dbPort `
  --user=$dbUser `
  --password `
  --single-transaction `
  --quick `
  --routines `
  --events `
  --triggers `
  --hex-blob `
  --default-character-set=utf8mb4 `
  --result-file="$dumpPath" `
  $sourceDatabase

if ($LASTEXITCODE -ne 0) { throw 'O backup do MariaDB falhou.' }
```

O dump não inclui `CREATE DATABASE` nem troca automática de banco. Essa escolha
impede que um teste de restauração redirecione silenciosamente para o banco de
origem.

### 3. Validar e registrar a evidência

```powershell
$dump = Get-Item -LiteralPath $dumpPath
if ($dump.Length -eq 0) { throw 'O arquivo de backup está vazio.' }

$hash = Get-FileHash -Algorithm SHA256 -LiteralPath $dumpPath
$hash | Format-List Algorithm,Hash,Path
```

Registre junto ao dump, sem segredos:

- data e hora;
- banco de origem;
- ambiente (`development` ou `stable`);
- commit correspondente (`git rev-parse HEAD`);
- tamanho do arquivo;
- hash SHA-256;
- responsável pela execução;
- resultado do teste de restauração.

O hash detecta corrupção ou alteração, mas não prova que o conteúdo é
restaurável. A validação real é o teste da próxima seção.

## Testar a restauração sem tocar nos bancos ativos

Use exclusivamente o banco descartável `magrin_sac_restore_check`. O nome é
deliberadamente diferente dos dois bancos da aplicação.

### 1. Criar o banco de validação vazio

```powershell
$restoreDatabase = 'magrin_sac_restore_check'
$protectedDatabases = @('magrin_sac', 'magrin_sac_stable')

if ($protectedDatabases -contains $restoreDatabase) {
  throw 'O teste de restauração não pode usar um banco da aplicação.'
}

mariadb.exe `
  --host=$dbHost `
  --port=$dbPort `
  --user=$dbUser `
  --password `
  --execute="DROP DATABASE IF EXISTS ``$restoreDatabase``; CREATE DATABASE ``$restoreDatabase`` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

if ($LASTEXITCODE -ne 0) { throw 'Não foi possível preparar o banco de validação.' }
```

Esse `DROP DATABASE` deve ser executado somente depois da validação do nome
acima. Nunca substitua `$restoreDatabase` pelo banco de desenvolvimento ou pelo
banco estável.

### 2. Importar o dump

O comando `SOURCE` evita o redirecionamento de texto do PowerShell, que pode
alterar a codificação do arquivo em versões antigas:

```powershell
$sourcePath = $dumpPath.Replace('\', '/')

mariadb.exe `
  --host=$dbHost `
  --port=$dbPort `
  --user=$dbUser `
  --password `
  --database=$restoreDatabase `
  --execute="SOURCE $sourcePath"

if ($LASTEXITCODE -ne 0) { throw 'A restauração de validação falhou.' }
```

### 3. Conferir estrutura e migrations

```powershell
mariadb.exe `
  --host=$dbHost `
  --port=$dbPort `
  --user=$dbUser `
  --password `
  --database=$restoreDatabase `
  --execute="SELECT COUNT(*) AS tables_restored FROM information_schema.tables WHERE table_schema = DATABASE(); SELECT COUNT(*) AS migrations_restored FROM sequelize_migrations;"
```

Além dos totais, faça verificações funcionais proporcionais ao incidente: conte
registros essenciais, confirme relacionamentos e, quando necessário, execute a
API temporariamente apontando `DB_DATABASE` para o banco de validação. Não use o
túnel nesse teste.

### 4. Remover somente o banco descartável

```powershell
if ($restoreDatabase -ne 'magrin_sac_restore_check') {
  throw 'Nome inesperado; o banco não será removido.'
}

mariadb.exe `
  --host=$dbHost `
  --port=$dbPort `
  --user=$dbUser `
  --password `
  --execute="DROP DATABASE ``$restoreDatabase``;"
```

## Restaurar um ambiente real

Esta operação substitui todos os dados do banco alvo. Execute somente diante de
incidente confirmado e com autorização do responsável.

1. Pare `pnpm start:dev` ou, para o ambiente publicado, encerre primeiro
   `pnpm tunnel` e depois `pnpm stable`.
2. Confirme se o dump pertence ao ambiente e ao commit desejados.
3. Verifique novamente o SHA-256 e conclua o teste em
   `magrin_sac_restore_check`.
4. Gere um backup de segurança do banco atual antes de substituí-lo.
5. Confirme por escrito o nome exato do banco alvo.
6. Defina e valide o alvo. O comando exige que o operador digite novamente o
   nome completo antes da remoção:

```powershell
$targetDatabase = 'magrin_sac'
$allowedTargets = @('magrin_sac', 'magrin_sac_stable')

if ($allowedTargets -notcontains $targetDatabase) {
  throw 'O banco alvo não pertence aos ambientes conhecidos.'
}

$confirmation = Read-Host "Digite $targetDatabase para confirmar a substituição integral"
if ($confirmation -cne $targetDatabase) {
  throw 'Confirmação divergente; a restauração foi cancelada.'
}
```

7. Recrie o alvo com o charset do projeto e importe o dump já validado:

```powershell
mariadb.exe `
  --host=$dbHost `
  --port=$dbPort `
  --user=$dbUser `
  --password `
  --execute="DROP DATABASE ``$targetDatabase``; CREATE DATABASE ``$targetDatabase`` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

if ($LASTEXITCODE -ne 0) { throw 'Não foi possível recriar o banco alvo.' }

$sourcePath = $dumpPath.Replace('\', '/')
mariadb.exe `
  --host=$dbHost `
  --port=$dbPort `
  --user=$dbUser `
  --password `
  --database=$targetDatabase `
  --execute="SOURCE $sourcePath"

if ($LASTEXITCODE -ne 0) { throw 'A restauração do banco alvo falhou.' }
```

8. Aponte temporariamente `DB_DATABASE` para o banco restaurado e execute:

```powershell
$previousDatabase = $env:DB_DATABASE
try {
  $env:DB_DATABASE = $targetDatabase
  pnpm.cmd --filter backend db:check
  pnpm.cmd --filter backend db:migrate:status
} finally {
  if ($null -eq $previousDatabase) {
    Remove-Item Env:DB_DATABASE -ErrorAction SilentlyContinue
  } else {
    $env:DB_DATABASE = $previousDatabase
  }
}
```

9. Não aplique migrations automaticamente até confirmar que o código corresponde
   ao commit registrado no backup. Depois da compatibilidade validada, use o
   fluxo normal de migrations.
10. Inicie a aplicação sem o túnel, valide login, permissões, agenda,
    agendamentos, atendimentos e dashboard.
11. Somente então, se for o ambiente estável, inicie `pnpm stable` e depois
    `pnpm tunnel`.

Não restaure um dump de desenvolvimento sobre o banco estável apenas para copiar
usuários ou dados pontuais. Migração parcial precisa de script revisado,
transação, auditoria e backup próprio.

## Quando executar no ambiente atual

Enquanto a política institucional não for aprovada, use este procedimento
manual pelo menos antes de operações de risco claramente identificadas:

- migration estrutural ou correção manual de dados;
- promoção que altere persistência no banco estável;
- apresentação que dependa de dados preparados previamente;
- intervenção administrativa em lote;
- investigação ou recuperação de incidente.

Essa lista é um gatilho operacional provisório, não uma definição de frequência
ou retenção. Não apague backups até que o responsável confirme que o período de
recuperação terminou; também não os conserve indefinidamente sem a política LGPD
correspondente.

## Checklist de evidência

- [ ] banco de origem confirmado;
- [ ] aplicação sem migrations ou alterações simultâneas;
- [ ] dump concluído sem erro e fora do repositório;
- [ ] tamanho maior que zero e SHA-256 registrado;
- [ ] commit e ambiente registrados;
- [ ] restauração concluída no banco descartável;
- [ ] tabelas e `sequelize_migrations` conferidas;
- [ ] verificação funcional executada;
- [ ] banco descartável removido;
- [ ] resultado e responsável registrados sem dados pessoais ou segredos.
