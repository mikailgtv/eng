#!/usr/bin/env node
/**
 * Regression coverage for `scripts/db/staging-readiness.mjs` (the Phase 37 readiness gate).
 *
 * Every fixture here is SYNTHETIC: placeholder hosts under .invalid, synthetic passwords,
 * self-generated dummy CA files. No real credential is used, and no network, database, or
 * storage operation is performed — the gate under test does none of those by design, and
 * this harness only spawns that process.
 *
 * The harness asserts the gate's *contract*, not its implementation details:
 *   - exit code semantics (0 ready / 2 blocked / 3 production refusal)
 *   - dependent checks are reported SKIPPED, never silently omitted or silently passed
 *   - no secret, connection string, host name, or certificate content reaches stdout/stderr
 *   - loopback, production-like, mismatched-trust-anchor and self-restore configurations are refused
 */
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";

const GATE = path.join(process.cwd(), "scripts/db/staging-readiness.mjs");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "gate-test-"));
const vol = path.join(tmp, "vol");
fs.mkdirSync(vol, { recursive: true });

const CA_A = path.join(tmp, "ca-a.pem");
const CA_A_COPY = path.join(tmp, "ca-a-copy.pem");
const CA_B = path.join(tmp, "ca-b.pem");
const CA_EMPTY = path.join(tmp, "ca-empty.pem");
const CA_DIR = path.join(tmp, "ca-dir");

const pem = (marker) => `-----BEGIN CERTIFICATE-----\nSYNTHETIC-${marker}-NOT-A-REAL-CERT\n-----END CERTIFICATE-----\n`;
fs.writeFileSync(CA_A, pem("CA-A"));
fs.writeFileSync(CA_A_COPY, pem("CA-A")); // identical content, different path
fs.writeFileSync(CA_B, pem("CA-B"));
fs.writeFileSync(CA_EMPTY, "");
fs.mkdirSync(CA_DIR);

const PW = "SYNTHETIC-PASSWORD-SENTINEL";
const HOST = "db.staging.example.invalid";

const db = (q) => `postgresql://gate:${PW}@${HOST}:5432/lms_stage?${q}`;
const tooling = (q) => `postgresql://gate:${PW}@${HOST}:5432/lms_stage?${q}`;
const recovery = (port, name) => `postgresql://gate:${PW}@${HOST}:${port}/${name}?sslmode=verify-full&sslrootcert=${CA_A}`;

const BASE = {
  PATH: process.env.PATH ?? "",
  STAGING_AUTHORIZED: "yes",
  STAGING_AUTHORIZATION_REF: "SYNTH-TICKET-0001",
  STAGING_OWNER: "synthetic-owner",
  STAGING_ENV_CLASS: "organizational-staging",
  STORAGE_PROVIDER: "local",
  STORAGE_LOCAL_ROOT: vol,
  STORAGE_DURABILITY_ATTESTED: "yes",
  STAGING_APP_BASE: "https://lms.staging.example.invalid",
  DATABASE_URL: db(`sslmode=require&sslcert=${CA_A}&sslaccept=strict`),
  BACKUP_TOOLING_DATABASE_URL: tooling(`sslmode=verify-full&sslrootcert=${CA_A}`),
  BACKUP_RECOVERY_DATABASE_URL: recovery(5432, "lms_restore"),
};

/** Run the gate with a controlled environment. `unset` removes keys; `set` overrides them. */
function run({ set = {}, unset = [], cwd } = {}) {
  const env = { ...BASE, ...set };
  for (const k of unset) delete env[k];
  const r = spawnSync(process.execPath, [GATE, "--json"], { env, cwd: cwd ?? process.cwd(), encoding: "utf8" });
  let json = null;
  try {
    json = JSON.parse(r.stdout);
  } catch {
    json = null;
  }
  return { code: r.status, stdout: r.stdout, stderr: r.stderr, json };
}

const byId = (res, id) => res.json?.results?.find((x) => x.id === id) ?? null;
const status = (res, id) => byId(res, id)?.status ?? "<absent>";

