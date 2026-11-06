#!/usr/bin/env node
/**
 * Phase 35C — TLS / connection-security verification for the APPLICATION client.
 *
 *   PG_APP_DATABASE_URL=... node scripts/db/pg-tls-check.mjs
 *
 * Why this script exists (finding PG-35-01):
 *   Prisma's engine recognises only `disable | prefer | require`. Any other
 *   `sslmode` value — including libpq's `verify-full` — is silently downgraded
 *   to `prefer`, which encrypts the link but does NOT validate the server
 *   certificate or hostname. `sslmode=verify-full&sslrootcert=...` therefore
 *   *looks* correct and *is not*. The only knob that authenticates the server is
 *   `sslaccept=strict` (with `sslcert=<CA path>`).
 *
 *   This script therefore does not merely ask "is the connection encrypted?" —
 *   it proves the certificate is actually checked, by attempting a connection
 *   with a CA that did NOT sign the server certificate and requiring rejection.
 *   If that probe succeeds, the TLS is decorative and the script FAILS.
 *
 * Read-only: only SELECT statements. Never prints the URL, host, user, password.
 *
 * Optional env:
 *   PG_TLS_NEGATIVE_CA=/path/to/unrelated-ca.pem   explicit negative-test CA
 *                                                  (else one is generated with openssl)
 *   PG_TLS_SKIP_NEGATIVE=yes                       skip the rogue-CA probe (reported as NOT RUN)
 */
