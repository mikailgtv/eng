#!/usr/bin/env node
/**
 * Phase 37 — Organizational Staging Readiness Gate.
 *
 * Answers ONE question before anyone attempts Phase 37 again:
 *   "are the required organizational staging inputs actually present and structurally usable?"
 *
 * It performs NO network I/O, NO database connection, and NO storage write. It only
 * inspects configuration shape and local file readability, so it is safe to run anywhere,
 * any number of times, including in CI.
 *
 * It NEVER prints a connection string, host name, password, token, or certificate content.
 * Values are reported as "provided" / "absent" only.
 *
 * Usage:
 *   node scripts/db/staging-readiness.mjs
 *   node scripts/db/staging-readiness.mjs --json
 *
 * Exit codes:
 *   0  every required input is present and structurally usable -> Phase 37 may proceed
 *   2  one or more inputs are missing/invalid          -> Phase 37 stays BLOCKED
 *   3  a production-like configuration was detected    -> refuse to continue
 *
 * This gate is a necessary condition, not a sufficient one. Passing it does not mean staging
 * is accepted; it means the Phase 37 stages may be attempted.
 */

import { createHash } from "node:crypto";
import fs from "node:fs";
import process from "node:process";

const results = [];
const record = (id, status, detail, owner, action) => {
  results.push({ id, status, detail, owner, action });
};

const env = process.env;
const has = (k) => typeof env[k] === "string" && env[k].trim().length > 0;

