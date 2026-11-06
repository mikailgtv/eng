#!/usr/bin/env node
/**
 * Phase 34D — guarded PostgreSQL migration command.
 *
 * Routes Prisma at the ISOLATED PostgreSQL schema/workspace and refuses to run
 * unless the preflight passes. The active SQLite provider is never touched: the
 * command always passes `--schema prisma/postgresql/schema.prisma` and never
 * relies on the default schema.
 *
 *   node scripts/db/pg-migrate.mjs status
 *   node scripts/db/pg-migrate.mjs deploy --yes
 *   node scripts/db/pg-migrate.mjs diff
 *
 * Every mode requires PG_STAGING_DATABASE_URL + PG_STAGING_DISPOSABLE=yes.
 * `deploy` additionally requires --yes.
 * Exit non-zero on any failure. Never prints the URL.
 */
import { execFileSync } from "node:child_process";
import path from "node:path";

const ROOT = process.cwd();
const SCHEMA = path.join("prisma", "postgresql", "schema.prisma");
const mode = process.argv[2] ?? "status";
const confirmed = process.argv.includes("--yes");

if (!["status", "deploy", "diff", "resolve"].includes(mode)) {
  console.error("usage: pg-migrate.mjs <status|deploy|diff|resolve> [--applied <name>] [--yes]");
  process.exit(2);
}
if (mode === "deploy" && !confirmed) {
  console.error("REFUSED: 'deploy' changes the staging database. Re-run with --yes.");
  process.exit(2);
}

// Re-use the preflight as the single source of truth for "may I proceed".
try {
  execFileSync(process.execPath, [path.join(ROOT, "scripts", "db", "pg-preflight.mjs")], { cwd: ROOT, stdio: "inherit", env: process.env });
} catch {
  console.error("\nREFUSED: preflight did not pass — no PostgreSQL operation was attempted.");
  process.exit(2);
}

// Phase 35: psql and Prisma need different TLS parameter names, so the URL used
// by the Prisma CLI may differ from the one used by psql-based tooling.
// PG_STAGING_PRISMA_URL, when set, is used for migration commands; the
// disposable-target guard still runs against PG_STAGING_DATABASE_URL upstream.
const url = process.env.PG_STAGING_PRISMA_URL || process.env.PG_STAGING_DATABASE_URL;
const env = { ...process.env, DATABASE_URL: url }; // Prisma reads DATABASE_URL for this schema

const args = ["prisma", "migrate", mode === "diff" ? "diff" : mode];
if (mode === "status" || mode === "deploy" || mode === "resolve") args.push("--schema", SCHEMA);
if (mode === "resolve") {
  const i = process.argv.indexOf("--applied");
  if (i < 0 || !process.argv[i + 1]) {
    console.error("REFUSED: resolve requires --applied <migration_name>");
    process.exit(2);
  }
  args.push("--applied", process.argv[i + 1]);
}
if (mode === "diff") {
  // Compare the live staging database against the PostgreSQL schema.
  args.push("--from-url", url, "--to-schema-datamodel", SCHEMA, "--exit-code");
}

console.log(`\n[pg] running: prisma ${args[1]} (schema ${SCHEMA})`);
try {
  const out = execFileSync("npx", args, { cwd: ROOT, encoding: "utf8", env });
  process.stdout.write(out);
  console.log(`\n[pg] ${mode} completed (exit 0)`);
} catch (e) {
  const stdout = (e.stdout ?? "").toString();
  const stderr = (e.stderr ?? "").toString();
  // Redact anything that looks like a connection string before printing.
  const redact = (s) => s.replace(/postgres(ql)?:\/\/[^\s"']+/g, "postgresql://[REDACTED]");
  process.stdout.write(redact(stdout));
  process.stderr.write(redact(stderr));
  if (mode === "status" && e.status === 1) {
    // Prisma exits 1 from `migrate status` when migrations are pending.
    // That is an expected state, not a command failure.
    console.log(`\n[pg] status: migrations are pending (exit 1 = pending, not an error)`);
    process.exit(1);
  }
  console.error(`\n[pg] ${mode} FAILED (exit ${e.status ?? "?"})`);
  process.exit(e.status ?? 1);
}