let passed = 0;
const failures = [];
function check(name, fn) {
  try {
    const detail = fn();
    passed++;
    console.log(`  ✓ ${name}`);
    if (detail) console.log(`      ${detail}`);
  } catch (e) {
    failures.push({ name, error: e.message });
    console.log(`  ✗ ${name}`);
    console.log(`      ${e.message}`);
  }
}
const eq = (actual, expected, what) => {
  if (actual !== expected) throw new Error(`${what}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
};

console.log("\n=== staging readiness gate — contract tests (synthetic fixtures only) ===\n");

// ---------------------------------------------------------------- exit codes & completeness
check("empty environment → exit 2, nothing ready", () => {
  const r = run({ unset: Object.keys(BASE).filter((k) => k !== "PATH") });
  eq(r.code, 2, "exit code");
  if (!r.json) throw new Error("gate did not emit parseable JSON");
  eq(r.json.results.filter((x) => x.status === "PASS" || x.status === "ATTESTED").length, 0, "passing checks");
  return `${r.json.results.length} records, all blocked or skipped`;
});

check("complete synthetic configuration → exit 0, nothing blocked", () => {
  const r = run();
  eq(r.code, 0, "exit code");
  eq(r.json.blocked, 0, "blocked count");
  return `${r.json.results.length} records, 0 blocked`;
});

check("production-like host → exit 3 and refusal, no values printed", () => {
  const r = run({ set: { DATABASE_URL: `postgresql://gate:${PW}@db.production.example.invalid:5432/lms?sslmode=require&sslcert=${CA_A}&sslaccept=strict` } });
  eq(r.code, 3, "exit code");
  if (!/REFUSED/.test(r.stderr)) throw new Error("no refusal message on stderr");
  if (r.stdout.includes(PW) || r.stderr.includes("db.production.example.invalid")) throw new Error("refusal leaked configuration");
  return "refused before evaluating any other check";
});

// ---------------------------------------------------------------- dependent checks: never silent
check("dependent checks are reported SKIPPED when their prerequisite is absent", () => {
  const r = run({ unset: ["DATABASE_URL"] });
  const statuses = r.json.results.map((x) => `${x.id}:${x.status}`);
  for (const id of ["DB-2", "DB-3", "DB-4", "DB-5", "TOOL-1", "REC-1"]) {
    if (!statuses.includes(`${id}:SKIPPED`)) throw new Error(`${id} was silently omitted rather than reported SKIPPED (got: ${statuses.join(", ")})`);
  }
  return "DB-2..DB-5, TOOL-*, REC-1 all explicitly SKIPPED";
});

check("no check is silently passed when a prerequisite fails", () => {
  // Database URL present but insecure: identity is still knowable, so distinctness may be
  // evaluated — but nothing that depends on a usable CA may pass.
  const r = run({ set: { DATABASE_URL: db("sslmode=require") } });
  eq(r.code, 2, "exit code");
  if (status(r, "TOOL-4") === "PASS") throw new Error("TOOL-4 passed although the app CA is unusable");
  if (status(r, "DB-3") === "PASS") throw new Error("DB-3 passed without sslaccept=strict");
  if (status(r, "DB-4") === "PASS") throw new Error("DB-4 passed without a CA");

  // Unparseable URL: identity is unknowable, so dependents must skip rather than guess.
  const bad = run({ set: { DATABASE_URL: "not-a-uri" } });
  eq(bad.code, 2, "exit code (unparseable)");
  eq(status(bad, "REC-1"), "SKIPPED", "REC-1 with unparseable URL");
  eq(status(bad, "TOOL-4"), "SKIPPED", "TOOL-4 with unparseable URL");
  return "blocked/skipped appropriately in both shapes";
});

// ---------------------------------------------------------------- database URL checks
check("loopback endpoint is rejected as organizational staging", () => {
  const r = run({ set: { DATABASE_URL: db(`sslmode=require&sslcert=${CA_A}&sslaccept=strict`).replace(HOST, "localhost") } });
  eq(r.code, 2, "exit code");
  eq(status(r, "DB-2"), "BLOCKED", "DB-2");
  return "a local cluster cannot satisfy the staging gate";
});

check("missing sslaccept=strict is rejected", () => {
  const r = run({ set: { DATABASE_URL: db(`sslmode=verify-full&sslcert=${CA_A}`) } });
  eq(status(r, "DB-3"), "BLOCKED", "DB-3");
});

check("CA that is not a readable regular file is rejected (absent / empty / directory)", () => {
  for (const ca of [path.join(tmp, "nope.pem"), CA_EMPTY, CA_DIR]) {
    const r = run({ set: { DATABASE_URL: db(`sslmode=require&sslcert=${ca}&sslaccept=strict`) } });
    eq(status(r, "DB-4"), "BLOCKED", `DB-4 for ${path.basename(ca)}`);
  }
  return "absent, empty, and directory cases all BLOCKED";
});

