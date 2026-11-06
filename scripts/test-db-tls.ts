import assert from "node:assert/strict";
import {
  auditPostgresTls,
  describeTlsProblem,
  isPostgresUrl,
  sameTargetDatabase,
  toLibpqConnectionUrl,
} from "../src/lib/db-tls";
import {
  resolveBackupConnectionUrl,
  resolveRecoveryConnectionUrl,
  sanitizeToolError,
} from "../src/lib/backup/connection";

/**
 * Phase 36 — unit tests for TLS policy, libpq URL translation and backup
 * connection resolution. Pure functions only: no database, no network, no
 * filesystem, no secrets (all values are synthetic).
 */

let pass = 0;
const check = (name: string, fn: () => void) => {
  try {
    fn();
    pass++;
  } catch (e) {
    console.error(`✗ ${name}`);
    console.error(`   ${e instanceof Error ? e.message : String(e)}`);
    process.exitCode = 1;
  }
};

const PW = "synthetic-password";
const STRICT = `postgresql://u:${PW}@db.example.invalid:5432/lms?sslmode=require&sslcert=/etc/lms/ca.pem&sslaccept=strict`;

// --------------------------------------------------------------- auditPostgresTls
check("audit: strict + CA + require is clean", () => {
  assert.deepEqual(auditPostgresTls(STRICT).problems, []);
});

check("audit: verify-full alone is NOT accepted (PG-35-01)", () => {
  const r = auditPostgresTls(`postgresql://u:${PW}@h:5432/lms?sslmode=verify-full&sslrootcert=/ca.pem`);
  assert.ok(r.isPostgres);
  assert.ok(r.problems.includes("strict_mode_required"));
});

check("audit: accept_invalid_certs is rejected", () => {
  const r = auditPostgresTls(`postgresql://u:${PW}@h:5432/lms?sslmode=require&sslcert=/ca.pem&sslaccept=accept_invalid_certs`);
  assert.ok(r.problems.includes("strict_mode_required"));
});

check("audit: missing CA is rejected", () => {
  const r = auditPostgresTls(`postgresql://u:${PW}@h:5432/lms?sslmode=require&sslaccept=strict`);
  assert.ok(r.problems.includes("ca_required"));
});

check("audit: sslmode=disable is rejected even with strict", () => {
  const r = auditPostgresTls(`postgresql://u:${PW}@h:5432/lms?sslmode=disable&sslcert=/ca.pem&sslaccept=strict`);
  assert.ok(r.problems.includes("sslmode_insecure"));
});

check("audit: missing sslmode is rejected (libpq default is prefer)", () => {
  const r = auditPostgresTls(`postgresql://u:${PW}@h:5432/lms?sslcert=/ca.pem&sslaccept=strict`);
  assert.ok(r.problems.includes("sslmode_insecure"));
});

check("audit: SQLite URL is not audited", () => {
  const r = auditPostgresTls("file:./dev.db");
  assert.equal(r.isPostgres, false);
  assert.deepEqual(r.problems, []);
});

check("audit: malformed input is treated as non-postgres, never throws", () => {
  assert.equal(auditPostgresTls("not a url").isPostgres, false);
  assert.equal(auditPostgresTls(undefined).isPostgres, false);
});

check("audit: postgres:// alias is recognised", () => {
  assert.equal(isPostgresUrl("postgres://u:p@h:5432/db"), true);
});

check("audit: every problem has a secret-free explanation", () => {
  for (const p of ["strict_mode_required", "ca_required", "sslmode_insecure", "not_postgresql"] as const) {
    const text = describeTlsProblem(p);
    assert.ok(text.length > 10);
    assert.ok(!text.includes(PW));
  }
});

// ------------------------------------------------------------ toLibpqConnectionUrl
check("libpq: strict is translated to verify-full + sslrootcert", () => {
  const out = new URL(toLibpqConnectionUrl(STRICT));
  assert.equal(out.searchParams.get("sslmode"), "verify-full");
  assert.equal(out.searchParams.get("sslrootcert"), "/etc/lms/ca.pem");
  assert.equal(out.searchParams.has("sslaccept"), false, "sslaccept must be removed for libpq");
  assert.equal(out.searchParams.has("sslcert"), false, "sslcert must not be passed (libpq = client cert)");
});

check("libpq: prisma-only 'schema' parameter is removed", () => {
  const out = new URL(toLibpqConnectionUrl(`${STRICT}&schema=public`));
  assert.equal(out.searchParams.has("schema"), false);
});

check("libpq: host/port/database/password are preserved unchanged", () => {
  const out = new URL(toLibpqConnectionUrl(STRICT));
  assert.equal(out.hostname, "db.example.invalid");
  assert.equal(out.port, "5432");
  assert.equal(out.pathname, "/lms");
  assert.equal(decodeURIComponent(out.password), PW);
});

check("libpq: native verify-full URL passes through", () => {
  const out = new URL(toLibpqConnectionUrl(`postgresql://u:${PW}@h:5432/lms?sslmode=verify-full&sslrootcert=/ca.pem`));
  assert.equal(out.searchParams.get("sslmode"), "verify-full");
  assert.equal(out.searchParams.get("sslrootcert"), "/ca.pem");
});

check("libpq: refuses to build a URL without verified TLS", () => {
  assert.throws(
    () => toLibpqConnectionUrl(`postgresql://u:${PW}@h:5432/lms?sslmode=require`),
    (e: unknown) => e instanceof Error && /verified TLS/.test(e.message) && !e.message.includes(PW),
  );
});

check("libpq: refuses verify-full without sslrootcert", () => {
  assert.throws(() => toLibpqConnectionUrl(`postgresql://u:${PW}@h:5432/lms?sslmode=verify-full`));
});

