import {
  assertStableWorktree,
  packageManagerCommand,
  run,
  STABLE_WORKTREE_PATH,
} from "./stable-worktree.mjs";

assertStableWorktree();
console.log("[STABLE] Buscando a main publicada no origin...");
run("git", ["fetch", "origin", "main"], { cwd: STABLE_WORKTREE_PATH });
run("git", ["merge", "--ff-only", "origin/main"], {
  cwd: STABLE_WORKTREE_PATH,
});

const packageManager = packageManagerCommand();
run(
  packageManager.command,
  [...packageManager.argsPrefix, "install", "--frozen-lockfile"],
  {
    cwd: STABLE_WORKTREE_PATH,
    env: { ...process.env, CI: process.env.CI ?? "true" },
  },
);
console.log("[STABLE] Versão estável sincronizada com origin/main.");