check("unsafe sslmode (disable / prefer / invalid) is rejected", () => {
  for (const mode of ["disable", "prefer", "bogus"]) {
    const r = run({ set: { DATABASE_URL: db(`sslmode=${mode}&sslcert=${CA_A}&sslaccept=strict`) } });
    eq(status(r, "DB-5"), "BLOCKED", `DB-5 for sslmode=${mode}`);
  }
  return "disable, prefer, bogus all BLOCKED";
});

// ---------------------------------------------------------------- tooling URL checks
check("tooling URL missing → TOOL-1 BLOCKED", () => {
  const r = run({ unset: ["BACKUP_TOOLING_DATABASE_URL"] });
  eq(status(r, "TOOL-1"), "BLOCKED", "TOOL-1");
});

check("tooling URL pointing at a different database → TOOL-2 BLOCKED", () => {
  const r = run({ set: { BACKUP_TOOLING_DATABASE_URL: tooling(`sslmode=verify-full&sslrootcert=${CA_A}`).replace("/lms_stage", "/lms_other") } });
  eq(status(r, "TOOL-2"), "BLOCKED", "TOOL-2");
});

check("tooling URL on a different port is treated as a different database", () => {
  const r = run({ set: { BACKUP_TOOLING_DATABASE_URL: tooling(`sslmode=verify-full&sslrootcert=${CA_A}`).replace(":5432/", ":5433/") } });
  eq(status(r, "TOOL-2"), "BLOCKED", "TOOL-2");
});

check("Prisma-only sslaccept on the tooling URL → TOOL-3 BLOCKED", () => {
  const r = run({ set: { BACKUP_TOOLING_DATABASE_URL: tooling(`sslmode=verify-full&sslrootcert=${CA_A}&sslaccept=strict`) } });
  eq(status(r, "TOOL-3"), "BLOCKED", "TOOL-3");
});

check("app and tooling referencing DIFFERENT trust anchors → TOOL-4 BLOCKED", () => {
  const r = run({ set: { BACKUP_TOOLING_DATABASE_URL: tooling(`sslmode=verify-full&sslrootcert=${CA_B}`) } });
  eq(status(r, "TOOL-4"), "BLOCKED", "TOOL-4");
  return "a mismatch must not be reported as a consistent trust anchor";
});

check("same trust anchor reached via a different path → TOOL-4 PASS", () => {
  const r = run({ set: { BACKUP_TOOLING_DATABASE_URL: tooling(`sslmode=verify-full&sslrootcert=${CA_A_COPY}`) } });
  eq(status(r, "TOOL-4"), "PASS", "TOOL-4");
  return "compared by content, not by path string";
});

// ---------------------------------------------------------------- recovery target
check("restore target equal to the active database → REC-1 BLOCKED", () => {
  const r = run({ set: { BACKUP_RECOVERY_DATABASE_URL: recovery(5432, "lms_stage") } });
  eq(status(r, "REC-1"), "BLOCKED", "REC-1");
});

check("restore target on another port is a distinct database → REC-1 PASS", () => {
  const r = run({ set: { BACKUP_RECOVERY_DATABASE_URL: recovery(5433, "lms_stage") } });
  eq(status(r, "REC-1"), "PASS", "REC-1");
  return "port participates in identity, consistent with TOOL-2";
});

check("restore target missing → REC-1 BLOCKED", () => {
  const r = run({ unset: ["BACKUP_RECOVERY_DATABASE_URL"] });
  eq(status(r, "REC-1"), "BLOCKED", "REC-1");
});

// ---------------------------------------------------------------- authorization & class
check("authorization, reference and owner are all required", () => {
  eq(status(run({ unset: ["STAGING_AUTHORIZED"] }), "AUTH-1"), "BLOCKED", "AUTH-1");
  eq(status(run({ set: { STAGING_AUTHORIZED: "no" } }), "AUTH-1"), "BLOCKED", "AUTH-1 (no)");
  eq(status(run({ unset: ["STAGING_AUTHORIZATION_REF"] }), "AUTH-2"), "BLOCKED", "AUTH-2");
  eq(status(run({ unset: ["STAGING_OWNER"] }), "AUTH-3"), "BLOCKED", "AUTH-3");
  return "4 sub-cases";
});

