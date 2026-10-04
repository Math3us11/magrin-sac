import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const PRIMARY_WORKTREE_PATH = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "..",
);
export const STABLE_WORKTREE_PATH = resolve(
  PRIMARY_WORKTREE_PATH,
  ".worktrees",
  "stable",
);

export function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? PRIMARY_WORKTREE_PATH,
    encoding: options.capture ? "utf8" : undefined,
    env: options.env ?? process.env,
    shell: false,
    stdio: options.capture ? "pipe" : "inherit",
    windowsHide: true,
  });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    const detail = options.capture ? result.stderr.trim() : "";
    throw new Error(detail || `${command} ${args.join(" ")} falhou.`);
  }

  return options.capture ? result.stdout.trim() : "";
}

export function assertStableWorktree() {
  if (!existsSync(STABLE_WORKTREE_PATH)) {
    throw new Error(
      "Worktree estável ainda não existe. Execute `pnpm stable:prepare` primeiro.",
    );
  }

  const branch = run("git", ["branch", "--show-current"], {
    capture: true,
    cwd: STABLE_WORKTREE_PATH,
  });
  if (branch !== "main") {
    throw new Error(
      `O worktree estável deve permanecer na main; branch atual: ${branch}.`,
    );
  }

  const status = run("git", ["status", "--porcelain"], {
    capture: true,
    cwd: STABLE_WORKTREE_PATH,
  });
  if (status) {
    throw new Error(
      "O worktree estável possui alterações locais. Não edite .worktrees/stable; corrija antes de continuar.",
    );
  }
}

export function packageManagerCommand() {
  const npmCliPath = process.env.npm_execpath;
  if (!npmCliPath) {
    throw new Error("Execute este comando por meio do pnpm.");
  }

  return { argsPrefix: [npmCliPath], command: process.execPath };
}
