#!/usr/bin/env node
/**
 * Phase 34G — PostgreSQL backup/restore drill, driven through the application.
 *
 * 1. logs in as the synthetic staging admin (real /api/auth/login)
 * 2. calls POST /api/admin/backups/database  -> app runs pg_dump
 * 3. records only non-sensitive fields (backupId, status, size, duration)
 * 4. restores that dump into a SEPARATE throwaway database with pg_restore
 * 5. compares critical row counts and referential integrity
 *
 * Secrets: the session cookie and the database URL are never printed.
 *
 *   BASE=http://127.0.0.1:4035 node scripts/db/pg-backup-drill.mjs
 */
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

import { resolveTestBase } from "../lib/test-base.mjs";
const BASE = resolveTestBase();
const PASSWORD = process.env.E2E_PASSWORD ?? "E2eOnly!Passw0rd#32";
const ADMIN = process.env.E2E_ADMIN ?? "e2e.admin.a";
const url = process.env.PG_STAGING_DATABASE_URL;
if (!url) {
  console.error("BLOCKED: PG_STAGING_DATABASE_URL not set");
  process.exit(2);
}
if (process.env.PG_STAGING_DISPOSABLE !== "yes") {
  console.error("REFUSED: target is not confirmed disposable");
  process.exit(2);
}

let pass = 0, fail = 0;
const check = (n, ok, d = "") => { console.log(`${ok ? "✓" : "✗"} ${n}${d ? ` — ${d}` : ""}`); ok ? pass++ : fail++; };
const q = (dbUrl, sql) => execFileSync("psql", [dbUrl, "-tAF|", "-c", sql], { encoding: "utf8" }).trim();
const q1 = (dbUrl, sql) => q(dbUrl, sql).split("\n")[0];

console.log("=== PostgreSQL backup drill (through the application) ===\n");

// ---------------------------------------------------------------- login
const res = await fetch(`${BASE}/api/auth/login`, {
  method: "POST",
  headers: { "content-type": "application/json", origin: BASE },
  body: JSON.stringify({ identifier: ADMIN, password: PASSWORD }),
});
const cookie = (res.headers.getSetCookie?.() ?? []).map((c) => c.split(";")[0]).join("; ");
check("admin login on the PostgreSQL runtime", res.ok && !!cookie, `HTTP ${res.status}`);

// Refuse to assume a quiescent source: a logical dump is point-in-time, and this
// drill itself writes sessions/audit rows. Capture bounds around the dump.
const BOUNDED = ["user_sessions", "audit_logs", "login_attempts"];
const TABLES = ["users", "organizations", "content_media", "message_attachments", "audit_logs", "user_sessions", "courses", "lessons"];
const countAll = () => Object.fromEntries(TABLES.map((t) => [t, Number(q1(url, `select count(*) from "${t}"`))]));
const before = countAll();

// --------------------------------------------------------- create backup
const started = Date.now();
const bres = await fetch(`${BASE}/api/admin/backups/database`, {
  method: "POST",
  headers: { "content-type": "application/json", origin: BASE, cookie },
  body: JSON.stringify({ reason: "phase34 postgresql drill" }),
});
const body = await bres.json().catch(() => ({}));
const data = body?.data ?? {};
check("backup endpoint returned 201", bres.status === 201, `HTTP ${bres.status}`);
check("backup verified by the application", data.verified === true, `status=${data.status}`);
check("backup has a size", Number(data.sizeBytes) > 0, `${data.sizeBytes} bytes`);
check("backup has an id", typeof data.backupId === "string" && data.backupId.length > 0);
const appDuration = Date.now() - started;
console.log(`  reporting only: backupId=${data.backupId ?? "(none)"} status=${data.status ?? "?"} size=${data.sizeBytes ?? 0} appRoundTripMs=${appDuration}`);

const after = countAll();

// --------------------------------------------------------- locate file
const dir = path.join(process.cwd(), "backups", "db");
const files = existsSync(dir) ? readdirSync(dir).filter((f) => f.includes(data.backupId ?? "___")).map((f) => path.join(dir, f)) : [];
const dump = files.find((f) => !f.endsWith(".json") && !f.endsWith(".manifest.json")) ?? null;
check("dump file exists on disk", !!dump, dump ? `${path.basename(dump)} (${statSync(dump).size} bytes)` : "not found");

// --------------------------------------------- authorization boundary
for (const [label, who] of [["learner", "e2e.student.a"], ["teacher", "e2e.teacher.a"]]) {
  const r = await fetch(`${BASE}/api/auth/login`, {
    method: "POST", headers: { "content-type": "application/json", origin: BASE },
    body: JSON.stringify({ identifier: who, password: PASSWORD }),
  });
  const c = (r.headers.getSetCookie?.() ?? []).map((x) => x.split(";")[0]).join("; ");
  const b = await fetch(`${BASE}/api/admin/backups/database`, {
    method: "POST", headers: { "content-type": "application/json", origin: BASE, cookie: c },
    body: JSON.stringify({ reason: "should be denied" }),
  });
  check(`${label} cannot create a backup`, b.status === 403 || b.status === 401, `HTTP ${b.status}`);
}

