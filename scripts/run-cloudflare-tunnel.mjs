import { spawn } from "node:child_process";
import { access } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { loadEnvFile } from "node:process";
import { fileURLToPath } from "node:url";
import { resolveCloudflareConfig } from "./cloudflare-config.mjs";

const ROOT_PATH = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ENV_PATH = resolve(ROOT_PATH, ".env");

try {
  loadEnvFile(ENV_PATH);
} catch {
  throw new Error(
    "Arquivo .env não encontrado. Copie .env.example e configure o túnel.",
  );
}

const config = resolveCloudflareConfig(process.env);

try {
  await access(config.credentialsFile);
} catch {
  throw new Error(
    `Credencial do túnel não encontrada em ${config.credentialsFile}. Confirme o UUID e execute primeiro \`cloudflared tunnel create magrin-sac\`.`,
  );
}

const healthUrl = new URL("/api/health", config.origin);
const frontendUrl = new URL("/", config.origin);
let healthResponse;
let frontendResponse;

try {
  [healthResponse, frontendResponse] = await Promise.all([
    fetch(healthUrl, { signal: AbortSignal.timeout(5_000) }),
    fetch(frontendUrl, {
      headers: { accept: "text/html" },
      signal: AbortSignal.timeout(5_000),
    }),
  ]);
} catch {
  throw new Error(
    `A aplicação não respondeu em ${config.origin.origin}. Execute \`pnpm remote\` antes do túnel.`,
  );
}

const health = await healthResponse.json();
const frontendContentType = frontendResponse.headers.get("content-type") ?? "";
if (
  !healthResponse.ok ||
  health?.status !== "ok" ||
  health?.database !== "reachable" ||
  !frontendResponse.ok ||
  !frontendContentType.includes("text/html")
) {
  throw new Error(
    "A aplicação local está incompleta ou incompatível. Reinicie `pnpm remote` antes do túnel.",
  );
}

console.log(
  `[TUNNEL] Publicando https://${config.publicHostname} → ${config.origin.origin}`,
);
console.log(
  "[TUNNEL] O ambiente da aplicação permanece development. Pressione Ctrl+C para encerrar.",
);

const child = spawn(
  "cloudflared",
  [
    "tunnel",
    "--no-autoupdate",
    "run",
    "--url",
    config.origin.origin,
    "--credentials-file",
    config.credentialsFile,
    config.tunnelId,
  ],
  {
    cwd: ROOT_PATH,
    shell: false,
    stdio: "inherit",
    windowsHide: true,
  },
);

const exitCode = await new Promise((resolveExitCode, reject) => {
  child.once("error", reject);
  child.once("exit", (code) => resolveExitCode(code ?? 1));
});

process.exitCode = exitCode;
