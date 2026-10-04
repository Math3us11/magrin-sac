import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { loadEnvFile } from "node:process";
import { fileURLToPath } from "node:url";
import {
  resolveCloudflareConfig,
  resolveStableDatabase,
} from "./cloudflare-config.mjs";

const ROOT_PATH = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const BACKEND_ENTRY_PATH = resolve(ROOT_PATH, "backend", "dist", "main.js");
const DATABASE_CLI_PATH = resolve(
  ROOT_PATH,
  "backend",
  "dist",
  "database",
  "database-cli.js",
);
const npmCliPath = process.env.npm_execpath;

function gitOutput(args) {
  const result = spawnSync("git", args, {
    cwd: ROOT_PATH,
    encoding: "utf8",
    shell: false,
    windowsHide: true,
  });

  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || `git ${args.join(" ")} falhou.`);
  }

  return result.stdout.trim();
}

const currentBranch = gitOutput(["branch", "--show-current"]);
if (currentBranch !== "main") {
  throw new Error(
    `O ambiente remoto aceita somente a branch main; branch atual: ${currentBranch || "detached"}. Use \`pnpm stable\` a partir do diretório principal.`,
  );
}

const commonGitDirectory = gitOutput([
  "rev-parse",
  "--path-format=absolute",
  "--git-common-dir",
]);
const primaryWorktreePath = resolve(commonGitDirectory, "..");
const explicitEnvPath = process.env.MAGRIN_SAC_ENV_FILE?.trim();
const ENV_PATH = explicitEnvPath
  ? resolve(explicitEnvPath)
  : resolve(primaryWorktreePath, ".env");

if (!npmCliPath) {
  throw new Error("Este iniciador deve ser executado por `pnpm remote`.");
}

if (!existsSync(ENV_PATH)) {
  throw new Error(
    "Arquivo .env não encontrado. Copie .env.example e configure o ambiente local.",
  );
}

loadEnvFile(ENV_PATH);
const cloudflareConfig = resolveCloudflareConfig(process.env);
const stableDatabase = resolveStableDatabase(process.env);

function run(command, args, description, environment = process.env) {
  console.log(`[REMOTE] ${description}...`);
  const result = spawnSync(command, args, {
    cwd: ROOT_PATH,
    env: environment,
    shell: false,
    stdio: "inherit",
    windowsHide: true,
  });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(
      `${description} falhou com código ${result.status ?? "desconhecido"}.`,
    );
  }
}

const runtimeEnvironment = {
  ...process.env,
  APP_ENV: "development",
  APP_HOST: cloudflareConfig.origin.hostname,
  APP_SERVE_FRONTEND: "true",
  AUTH_SESSION_COOKIE_SECURE: "true",
  CORS_ORIGIN: `https://${cloudflareConfig.publicHostname}`,
  DB_DATABASE: stableDatabase,
  PORT: cloudflareConfig.port,
};

run(process.execPath, [npmCliPath, "build"], "Gerando os builds do workspace");
run(
  process.execPath,
  [DATABASE_CLI_PATH, "create"],
  `Preparando o banco estável ${stableDatabase}`,
  runtimeEnvironment,
);
run(
  process.execPath,
  [DATABASE_CLI_PATH, "migrate"],
  "Aplicando migrations pendentes no banco estável",
  runtimeEnvironment,
);

console.log(
  `[REMOTE] Iniciando ambiente de demonstração em ${cloudflareConfig.origin.origin} com APP_ENV=development...`,
);

const child = spawn(process.execPath, [BACKEND_ENTRY_PATH], {
  cwd: ROOT_PATH,
  env: runtimeEnvironment,
  shell: false,
  stdio: "inherit",
  windowsHide: true,
});
let stopping = false;

function stop(exitCode = 0) {
  if (stopping) return;
  stopping = true;

  if (!child.killed && child.pid) {
    if (process.platform === "win32") {
      spawnSync("taskkill.exe", ["/pid", String(child.pid), "/T", "/F"], {
        stdio: "ignore",
        windowsHide: true,
      });
    } else {
      child.kill("SIGTERM");
    }
  }

  process.exitCode = exitCode;
}

process.once("SIGINT", () => stop());
process.once("SIGTERM", () => stop());
child.once("error", (error) => {
  console.error(
    `[REMOTE] Não foi possível iniciar a aplicação: ${error.message}`,
  );
  stop(1);
});

async function waitUntilReady() {
  const healthUrl = new URL("/api/health", cloudflareConfig.origin);
  const frontendUrl = new URL("/", cloudflareConfig.origin);
  const deadline = Date.now() + 30_000;
  let lastError;

  while (Date.now() < deadline && !stopping) {
    try {
      const [healthResponse, frontendResponse] = await Promise.all([
        fetch(healthUrl, { signal: AbortSignal.timeout(2_000) }),
        fetch(frontendUrl, {
          headers: { accept: "text/html" },
          signal: AbortSignal.timeout(2_000),
        }),
      ]);
      const health = await healthResponse.json();
      const contentType = frontendResponse.headers.get("content-type") ?? "";

      if (
        healthResponse.ok &&
        health?.status === "ok" &&
        health?.database === "reachable" &&
        frontendResponse.ok &&
        contentType.includes("text/html")
      ) {
        console.log(
          `[REMOTE] Aplicação pronta em ${cloudflareConfig.origin.origin}.`,
        );
        console.log("[REMOTE] Em outro terminal, execute `pnpm tunnel`.");
        return;
      }

      lastError = new Error(
        "health check ou frontend respondeu com conteúdo inesperado",
      );
    } catch (error) {
      lastError = error;
    }

    await new Promise((resolveWait) => setTimeout(resolveWait, 500));
  }

  const detail = lastError instanceof Error ? `: ${lastError.message}` : "";
  throw new Error(
    `A aplicação não ficou pronta dentro de 30 segundos${detail}.`,
  );
}

try {
  await waitUntilReady();
} catch (error) {
  console.error(
    `[REMOTE] ${error instanceof Error ? error.message : String(error)}`,
  );
  stop(1);
}

if (!stopping) {
  const exitCode = await new Promise((resolveExitCode) => {
    child.once("exit", (code, signal) => {
      if (signal)
        console.warn(`[REMOTE] Aplicação encerrada pelo sinal ${signal}.`);
      resolveExitCode(code ?? 1);
    });
  });
  stop(exitCode);
}