check("libpq: refuses strict without a CA", () => {
  assert.throws(() => toLibpqConnectionUrl(`postgresql://u:${PW}@h:5432/lms?sslmode=require&sslaccept=strict`));
});

check("libpq: refuses non-PostgreSQL URLs without leaking them", () => {
  assert.throws(
    () => toLibpqConnectionUrl("file:./dev.db"),
    (e: unknown) => e instanceof Error && /not a PostgreSQL URL/.test(e.message),
  );
});

check("libpq: error messages never contain a connection string", () => {
  try {
    toLibpqConnectionUrl(`postgresql://u:${PW}@h:5432/lms?sslmode=require`);
    assert.fail("expected throw");
  } catch (e) {
    const m = e instanceof Error ? e.message : "";
    assert.ok(!m.includes(PW));
    assert.ok(!/postgres(ql)?:\/\//.test(m));
  }
});

// ------------------------------------------------------------ sameTargetDatabase
check("sameTargetDatabase: identical targets match", () => {
  assert.equal(sameTargetDatabase(STRICT, `${STRICT}&schema=public`), true);
});

check("sameTargetDatabase: different databases do not match", () => {
  assert.equal(
    sameTargetDatabase(`postgresql://u:p@h:5432/lms`, `postgresql://u:p@h:5432/lms_restore`),
    false,
  );
});

check("sameTargetDatabase: different hosts do not match", () => {
  assert.equal(sameTargetDatabase(`postgresql://u:p@a:5432/lms`, `postgresql://u:p@b:5432/lms`), false);
});

check("sameTargetDatabase: default port equals explicit 5432", () => {
  assert.equal(sameTargetDatabase(`postgresql://u:p@h/lms`, `postgresql://u:p@h:5432/lms`), true);
});

// ------------------------------------------------------------ backup resolution
const envWith = (over: Record<string, string | undefined>) => ({ ...process.env, ...over }) as NodeJS.ProcessEnv;

check("backup: derived from DATABASE_URL when no tooling URL is set", () => {
  const out = new URL(resolveBackupConnectionUrl(envWith({ DATABASE_URL: STRICT, BACKUP_TOOLING_DATABASE_URL: undefined })));
  assert.equal(out.searchParams.get("sslmode"), "verify-full");
  assert.equal(out.searchParams.has("sslaccept"), false);
});

check("backup: explicit tooling URL is honoured", () => {
  const tooling = `postgresql://u:${PW}@db.example.invalid:5432/lms?sslmode=verify-full&sslrootcert=/etc/lms/ca.pem`;
  const out = new URL(resolveBackupConnectionUrl(envWith({ DATABASE_URL: STRICT, BACKUP_TOOLING_DATABASE_URL: tooling })));
  assert.equal(out.searchParams.get("sslmode"), "verify-full");
});

check("backup: explicit tooling URL pointing elsewhere is refused", () => {
  const tooling = `postgresql://u:${PW}@db.example.invalid:5432/other_db?sslmode=verify-full&sslrootcert=/ca.pem`;
  assert.throws(
    () => resolveBackupConnectionUrl(envWith({ DATABASE_URL: STRICT, BACKUP_TOOLING_DATABASE_URL: tooling })),
    (e: unknown) => e instanceof Error && /same database/.test(e.message) && !e.message.includes(PW),
  );
});

check("backup: unusable TLS configuration fails closed", () => {
  assert.throws(() =>
    resolveBackupConnectionUrl(envWith({ DATABASE_URL: `postgresql://u:${PW}@h:5432/lms?sslmode=require` })),
  );
});

check("recovery: missing recovery URL is BLOCKED with a clear message", () => {
  assert.throws(
    () => resolveRecoveryConnectionUrl(envWith({ DATABASE_URL: STRICT, BACKUP_RECOVERY_DATABASE_URL: undefined })),
    (e: unknown) => e instanceof Error && /BACKUP_RECOVERY_DATABASE_URL/.test(e.message) && /BLOCKED/.test(e.message),
  );
});

check("recovery: target equal to the active database is refused", () => {
  assert.throws(
    () => resolveRecoveryConnectionUrl(envWith({ DATABASE_URL: STRICT, BACKUP_RECOVERY_DATABASE_URL: STRICT })),
    (e: unknown) => e instanceof Error && /must not be the active database/.test(e.message),
  );
});

check("recovery: a separate verified target is accepted", () => {
  const recovery = `postgresql://u:${PW}@db.example.invalid:5432/lms_restore?sslmode=verify-full&sslrootcert=/etc/lms/ca.pem`;
  const out = new URL(resolveRecoveryConnectionUrl(envWith({ DATABASE_URL: STRICT, BACKUP_RECOVERY_DATABASE_URL: recovery })));
  assert.equal(out.pathname, "/lms_restore");
});

// ------------------------------------------------------------ sanitizeToolError
check("sanitize: connection strings are redacted from tool output", () => {
  const msg = `pg_dump: error: could not connect: postgresql://u:${PW}@h:5432/lms failed`;
  const clean = sanitizeToolError(msg);
  assert.ok(!clean.includes(PW), "password must be redacted");
  assert.ok(!/postgres(ql)?:\/\/u:/.test(clean));
  assert.ok(clean.includes("<redacted>"));
});

check("sanitize: output length is bounded", () => {
  assert.ok(sanitizeToolError("x".repeat(1000)).length <= 200);
});

console.log(`\n=== db-tls / backup-connection unit tests: ${pass} passed, ${process.exitCode ? "some" : "0"} failed ===`);
