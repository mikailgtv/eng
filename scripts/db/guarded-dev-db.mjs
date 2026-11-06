import path from "node:path";
import { spawnSync } from "node:child_process";

const action = process.argv[2];
const scripts = {
  push: ["prisma", "db", "push"],
  seed: ["tsx", "prisma/seed.ts"],
  phase20: ["tsx", "prisma/phase20-curriculum-seed.ts"],
  qa: ["tsx", "prisma/phase20-qa-fixtures.ts"],
};
if (action === "reset") {
  console.error("db:reset is disabled: use a separately created disposable database and restore/seed it with an explicit, reviewed plan.");
  process.exit(2);
}
const command = scripts[action];
if (!command) {
  console.error("Usage: guarded-dev-db.mjs <push|seed|phase20|qa|reset>");
  process.exit(2);
}
const rawUrl = process.env.DATABASE_URL;
const confirm = process.env.PHASE21_SANDBOX_CONFIRM;
if (process.env.NODE_ENV === "production" || process.env.NETLIFY === "true" || process.env.CONTEXT === "production") {
  console.error("Refusing schema/data operations in a deployment environment."); process.exit(2);
}
if (confirm !== "YES" || !rawUrl?.startsWith("file:")) {
  console.error("Refusing schema/data operations. Set DATABASE_URL=file:./phase21-sandbox.db and PHASE21_SANDBOX_CONFIRM=YES explicitly."); process.exit(2);
}
const target = path.resolve(process.cwd(), "prisma", rawUrl.slice(5).split("?")[0]);
const allowed = path.resolve(process.cwd(), "prisma", "phase21-sandbox.db");
if (target !== allowed) {
  console.error("Refusing schema/data operations: only prisma/phase21-sandbox.db is allowlisted; dev.db and shared targets are protected."); process.exit(2);
}
const bin = process.platform === "win32" ? "npx.cmd" : "npx";
console.log(`Running ${action} against allowlisted disposable DB: ${target}`);
const result = spawnSync(bin, command, { stdio: "inherit", env: process.env, shell: process.platform === "win32" });
process.exit(result.status ?? 1);
