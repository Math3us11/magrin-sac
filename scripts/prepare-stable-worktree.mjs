import { existsSync } from "node:fs";
import {
  assertStableWorktree,
  packageManagerCommand,
  PRIMARY_WORKTREE_PATH,
  run,
  STABLE_WORKTREE_PATH,
} from "./stable-worktree.mjs";

if (!existsSync(STABLE_WORKTREE_PATH)) {
  console.log("[STABLE] Criando o worktree local da branch main...");
  run("git", ["worktree", "add", STABLE_WORKTREE_PATH, "main"], {
    cwd: PRIMARY_WORKTREE_PATH,
  });
}

assertStableWorktree();
const packageManager = packageManagerCommand();
console.log("[STABLE] Instalando dependências com o lockfile versionado...");
run(
  packageManager.command,
  [...packageManager.argsPrefix, "install", "--frozen-lockfile"],
  {
    cwd: STABLE_WORKTREE_PATH,
    env: { ...process.env, CI: process.env.CI ?? "true" },
  },
);
console.log(`[STABLE] Worktree pronto em ${STABLE_WORKTREE_PATH}.`);