import { PrismaClient } from "@prisma/client";
import { existsSync, readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { X509Certificate } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Phase 36: check the URL the APPLICATION uses (Prisma flavor). When the app
// and the psql tooling use different TLS parameter names (they must, see
// PG-35-03), PG_APP_DATABASE_URL is authoritative; fall back to the tooling URL.
const base = process.env.PG_APP_DATABASE_URL || process.env.PG_STAGING_DATABASE_URL;
if (!base) {
  console.error("BLOCKED: neither PG_APP_DATABASE_URL nor PG_STAGING_DATABASE_URL is set");
  process.exit(2);
}

let pass = 0, fail = 0, info = 0, notRun = 0;
const check = (name, ok, detail = "") => {
  console.log(`${ok ? "✓" : "✗"} ${name}${detail ? ` — ${detail}` : ""}`);
  ok ? pass++ : fail++;
};
const note = (m) => { console.log(`  · ${m}`); info++; };
const skip = (name, why) => { console.log(`⊘ ${name} — NOT RUN: ${why}`); notRun++; };
const redact = (s) => String(s).replace(/postgres(ql)?:\/\/[^\s"']+/gi, "postgresql://<redacted>");

console.log("=== Phase 35C — TLS authentication check (application client) ===\n");

// ---------------------------------------------------------- URL inspection
const u = new URL(base);
const p = u.searchParams;
const sslmode = p.get("sslmode");
const sslaccept = p.get("sslaccept");
const caPath = p.get("sslcert") || p.get("sslrootcert");

note(`sslmode=${sslmode ?? "(absent)"}  sslaccept=${sslaccept ?? "(absent)"}  sslcert/sslrootcert=${caPath ? "supplied" : "(absent)"}`);

if (!sslaccept) {
  check(
    "server certificate validation is enabled (sslaccept=strict)",
    false,
    "sslmode alone is NOT enforced by Prisma — a rogue CA would be accepted. Set sslaccept=strict"
  );
} else if (sslaccept !== "strict") {
  check("server certificate validation is enabled (sslaccept=strict)", false, `sslaccept=${sslaccept} accepts invalid certificates`);
} else {
  check("server certificate validation is enabled (sslaccept=strict)", true);
  if (!caPath) {
    check("CA certificate supplied", false, "sslcert is empty; a private CA cannot be trusted");
  } else if (!existsSync(caPath)) {
    check("CA certificate supplied", false, "file not found");
  } else {
    try {
      const crt = new X509Certificate(readFileSync(caPath));
      const notAfter = new Date(crt.validTo);
      check("CA certificate parses and is not expired", notAfter > new Date(), `${crt.subject.replace(/\n/g, ", ")} exp ${notAfter.toISOString().slice(0, 10)}`);
    } catch (e) {
      check("CA certificate parses and is not expired", false, String(e.message).slice(0, 80));
    }
  }
}

// -------------------------------------------------------------- connect
const prisma = new PrismaClient({ datasources: { db: { url: base } } });
let connected = false;
try {
  await prisma.$queryRaw`SELECT 1`;
  connected = true;
  check("application client connects with the configured TLS settings", true);
} catch (e) {
  check("application client connects with the configured TLS settings", false, redact(e.message).slice(0, 200));
}

if (connected) {
  try {
    const r = (await prisma.$queryRaw`SELECT ssl, version, cipher, bits FROM pg_stat_ssl WHERE pid = pg_backend_pid()`)[0] ?? {};
    check("connection is TLS-encrypted", r.ssl === true, `ssl=${r.ssl}`);
    check("modern TLS protocol negotiated", /TLSv1\.[23]/.test(String(r.version)), `${r.version} ${r.cipher}/${r.bits}`);

    const srv = (await prisma.$queryRaw`SELECT current_setting('server_version') AS v`)[0];
    note(`server_version=${srv.v}`);

    // ------------------------------------------------ role privileges (35C.8)
    const role = (await prisma.$queryRaw`
      SELECT current_user AS name, rolsuper, rolcreatedb, rolcreaterole, rolreplication, rolbypassrls, rolconnlimit
        FROM pg_roles WHERE rolname = current_user`)[0];
    check("application role is NOT superuser", role.rolsuper === false);
    check("application role CANNOT create databases", role.rolcreatedb === false);
    check("application role CANNOT create roles", role.rolcreatedb === false && role.rolcreaterole === false);
    check("application role has no replication privilege", role.rolreplication === false);
    check("application role does not bypass RLS", role.rolbypassrls === false);
    note(`role_connlimit=${role.rolconnlimit === -1 ? "unlimited" : role.rolconnlimit}`);

    // ------------------------------------------- limits/timeouts (35C.9/10)
    const readSetting = async (n) => { try { return (await prisma.$queryRawUnsafe(`SELECT current_setting('${n}') AS v`))[0].v; } catch { return null; } };
    const c = {
      max_conn: await readSetting("max_connections"),
      stmt: await readSetting("statement_timeout"),
      idle_tx: await readSetting("idle_in_transaction_session_timeout"),
      idle: await readSetting("idle_session_timeout"),
    };
    note(`max_connections=${c.max_conn} statement_timeout=${c.stmt} idle_in_tx_timeout=${c.idle_tx} idle_session_timeout=${c.idle}`);
    if (c.stmt === "0") note("WARNING: statement_timeout=0 — no server-side runaway-query limit");
    if (c.idle_tx === "0") note("WARNING: idle_in_transaction_session_timeout=0 — a stuck transaction can hold locks indefinitely");
  } catch (e) {
    check("TLS introspection queries", false, redact(e.message).slice(0, 160));
  }
}

// ------------------------------------------- negative probe: is CA checked?
// This is the check that distinguishes "encrypted" from "authenticated".
async function negativeProbe() {
  if (process.env.PG_TLS_SKIP_NEGATIVE === "yes") {
    skip("rogue-CA rejection probe", "PG_TLS_SKIP_NEGATIVE=yes");
    return;
  }
  let rogueCa = process.env.PG_TLS_NEGATIVE_CA;
  if (!rogueCa) {
    try {
      const dir = mkdtempSync(join(tmpdir(), "pg35-neg-"));
      rogueCa = join(dir, "unrelated-ca.pem");
      execFileSync("openssl", ["req", "-x509", "-newkey", "rsa:2048", "-nodes", "-days", "1",
        "-subj", "/CN=Phase35 Unrelated CA", "-keyout", join(dir, "k.pem"), "-out", rogueCa], { stdio: "ignore" });
    } catch {
      skip("rogue-CA rejection probe", "could not generate a throwaway CA (openssl unavailable) and PG_TLS_NEGATIVE_CA not set");
      return;
    }
  }
  if (!existsSync(rogueCa)) { skip("rogue-CA rejection probe", "negative CA file not found"); return; }

  // Test the URL EXACTLY as configured — only the CA is swapped for one that did
  // not sign the server certificate. Do not "help" by adding sslaccept=strict:
  // the point of the probe is to reveal whether the configured URL verifies.
  const n = new URL(base);
  if (n.searchParams.has("sslcert")) n.searchParams.set("sslcert", rogueCa);
  else if (n.searchParams.has("sslrootcert")) n.searchParams.set("sslrootcert", rogueCa);
  else n.searchParams.set("sslcert", rogueCa);

  const probe = new PrismaClient({ datasources: { db: { url: n.toString() } } });
  try {
    await probe.$queryRaw`SELECT 1`;
    check(
      "server certificate is actually verified (rogue CA rejected)",
      false,
      "CONNECTED with a CA that did not sign the server certificate — TLS is encrypted but UNAUTHENTICATED"
    );
  } catch {
    check("server certificate is actually verified (rogue CA rejected)", true, "connection refused as required");
  } finally {
    await probe.$disconnect().catch(() => {});
  }
}

if (connected) await negativeProbe();

await prisma.$disconnect().catch(() => {});
console.log(`\n=== ${pass} passed, ${fail} failed, ${notRun} not run, ${info} informational ===`);
process.exit(fail === 0 && notRun === 0 ? 0 : 1);