/** Parse without ever echoing the raw value. */
function safeParseUrl(value) {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

/**
 * Database identity = host + port + database name. Used for BOTH the application/tooling
 * comparison and the restore-target comparison so the two agree on what "same database" means.
 */
function sameDatabase(a, b) {
  if (!a || !b) return false;
  return a.hostname === b.hostname && (a.port || "5432") === (b.port || "5432") && a.pathname === b.pathname;
}

/** Content fingerprint of a trust anchor. Never printed — compared only. */
function anchorFingerprint(p) {
  try {
    return createHash("sha256").update(fs.readFileSync(p)).digest("hex");
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------- production guard
const PROD_HINTS = /(^|[.\-_/])(prod|production|prd|live)([.\-_/]|$)/i;
const productionRisks = [];
for (const key of ["DATABASE_URL", "BACKUP_TOOLING_DATABASE_URL", "BACKUP_RECOVERY_DATABASE_URL", "STAGING_APP_BASE"]) {
  if (!has(key)) continue;
  const u = safeParseUrl(env[key]);
  const haystack = u ? `${u.hostname}${u.pathname}` : env[key];
  if (PROD_HINTS.test(haystack)) productionRisks.push(key);
}
if (has("STAGING_ENV_CLASS") && /^production$/i.test(env.STAGING_ENV_CLASS.trim())) productionRisks.push("STAGING_ENV_CLASS");

if (productionRisks.length > 0) {
  // Deliberately abort before any other check: this gate must not help anyone point at production.
  process.stderr.write(
    `REFUSED: configuration looks production-like (${productionRisks.join(", ")}).\n` +
      `Phase 37 is staging-only. No value is printed. Correct the configuration and re-run.\n`,
  );
  process.exit(3);
}

// ---------------------------------------------------------------- 1. database URL
const dbUrl = has("DATABASE_URL") ? safeParseUrl(env.DATABASE_URL) : null;
if (!dbUrl) {
  record("DB-1", "BLOCKED", "DATABASE_URL is absent or not a URI", "Organization / platform", "Supply the staging PostgreSQL connection string via the approved secure mechanism.");
} else if (!["postgres:", "postgresql:"].includes(dbUrl.protocol)) {
  record("DB-1", "BLOCKED", `DATABASE_URL is not a PostgreSQL URL (scheme: ${dbUrl.protocol.replace(":", "")})`, "Organization / platform", "Provide the PostgreSQL staging URL, not SQLite.");
} else {
  const sp = dbUrl.searchParams;
  const loopback = ["localhost", "127.0.0.1", "::1"].includes(dbUrl.hostname);
  const strict = sp.get("sslaccept") === "strict";
  const caPath = sp.get("sslcert");
  const sslmode = sp.get("sslmode");

  record("DB-1", "PASS", `PostgreSQL URL provided (host ${loopback ? "is loopback — NOT organizational staging" : "is non-loopback"})`, "—", "—");

  record(
    "DB-2",
    loopback ? "BLOCKED" : "PASS",
    loopback ? "endpoint is loopback; a local disposable cluster is not organizational staging" : "endpoint is non-loopback",
    "Organization / platform",
    loopback ? "Provide the real staging endpoint. Do not substitute a local cluster." : "—",
  );

  record(
    "DB-3",
    strict ? "PASS" : "BLOCKED",
    strict ? "sslaccept=strict present" : "sslaccept=strict is NOT set — the connection would be encrypted but unauthenticated",
    "Organization / platform",
    strict ? "—" : "Append sslaccept=strict to the Prisma URL (Prisma ignores sslmode for verification).",
  );

  let caUsable = false;
  if (!caPath) {
    record("DB-4", "BLOCKED", "no CA path in the URL (sslcert)", "Organization / platform", "Supply the trusted CA path for this endpoint.");
  } else {
    try {
      const st = fs.statSync(caPath);
      const fd = fs.openSync(caPath, "r");
      fs.closeSync(fd);
      caUsable = st.isFile() && st.size > 0;
      record("DB-4", caUsable ? "PASS" : "BLOCKED", caUsable ? "CA file exists, is a regular file, and is readable" : "CA path exists but is empty or not a regular file", "Organization / platform", caUsable ? "—" : "Supply the real CA certificate file.");
    } catch (e) {
      record("DB-4", "BLOCKED", `CA file is not readable (${e.code || "error"})`, "Organization / platform", "Make the approved CA file readable by the application process.");
    }
  }

  const safeModes = ["require", "verify-ca", "verify-full"];
  record(
    "DB-5",
    sslmode && safeModes.includes(sslmode) ? "PASS" : "BLOCKED",
    sslmode ? `sslmode=${sslmode}` : "sslmode absent (defaults to prefer — rejected by policy)",
    "Organization / platform",
    sslmode && safeModes.includes(sslmode) ? "—" : "Set sslmode to require, verify-ca, or verify-full.",
  );

  // ------------------------------------------------------------ 2. tooling URL
  const toolUrl = has("BACKUP_TOOLING_DATABASE_URL") ? safeParseUrl(env.BACKUP_TOOLING_DATABASE_URL) : null;
  if (!toolUrl) {
    record("TOOL-1", "BLOCKED", "BACKUP_TOOLING_DATABASE_URL absent — backups over strict TLS need a libpq-parseable URL", "Organization / platform", "Supply a tooling URL with sslmode=verify-full and sslrootcert=<CA> for the SAME database.");
  } else {
    const sp = toolUrl.searchParams;
    const sameHost = sameDatabase(toolUrl, dbUrl);
    const sameDb = sameHost;
    const rootcert = sp.get("sslrootcert");
    let rootOk = false;
    try {
      rootOk = Boolean(rootcert) && fs.statSync(rootcert).isFile();
    } catch {
      rootOk = false;
    }
    record("TOOL-1", rootOk ? "PASS" : "BLOCKED", rootOk ? "tooling URL supplies a readable sslrootcert" : "tooling URL lacks a readable sslrootcert (libpq's sslcert means a CLIENT cert, not the CA)", "Organization / platform", rootOk ? "—" : "Set sslrootcert=<CA path> on the tooling URL.");
    record("TOOL-2", sameHost && sameDb ? "PASS" : "BLOCKED", sameHost && sameDb ? "tooling URL targets the same database as DATABASE_URL" : "tooling URL does not target the same database as DATABASE_URL", "Organization / platform", sameHost && sameDb ? "—" : "Point the tooling URL at the same host/port/database; a backup must never dump a different database.");
    record("TOOL-3", sp.get("sslaccept") ? "BLOCKED" : "PASS", sp.get("sslaccept") ? "tooling URL contains Prisma-only sslaccept — pg_dump will reject it" : "no Prisma-only parameters on the tooling URL", "Organization / platform", sp.get("sslaccept") ? "Remove sslaccept from the tooling URL." : "—");
    if (!caUsable || !rootOk) {
      record("TOOL-4", "BLOCKED", "cannot cross-check the tooling trust anchor: the app CA or the tooling root CA is not readable", "Organization / platform", "Fix DB-4 and TOOL-1 first.");
    } else {
      // Compare CONTENT, not path strings: the same CA may legitimately live at two paths.
      // NOTE: `sp` is rebound to the TOOLING searchParams later in this block; the app CA path
      // must come from `caPath`, captured while parsing DATABASE_URL.
      const appAnchor = anchorFingerprint(caPath);
      const toolAnchor = anchorFingerprint(rootcert);
      const consistent = Boolean(appAnchor) && appAnchor === toolAnchor;
      record("TOOL-4", consistent ? "PASS" : "BLOCKED",
        consistent
          ? "app and tooling reference the same trust anchor (content match)"
          : "app and tooling reference DIFFERENT trust anchors — backups would trust a CA that did not sign the staging server certificate",
        "Organization / platform",
        consistent ? "—" : "Point the tooling sslrootcert at the same CA certificate the app trusts.");
    }
  }

  // ------------------------------------------------------------ 3. recovery target
  const recUrl = has("BACKUP_RECOVERY_DATABASE_URL") ? safeParseUrl(env.BACKUP_RECOVERY_DATABASE_URL) : null;
  if (!recUrl) {
    record("REC-1", "BLOCKED", "BACKUP_RECOVERY_DATABASE_URL absent — the restore drill needs a separate disposable target", "Organization / platform", "Supply a separate, disposable restore database; it must NOT be the staging database.");
  } else {
    const same = sameDatabase(recUrl, dbUrl);
    record("REC-1", same ? "BLOCKED" : "PASS", same ? "recovery target is the SAME database as DATABASE_URL" : "recovery target is a distinct database", "Organization / platform", same ? "The restore target must differ from the source." : "—");
  }
}

// ---------------------------------------------------------------- 4. authorization
const AUTHORIZED = has("STAGING_AUTHORIZED") && /^yes$/i.test(env.STAGING_AUTHORIZED.trim());
record("AUTH-1", AUTHORIZED ? "PASS" : "BLOCKED", AUTHORIZED ? "use of this staging database is attested as authorized" : "no explicit authorization to use the target for Phase 37", "Organization (owner of the staging database)", "Set STAGING_AUTHORIZED=yes once a named owner has authorized this phase against this specific database, and record the reference in STAGING_AUTHORIZATION_REF.");
record("AUTH-2", has("STAGING_AUTHORIZATION_REF") ? "PASS" : "BLOCKED", has("STAGING_AUTHORIZATION_REF") ? "authorization reference recorded (ticket/owner ref)" : "no authorization reference", "Organization", "Set STAGING_AUTHORIZATION_REF to the ticket or approval reference (not a secret).");
record("AUTH-3", has("STAGING_OWNER") ? "PASS" : "BLOCKED", has("STAGING_OWNER") ? "named owner recorded" : "no named owner of the staging environment", "Organization", "Set STAGING_OWNER to the team or person accountable for this environment.");

// ---------------------------------------------------------------- 5. environment class
const cls = (env.STAGING_ENV_CLASS || "").trim().toLowerCase();
const classOk = ["organizational-staging", "disposable-staging"].includes(cls);
record("ENV-1", classOk ? "PASS" : "BLOCKED", classOk ? `environment class declared: ${cls}` : "STAGING_ENV_CLASS must be organizational-staging or disposable-staging", "Organization", "Declare the environment class explicitly; nothing is inferred from the host name.");

// ---------------------------------------------------------------- 6. storage
const provider = (env.STORAGE_PROVIDER || "").trim().toLowerCase();
if (provider === "s3") {
  record("STO-1", "BLOCKED", "STORAGE_PROVIDER=s3 — the adapter is unimplemented and refused at startup (Phase 36 / PG-35-02)", "Organization (decision) + engineering", "Decide Option A (persistent local volume) or authorize a full S3 adapter implementation. Do not bypass startup validation.");
} else if (provider !== "local") {
  record("STO-1", "BLOCKED", provider ? `STORAGE_PROVIDER=${provider} is not a supported staging choice` : "STORAGE_PROVIDER not set", "Organization / platform", "Set STORAGE_PROVIDER=local with a verified durable volume.");
} else {
  record("STO-1", "PASS", "storage provider: local", "—", "—");
  const root = env.STORAGE_LOCAL_ROOT;
  let writable = false;
  if (!root) {
    record("STO-2", "BLOCKED", "STORAGE_LOCAL_ROOT not set", "Organization / platform", "Set STORAGE_LOCAL_ROOT to the staging volume mount point.");
  } else {
    try {
      const st = fs.statSync(root);
      fs.accessSync(root, fs.constants.W_OK);
      writable = st.isDirectory();
      record("STO-2", writable ? "PASS" : "BLOCKED", writable ? "storage root exists and is writable" : "storage root is not a directory", "Organization / platform", writable ? "—" : "Provide a directory path for the volume mount.");
    } catch (e) {
      record("STO-2", "BLOCKED", `storage root is missing or not writable (${e.code || "error"})`, "Organization / platform", "Mount the persistent volume at STORAGE_LOCAL_ROOT and grant the app write access.");
    }
  }
  // Durability cannot be proven from inside the process; require an operator attestation instead of guessing.
  const dur = has("STORAGE_DURABILITY_ATTESTED") && /^yes$/i.test(env.STORAGE_DURABILITY_ATTESTED.trim());
  record("STO-3", dur ? "ATTESTED" : "BLOCKED", dur ? "operator attests the root is a persistent volume that survives restart and redeploy" : "durability of the storage root is unattested (a successful write does not prove durability)", "Organization / ops", "Confirm the mount is a persistent volume with a documented snapshot schedule, then set STORAGE_DURABILITY_ATTESTED=yes.");
}

// ---------------------------------------------------------------- 7. app / deployment target
const base = has("STAGING_APP_BASE") ? safeParseUrl(env.STAGING_APP_BASE) : null;
if (!base) {
  record("APP-1", "BLOCKED", "STAGING_APP_BASE absent — no approved deployment target", "Organization / ops", "Supply the staging application base URL, or an approved way to run the app against the staging database.");
} else if (base.protocol !== "https:") {
  record("APP-1", "BLOCKED", "STAGING_APP_BASE is not https", "Organization / ops", "Staging acceptance requires HTTPS; supply the https base URL.");
} else if (["localhost", "127.0.0.1", "::1"].includes(base.hostname)) {
  record("APP-1", "BLOCKED", "STAGING_APP_BASE is loopback — that is a local run, not a deployed staging target", "Organization / ops", "Supply the deployed staging URL.");
} else {
  record("APP-1", "PASS", "deployment target supplied (https, non-loopback)", "—", "—");
}

// ---------------------------------------------------------------- completeness: no silent omissions
// Dependent checks that never ran are reported as SKIPPED with the reason, so a reader can
// never mistake an unevaluated check for a satisfied one.
const EXPECTED = ["DB-1","DB-2","DB-3","DB-4","DB-5","TOOL-1","TOOL-2","TOOL-3","TOOL-4","REC-1","AUTH-1","AUTH-2","AUTH-3","ENV-1","STO-1","STO-2","STO-3","APP-1"];
const skipReason = (id) => {
  if (id.startsWith("DB-") || id === "REC-1") return "prerequisite not met: DATABASE_URL is absent or not a PostgreSQL URL";
  if (id.startsWith("TOOL-")) return has("BACKUP_TOOLING_DATABASE_URL") ? "prerequisite not met: no usable DATABASE_URL to compare against" : "prerequisite not met: BACKUP_TOOLING_DATABASE_URL is absent";
  if (id === "STO-2" || id === "STO-3") return "prerequisite not met: STORAGE_PROVIDER is not local";
  return "prerequisite not met";
};
for (const id of EXPECTED) {
  if (!results.some((r) => r.id === id)) {
    results.push({ id, status: "SKIPPED", detail: skipReason(id), owner: "—", action: "—" });
  }
}
results.sort((a, b) => EXPECTED.indexOf(a.id) - EXPECTED.indexOf(b.id));

// ---------------------------------------------------------------- report
const blocked = results.filter((r) => r.status === "BLOCKED");
const json = process.argv.includes("--json");

if (json) {
  // detail strings are already value-free
  const skipped = results.filter((r) => r.status === "SKIPPED");
  process.stdout.write(JSON.stringify({ ready: results.length - blocked.length - skipped.length, blocked: blocked.length, skipped: skipped.length, total: results.length, results }, null, 2) + "\n");
} else {
  const pad = (s, n) => (s.length >= n ? s : s + " ".repeat(n - s.length));
  process.stdout.write("\nPhase 37 — organizational staging readiness gate\n");
  process.stdout.write("(no network I/O, no database connection, no storage write, no secret values printed)\n\n");
  for (const r of results) {
    process.stdout.write(`  ${pad(r.id, 7)} ${pad(r.status, 8)} ${r.detail}\n`);
    if (r.status === "BLOCKED") process.stdout.write(`  ${" ".repeat(7)} -> owner: ${r.owner}\n  ${" ".repeat(7)} -> action: ${r.action}\n`);
  }
  const skippedCount = results.filter((r) => r.status === "SKIPPED").length;
  const readyCount = results.length - blocked.length - skippedCount;
  process.stdout.write(`\n=== ${results.length} checks: ${readyCount} ready / ${blocked.length} blocked / ${skippedCount} skipped ===\n`);
  if (blocked.length === 0) {
    process.stdout.write("READY: all required inputs are present and structurally usable.\n");
    process.stdout.write("This does not mean staging is accepted — it means Phase 37 stages B-F may be attempted.\n");
  } else {
    process.stdout.write("BLOCKED: Phase 37 cannot proceed. This is a configuration finding, not a product defect.\n");
  }
}

process.exit(blocked.length === 0 ? 0 : 2);