if (!dump) {
  console.log(`\n=== ${pass} passed, ${fail} failed ===`);
  process.exit(1);
}

// ------------------------------------------------------- restore target
const RESTORE_DB = "lms_staging_restore_drill";
const adminUrl = url.replace(/\/[^/]+(\?|$)/, `/${RESTORE_DB}$1`);

// The restore database must be owned by the same role the application connects
// as, otherwise pg_restore cannot recreate objects. Derive it from the staging
// URL so this drill is not tied to one hard-coded role name; a role name is
// never a secret, and no password is read or echoed here.
function ownerRole(connectionUrl) {
  try {
    const u = new URL(connectionUrl);
    const role = decodeURIComponent(u.username || "");
    return /^[a-z_][a-z0-9_]{0,62}$/i.test(role) ? role : null;
  } catch {
    return null;
  }
}
const OWNER = process.env.PG_STAGING_OWNER_ROLE || ownerRole(url);
if (!OWNER) {
  check("restore owner role resolved from staging URL", false, "set PG_STAGING_OWNER_ROLE");
  process.exit(1);
}
check("restore owner role resolved from staging URL", true, OWNER);

try {
  execFileSync("sudo", ["-u", "postgres", "psql", "-tAc", `DROP DATABASE IF EXISTS ${RESTORE_DB}`], { encoding: "utf8" });
  execFileSync("sudo", ["-u", "postgres", "psql", "-tAc", `CREATE DATABASE ${RESTORE_DB} OWNER "${OWNER}"`], { encoding: "utf8" });
  check("isolated restore database created", true, RESTORE_DB);
} catch (e) {
  check("isolated restore database created", false, String(e.message).slice(0, 120));
  process.exit(1);
}

check("restore target is NOT the source database", RESTORE_DB !== new URL(url).pathname.replace(/^\//, ""));

const t0 = Date.now();
let restoreOk = true, restoreErr = "";
try {
  execFileSync("pg_restore", ["--dbname", adminUrl, "--no-owner", "--no-privileges", "--exit-on-error", dump], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
} catch (e) {
  restoreOk = false;
  restoreErr = String(e.stderr ?? e.message).replace(/postgres(ql)?:\/\/[^\s]+/g, "postgresql://[REDACTED]").slice(0, 300);
}
const restoreMs = Date.now() - t0;
check("pg_restore completed without error", restoreOk, restoreOk ? `${restoreMs} ms` : restoreErr);

// ------------------------------------------------------------ compare
if (restoreOk) {
  let stableOk = true, boundedOk = true;
  for (const t of TABLES) {
    const r = Number(q1(adminUrl, `select count(*) from "${t}"`));
    const lo = before[t], hi = after[t];
    const bounded = BOUNDED.includes(t);
    const ok = bounded ? r >= lo && r <= hi : r === lo && r === hi;
    if (!ok) (bounded ? () => { boundedOk = false; } : () => { stableOk = false; })();
    if (!ok) console.log(`   ${t.padEnd(22)} before=${lo} after=${hi} restored=${r} ${ok ? "" : "OUT OF BOUNDS"}`);
    else console.log(`   ${t.padEnd(22)} before=${lo} after=${hi} restored=${r} ${bounded ? "(bounded: point-in-time dump)" : "(exact)"}`);
  }
  check("stable tables restore exactly", stableOk);
  check("volatile tables (sessions/audit) restore within dump bounds", boundedOk);

  const tbl = Number(q1(adminUrl, "select count(*) from information_schema.tables where table_schema='public' and table_name<>'_prisma_migrations'"));
  check("restored schema has 213 application tables", tbl === 213, String(tbl));
  check("restored tenant FK present", q1(adminUrl, "select count(*) from pg_constraint where conname='content_media_organizationId_fkey'") === "1");
  check("restored tenant data still partitioned", Number(q1(adminUrl, 'select count(distinct "organizationId") from content_media')) === 2);
  check("no orphaned content_media rows after restore", q1(adminUrl, `select count(*) from content_media c left join organizations o on o."id"=c."organizationId" where c."organizationId" is not null and o."id" is null`) === "0");
  check("no NULL-tenant media introduced by restore", q1(adminUrl, 'select count(*) from content_media where "organizationId" is null') === "0");
}

// -------------------------------------------------------------- cleanup
try {
  execFileSync("sudo", ["-u", "postgres", "psql", "-tAc", `DROP DATABASE IF EXISTS ${RESTORE_DB}`], { encoding: "utf8" });
  check("restore database dropped after drill", true);
} catch {
  check("restore database dropped after drill", false);
}

console.log(`\n=== ${pass} passed, ${fail} failed ===`);
console.log(`measured: pg_restore ${restoreMs} ms for a ${data.sizeBytes} byte dump (local loopback, staging only)`);
console.log("No RPO/RTO is claimed from this single local drill.");
process.exit(fail ? 1 : 0);