check("environment class must be declared; production is refused", () => {
  eq(status(run({ unset: ["STAGING_ENV_CLASS"] }), "ENV-1"), "BLOCKED", "ENV-1 absent");
  const prod = run({ set: { STAGING_ENV_CLASS: "production" } });
  eq(prod.code, 3, "exit code for production class");
});

// ---------------------------------------------------------------- storage
check("s3 remains rejected while the adapter is unimplemented", () => {
  const r = run({ set: { STORAGE_PROVIDER: "s3" } });
  eq(status(r, "STO-1"), "BLOCKED", "STO-1");
  if (!/unimplemented/i.test(byId(r, "STO-1").detail)) throw new Error("STO-1 does not explain that the adapter is unimplemented");
});

check("local storage without a real root is rejected", () => {
  eq(status(run({ unset: ["STORAGE_LOCAL_ROOT"] }), "STO-2"), "BLOCKED", "STO-2 absent");
  eq(status(run({ set: { STORAGE_LOCAL_ROOT: path.join(tmp, "no-such-dir") } }), "STO-2"), "BLOCKED", "STO-2 missing dir");
});

check("durability is never inferred from writability — attestation required", () => {
  const r = run({ unset: ["STORAGE_DURABILITY_ATTESTED"] });
  eq(status(r, "STO-2"), "PASS", "STO-2 (root is writable)");
  eq(status(r, "STO-3"), "BLOCKED", "STO-3 (no attestation)");
  eq(r.code, 2, "exit code");
  return "writable root alone does not unblock the gate";
});

// ---------------------------------------------------------------- application target
check("missing / non-https / loopback application target stays blocked", () => {
  eq(status(run({ unset: ["STAGING_APP_BASE"] }), "APP-1"), "BLOCKED", "APP-1 absent");
  eq(status(run({ set: { STAGING_APP_BASE: "http://lms.staging.example.invalid" } }), "APP-1"), "BLOCKED", "APP-1 http");
  eq(status(run({ set: { STAGING_APP_BASE: "https://localhost:3000" } }), "APP-1"), "BLOCKED", "APP-1 loopback");
  return "3 sub-cases";
});

// ---------------------------------------------------------------- secrecy & purity
check("no secret, host name, or certificate content appears in any output", () => {
  for (const args of [{}, { unset: Object.keys(BASE).filter((k) => k !== "PATH") }]) {
    const r = run(args);
    const all = r.stdout + r.stderr;
    for (const forbidden of [PW, HOST, "SYNTHETIC-CA-A", "SYNTHETIC-CA-B", "postgresql://"]) {
      if (all.includes(forbidden)) throw new Error(`output leaked ${JSON.stringify(forbidden)}`);
    }
  }
  return "checked 2 runs × 5 sentinels";
});

check("the gate performs no network, database, or write I/O (static surface)", () => {
  const src = fs.readFileSync(GATE, "utf8");
  const forbidden = [/\bfetch\s*\(/, /node:net/, /node:http/, /node:dns/, /node:child_process/, /new PrismaClient/, /prisma\./, /writeFileSync/, /appendFileSync/, /createWriteStream/, /mkdirSync/, /unlinkSync/, /rmSync/, /copyFileSync/, /execSync/, /spawnSync/];
  for (const re of forbidden) {
    if (re.test(src)) throw new Error(`gate source contains a forbidden I/O surface: ${re}`);
  }
  const imports = [...src.matchAll(/^import .*from "([^"]+)";/gm)].map((m) => m[1]);
  eq(imports.sort().join(","), "node:crypto,node:fs,node:process", "imports");
  return `imports limited to ${imports.join(", ")}`;
});

check("gate applies no mutation to the fixture tree", () => {
  const before = createHash("sha256").update(fs.readdirSync(tmp).sort().join(",")).digest("hex");
  run();
  const after = createHash("sha256").update(fs.readdirSync(tmp).sort().join(",")).digest("hex");
  eq(after, before, "fixture directory listing");
});

// ---------------------------------------------------------------- summary
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`\n=== Results: ${passed} passed, ${failures.length} failed ===\n`);
if (failures.length > 0) {
  console.log("Failures:");
  for (const f of failures) console.log(`  ✗ ${f.name}\n      ${f.error}`);
  process.exit(1);
}
