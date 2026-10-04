import { spawn, spawnSync } from "node:child_process";
import {
  assertStableWorktree,
  packageManagerCommand,
  STABLE_WORKTREE_PATH,
} from "./stable-worktree.mjs";

assertStableWorktree();
const packageManager = packageManagerCommand();
console.log(
  `[STABLE] Executando exclusivamente a main em ${STABLE_WORKTREE_PATH}.`,
);

const child = spawn(
  packageManager.command,
  [...packageManager.argsPrefix, "remote"],
  {
    cwd: STABLE_WORKTREE_PATH,
    env: process.env,
    shell: false,
    stdio: "inherit",
    windowsHide: true,
  },
);
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
  console.error(`[STABLE] Não foi possível iniciar a main: ${error.message}`);
  stop(1);
});
child.once("exit", (code, signal) => {
  if (stopping) return;
  if (signal) console.warn(`[STABLE] Processo encerrado pelo sinal ${signal}.`);
  stop(code ?? 1);
});
