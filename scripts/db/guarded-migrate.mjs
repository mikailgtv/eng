#!/usr/bin/env node
/**
 * Phase 33G — guarded migration runner.
 *
 * Refuses to run any Prisma migration command against:
 *   - the preserved source database (prisma/dev.db)
 *   - anything that is not SQLite
 *   - anything whose path looks like production or shared staging
 *
 * Only disposable/rehearsal targets are allowed unless the caller explicitly
 * passes --allow-path <dir>.
 *
 *   node scripts/db/guarded-migrate.mjs status
 *   node scripts/db/guarded-migrate.mjs deploy --yes
 *   node scripts/db/guarded-migrate.mjs resolve --applied <migration_name> --yes
 */
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SRC_DB = path.resolve(ROOT, "prisma", "dev.db");
const SAFE_ROOTS = [path.resolve(ROOT, "e2e"), path.resolve("/tmp")];
const FORBIDDEN = [/prod/i, /production/i, /staging/i, /shared/i, /live/i, /rds\./i, /amazonaws/i, /neon\.tech/i, /supabase/i];

const argv = process.argv.slice(2);
const command = argv[0];
const allowIdx = argv.indexOf("--allow-path");
const allowPath = allowIdx >= 0 ? path.resolve(argv[allowIdx + 1] ?? "") : null;
const confirmed = argv.includes("--yes");

if (!["status", "deploy", "resolve", "diff"].includes(command)) {
  console.error("usage: guarded-migrate.mjs <status|deploy|resolve|diff> [--applied <name>] [--allow-path <dir>] [--yes]");
  process.exit(2);
}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("REFUSED: DATABASE_URL is not set.");
  process.exit(2);
}
if (!url.startsWith("file:")) {
  console.error("REFUSED: only SQLite targets are supported by this repository right now.");
  console.error("         A PostgreSQL target requires an explicitly configured staging environment.");
  process.exit(2);
}

const target = path.resolve(url.slice("file:".length));
if (target === SRC_DB) {
  console.error("REFUSED: prisma/dev.db is the preserved source database and must stay read-only.");
  console.error("         Copy it first: cp prisma/dev.db e2e/mig33/<name>.db");
  process.exit(2);
}
if (FORBIDDEN.some((re) => re.test(target))) {
  console.error("REFUSED: target path looks like a production/shared environment.");
  process.exit(2);
}
const safeRoots = allowPath ? [...SAFE_ROOTS, allowPath] : SAFE_ROOTS;
if (!safeRoots.some((root) => target.startsWith(root + path.sep))) {
  console.error(`REFUSED: target ${target} is outside the disposable roots (${safeRoots.join(", ")}).`);
  console.error("         Pass --allow-path <dir> after reviewing the target yourself.");
  process.exit(2);
}
if (!existsSync(target)) {
  console.error(`REFUSED: target ${target} does not exist.`);
  process.exit(2);
}
if (command !== "status" && !confirmed) {
  console.error(`REFUSED: '${command}' changes the database. Re-run with --yes after checking the target:`);
  console.error(`         ${target}`);
  process.exit(2);
}

console.log(`[guard] target ${target}`);
console.log(`[guard] source ${SRC_DB} (never written)`);

const args = ["prisma", "migrate", command];
if (command === "resolve") {
  const i = argv.indexOf("--applied");
  if (i < 0 || !argv[i + 1]) {
    console.error("REFUSED: resolve requires --applied <migration_name>");
    process.exit(2);
  }
  args.push("--applied", argv[i + 1]);
}
if (command === "diff") args.push("--from-url", url, "--to-schema-datamodel", "prisma/schema.prisma", "--exit-code");

try {
  const out = execFileSync("npx", args, { cwd: ROOT, encoding: "utf8", env: { ...process.env, DATABASE_URL: url } });
  process.stdout.write(out);
} catch (e) {
  process.stdout.write(e.stdout ?? "");
  process.stderr.write(e.stderr ?? "");
  process.exit(e.status ?? 1);
}
