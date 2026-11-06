#!/usr/bin/env node
/**
 * Phase 34C/34D — PostgreSQL staging preflight.
 *
 * Answers ONE question: is there a positively-identified, explicitly disposable
 * PostgreSQL staging target that this process may migrate?
 *
 * It fails closed. It never guesses, never falls back to SQLite, never prints a
 * credential, host or full URL, and never creates anything.
 *
 *   node scripts/db/pg-preflight.mjs
 *
 * Environment (names only — values are never printed):
 *   PG_STAGING_DATABASE_URL   dedicated staging URL (postgresql://…)
 *   PG_STAGING_DISPOSABLE     must be "yes" to confirm the target may be destroyed
 *   PG_STAGING_LABEL          short non-sensitive label used in reports
 *
 * Exit codes: 0 = ready to migrate, 2 = blocked / ambiguous, 1 = unsafe.
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const ok = (m) => console.log(`✓ ${m}`);
const no = (m) => console.log(`✗ ${m}`);
const blocked = (reasons) => {
  console.log(`\nSTATUS: BLOCKED — ${reasons} reason(s)`);
  process.exit(2);
};
const unsafe = (m) => {
  console.log(`\nSTATUS: UNSAFE — ${m}`);
  process.exit(1);
};

const reasons = [];
const url = process.env.PG_STAGING_DATABASE_URL ?? "";
const disposable = (process.env.PG_STAGING_DISPOSABLE ?? "").toLowerCase();
const label = process.env.PG_STAGING_LABEL ?? "";

console.log("=== PostgreSQL staging preflight ===\n");

// ---------------------------------------------------------------- 1. URL
if (!url) {
  no("PG_STAGING_DATABASE_URL is not set");
  reasons.push("no staging URL configured");
} else if (!/^postgres(ql)?:\/\//.test(url)) {
  unsafe("PG_STAGING_DATABASE_URL is not a postgresql:// URL");
} else {
  ok("PG_STAGING_DATABASE_URL is a postgresql:// URL");
}

// Never print the URL. Derive only a non-reversible fingerprint + allowlisted parts.
let parsed = null;
if (url && /^postgres(ql)?:\/\//.test(url)) {
  try {
    parsed = new URL(url);
  } catch {
    unsafe("PG_STAGING_DATABASE_URL cannot be parsed");
  }
}

if (parsed) {
  const fp = createHash("sha256").update(parsed.host + "/" + parsed.pathname).digest("hex").slice(0, 12);
  console.log(`  target fingerprint: ${fp}   (sha256 of host + database, truncated)`);
  console.log(`  host class: ${/^(localhost|127\.0\.0\.1|\[::1\])$/.test(parsed.hostname) ? "loopback (local disposable)" : "remote"}`);
  console.log(`  database: ${parsed.pathname.replace(/^\//, "") || "(none)"}`);
  console.log(`  sslmode: ${parsed.searchParams.get("sslmode") ?? "(not set)"}`);
  console.log(`  label: ${label || "(not set)"}`);

  // -------------------------------------------- 2. staging designation
  if (disposable !== "yes") {
    no("PG_STAGING_DISPOSABLE is not 'yes' — target is not confirmed disposable");
    reasons.push("target not explicitly confirmed disposable");
  } else {
    ok("PG_STAGING_DISPOSABLE=yes (operator confirmed this database may be destroyed)");
  }

  // ------------------------------------- 3. production-like path refusal
  const identity = `${parsed.hostname}${parsed.pathname}`;
  const forbidden = [/prod/i, /production/i, /live/i, /shared/i, /\.rds\./i, /amazonaws/i, /neon\.tech/i, /supabase/i, /render\.com/i, /heroku/i];
  const hit = forbidden.find((re) => re.test(identity));
  if (hit) unsafe(`target looks production-like (matched ${hit})`);
  ok("target does not look production-like");

  if (!parsed.pathname || parsed.pathname === "/") {
    no("URL has no database name");
    reasons.push("no database name in URL");
  } else ok(`database name present`);

  if (parsed.port && parsed.port !== "5432") console.log(`  note: non-default port ${parsed.port}`);
}

// ------------------------------------------------------- 4. local tooling
for (const bin of ["psql", "pg_dump", "pg_restore"]) {
  try {
    const { execFileSync } = await import("node:child_process");
    const v = execFileSync(bin, ["--version"], { encoding: "utf8" }).trim();
    ok(`${bin} available (${v.split("\n")[0]})`);
  } catch {
    no(`${bin} not available on PATH`);
    if (bin === "psql") reasons.push("psql client missing");
  }
}

// ------------------------------------------------ 5. workspace integrity
const wsSchema = path.join(ROOT, "prisma", "postgresql", "schema.prisma");
const wsLock = path.join(ROOT, "prisma", "postgresql", "migrations", "migration_lock.toml");
const activeSchema = path.join(ROOT, "prisma", "schema.prisma");
if (!existsSync(wsSchema)) reasons.push("PostgreSQL schema workspace missing");
else if (!/provider = "postgresql"/.test(readFileSync(wsSchema, "utf8"))) unsafe("workspace schema is not postgresql");
else ok("workspace schema prisma/postgresql/schema.prisma is postgresql");

if (!existsSync(wsLock)) reasons.push("PostgreSQL migrations lock missing");
else if (!/postgresql/.test(readFileSync(wsLock, "utf8"))) unsafe("workspace migrations lock is not postgresql");
else ok("workspace migrations lock is postgresql");

if (!/provider = "sqlite"/.test(readFileSync(activeSchema, "utf8"))) unsafe("ACTIVE schema is no longer sqlite — refusing to continue");
else ok("active schema still sqlite (unchanged by this phase)");

// ------------------------------------- 6. active DATABASE_URL must not be used
if (process.env.DATABASE_URL && process.env.DATABASE_URL === url) {
  unsafe("PG_STAGING_DATABASE_URL must not be the same as DATABASE_URL");
}

// ------------------------- 7. dual-URL parity (Phase 35)
// psql and Prisma require different TLS parameter names, so an app URL may be
// supplied separately. If it is, guarantee it targets the SAME database —
// otherwise migrations could be applied to one database while the app serves
// another. Only the host/port/database triple is compared; nothing is printed.
const appUrl = process.env.PG_APP_DATABASE_URL;
if (appUrl) {
  const triple = (raw) => {
    try {
      const u = new URL(raw);
      if (!["postgres:", "postgresql:"].includes(u.protocol)) return null;
      return `${u.hostname.toLowerCase()}:${u.port || "5432"}${u.pathname}`;
    } catch {
      return null;
    }
  };
  const a = triple(url);
  const b = triple(appUrl);
  if (!b) unsafe("PG_APP_DATABASE_URL is not a postgresql:// URL");
  else if (a !== b) unsafe("PG_APP_DATABASE_URL and PG_STAGING_DATABASE_URL target DIFFERENT databases");
  else ok("app URL and tooling URL target the same database");
}

console.log("");
if (reasons.length) blocked(reasons.length);
console.log("STATUS: READY — a positively-identified disposable staging target is configured.");
console.log("Next: node scripts/db/pg-migrate.mjs deploy");
process.exit(0);
