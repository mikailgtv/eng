/**
 * Phase 39 — release safety contracts.
 *
 * Covers ONLY gaps that no existing suite covers, using synthetic fixtures and local files:
 *
 *   A. the staging readiness gate is deterministic and always emits all 18 checks
 *   C. no release/build/test script invokes a schema-destructive command, and
 *      `release:verify` does not depend on staging configuration
 *   E. liveness and readiness remain distinct, and readiness reflects real dependency state
 *
 * Deliberately NOT duplicated here (already covered elsewhere, referenced so the gap is explicit):
 *   - strict-TLS audit, anti-downgrade and rogue-CA rejection → scripts/test-db-tls.ts (32)
 *   - backup/recovery target separation                → scripts/test-db-tls.ts
 *   - production rejects SQLite (no silent fallback)   → scripts/test-server-env.ts
 *   - S3 fail-closed, storage regression               → scripts/test-storage-regression-simple.mjs (21)
 *   - gate contract (13 requirements)                  → scripts/test-staging-gate.mjs (27)
 *
 * No network, no database server, no staging or production system is contacted.
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p: string) => fs.readFileSync(path.join(root, p), "utf8");

let passed = 0;
const failures: string[] = [];
function check(name: string, fn: () => void | string) {
  try {
    const detail = fn();
    passed++;
    console.log(`  ✓ ${name}` + (typeof detail === "string" && detail ? `\n      ${detail}` : ""));
  } catch (e) {
    failures.push(name);
    console.log(`  ✗ ${name}\n      ${(e as Error).message}`);
  }
}

// The documented check order — the gate must emit exactly this, every time.
const EXPECTED_ORDER = [
  "DB-1", "DB-2", "DB-3", "DB-4", "DB-5",
  "TOOL-1", "TOOL-2", "TOOL-3", "TOOL-4",
  "REC-1",
  "AUTH-1", "AUTH-2", "AUTH-3",
  "ENV-1",
  "STO-1", "STO-2", "STO-3",
  "APP-1",
];

function runGate(env: NodeJS.ProcessEnv) {
  return spawnSync(process.execPath, [path.join(root, "scripts/db/staging-readiness.mjs"), "--json"], {
    env,
    encoding: "utf8",
  });
}

console.log("\n=== release safety contracts ===\n");
console.log("A. staging gate determinism & completeness");

// NODE_ENV is required by the project's ProcessEnv augmentation; the gate does not read it.
const emptyEnv: NodeJS.ProcessEnv = { PATH: process.env.PATH ?? "", NODE_ENV: "test" };

check("gate is byte-for-byte deterministic across identical runs", () => {
  const a = runGate(emptyEnv);
  const b = runGate(emptyEnv);
  assert.equal(a.status, 2, "empty environment must exit 2");
  assert.equal(b.status, 2, "second run must exit 2");
  assert.equal(a.stdout, b.stdout, "two identical runs produced different output");
  return "2 runs, identical stdout and exit code";
});

check("gate always emits all 18 checks in the documented order", () => {
  const r = runGate(emptyEnv);
  const j = JSON.parse(r.stdout);
  assert.equal(j.total, 18, `expected 18 checks, got ${j.total}`);
  assert.deepEqual(j.results.map((x: { id: string }) => x.id), EXPECTED_ORDER);
  return `order: ${EXPECTED_ORDER.join(" → ")}`;
});

check("an incomplete configuration yields zero ready checks (no premature pass)", () => {
  const j = JSON.parse(runGate(emptyEnv).stdout);
  const ready = j.results.filter((x: { status: string }) => x.status === "PASS" || x.status === "ATTESTED");
  assert.equal(ready.length, 0, `expected no ready checks, got ${ready.map((x: { id: string }) => x.id).join(",")}`);
  assert.equal(j.ready, 0);
  assert.ok(j.blocked > 0, "an empty environment must report blocked checks");
  return `${j.blocked} blocked / ${j.skipped} skipped`;
});

console.log("\nC. no destructive or staging-dependent release path");

const DESTRUCTIVE = /db\s+push|migrate\s+reset|--accept-data-loss|--force-reset|DROP\s+SCHEMA/i;

check("no package.json script invokes a schema-destructive command", () => {
  const pkg = JSON.parse(read("package.json"));
  const offenders = Object.entries(pkg.scripts as Record<string, string>)
    .filter(([, cmd]) => DESTRUCTIVE.test(cmd))
    .map(([name]) => name);
  assert.deepEqual(offenders, [], `scripts invoking destructive commands: ${offenders.join(", ")}`);
  return `${Object.keys(pkg.scripts).length} scripts scanned`;
});

check("no executable script under scripts/ invokes a schema-destructive command", () => {
  const offenders: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(mjs|js|cjs|ts|mts)$/.test(entry.name)) {
        // This suite must contain the pattern in order to search for it; that is the only
        // permitted self-reference, and it is named explicitly rather than pattern-excluded.
        if (entry.name === "test-release-contracts.ts") return;
        if (DESTRUCTIVE.test(fs.readFileSync(full, "utf8"))) offenders.push(path.relative(root, full));
      }
    }
  };
  walk(path.join(root, "scripts"));
  assert.deepEqual(offenders, [], `files mentioning a destructive command: ${offenders.join(", ")}`);
  return "recursive scan of scripts/ is clean";
});

check("release:verify exists, runs the real suites, and needs no staging configuration", () => {
  const pkg = JSON.parse(read("package.json"));
  const cmd = pkg.scripts["release:verify"];
  assert.ok(cmd, "package.json is missing release:verify");
  assert.match(cmd, /typecheck/, "release:verify must run the typecheck");
  assert.match(cmd, /npm test/, "release:verify must run the aggregate test suite");
  assert.doesNotMatch(cmd, /staging:ready/, "release:verify must NOT depend on the staging gate (that needs organizational inputs)");
  assert.doesNotMatch(cmd, /SECRET|PASSWORD|TOKEN|DATABASE_URL/i, "release:verify must not reference credentials");
  return cmd;
});

check("release:verify does not run migrations, backups, restores or deployment", () => {
  const pkg = JSON.parse(read("package.json"));
  const cmd: string = pkg.scripts["release:verify"];
  for (const forbidden of ["migrate", "pg_dump", "pg_restore", "deploy", "publish"]) {
    assert.ok(!new RegExp(`\\b${forbidden}`, "i").test(cmd), `release:verify must not contain "${forbidden}"`);
  }
  return "no migrate / pg_dump / pg_restore / deploy / publish";
});

console.log("\nE. liveness and readiness remain separate");

check("liveness handler performs no I/O and depends on nothing", () => {
  const raw = read("src/app/health/live/route.ts");
  // Strip comments first: prose that says "no database, storage, or network I/O" is the
  // opposite of a dependency, and a naive substring match would flag it.
  const src = raw.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  const imports = [...src.matchAll(/^import .*from "([^"]+)";/gm)].map((m) => m[1]);
  assert.deepEqual(imports, ["next/server"], `liveness must import only next/server, got: ${imports.join(", ")}`);
  for (const forbidden of ["await", "prisma", "system-health", "storage", "fetch("]) {
    // "await" is the tell-tale of any asynchronous dependency; the handler must be synchronous
    assert.ok(!src.includes(forbidden), `liveness must not reference "${forbidden}"`);
  }
  assert.match(src, /status: "alive"/);
  assert.match(src, /"Cache-Control": "no-store"/);
  assert.match(src, /"X-Content-Type-Options": "nosniff"/);
  return "1 import (next/server), zero awaits, correct headers";
});

check("readiness handler reports unavailable when a dependency fails", () => {
  const src = read("src/app/health/route.ts");
  assert.match(src, /getSystemHealth/, "readiness must consult the health aggregator");
  assert.match(src, /HEALTHY"\s*\?\s*200\s*:\s*503/, "readiness must map HEALTHY→200 and everything else→503");
  assert.match(src, /"unavailable"/);
  assert.doesNotMatch(src, /catch\s*\(/, "readiness must not swallow errors into a healthy-looking response");
  return "HEALTHY→200, otherwise→503, no error swallowing";
});

check("the two handlers are distinct modules with distinct contracts", () => {
  const live = read("src/app/health/live/route.ts");
  const ready = read("src/app/health/route.ts");
  assert.notEqual(live, ready, "liveness and readiness must not be the same handler");
  assert.ok(!live.includes("getSystemHealth"), "liveness must not consult the readiness aggregator");
  return "separate files, separate dependencies";
});

async function healthBehaviour() {
  console.log("\nE. readiness reflects real dependency state (local fixtures)");

  const tmpDb = path.join(os.tmpdir(), `p39-contract-${process.pid}.db`);
  const saved = {
    DATABASE_URL: process.env.DATABASE_URL,
    STORAGE_PROVIDER: process.env.STORAGE_PROVIDER,
    STORAGE_LOCAL_ROOT: process.env.STORAGE_LOCAL_ROOT,
  };

  try {
    // A throwaway SQLite file keeps the database component healthy without any external service.
    process.env.DATABASE_URL = `file:${tmpDb}`;
    process.env.STORAGE_PROVIDER = "local";
    process.env.STORAGE_LOCAL_ROOT = os.tmpdir();

    const mod = await import(path.join(root, "src/lib/system-health.ts"));
    const toHttpStatus = (s: string) => (s === "HEALTHY" ? 200 : 503);

    const healthy = await mod.getSystemHealth();
    check("healthy database + usable storage → readiness 200", () => {
      assert.equal(healthy.status, "HEALTHY");
      assert.equal(toHttpStatus(healthy.status), 200);
      const storage = healthy.components.find((c: { name: string }) => c.name === "File storage");
      assert.equal(storage.status, "HEALTHY");
      assert.ok(!storage.detail.includes(os.tmpdir()), "storage detail must not expose the filesystem path");
      return `database=${healthy.components.find((c: { name: string }) => c.name === "Database").status}, storage=${storage.status}`;
    });

    // In-memory storage is not durable: readiness must not claim the instance can serve files.
    process.env.STORAGE_PROVIDER = "memory";
    const degraded = await mod.getSystemHealth();
    check("usable database + unusable storage → readiness 503", () => {
      assert.notEqual(degraded.status, "HEALTHY", "readiness must not be healthy with unusable storage");
      assert.equal(toHttpStatus(degraded.status), 503);
      const storage = degraded.components.find((c: { name: string }) => c.name === "File storage");
      assert.equal(storage.status, "DOWN");
      assert.ok(!storage.detail.includes(os.tmpdir()), "storage detail must not expose the filesystem path");
      return `storage detail: "${storage.detail}"`;
    });

    check("the database component stayed healthy — the 503 came from storage", () => {
      const db = degraded.components.find((c: { name: string }) => c.name === "Database");
      assert.equal(db.status, "HEALTHY", "database should still be healthy; the failure must be attributable to storage");
      return "failure is correctly attributed, not a blanket error";
    });
  } finally {
    // restore environment and remove the throwaway database
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
    if (fs.existsSync(tmpDb)) fs.rmSync(tmpDb, { force: true });
    for (const suffix of ["-journal", "-wal", "-shm"]) {
      const f = tmpDb + suffix;
      if (fs.existsSync(f)) fs.rmSync(f, { force: true });
    }
  }
}

// tsx emits CommonJS here, so the async section is awaited explicitly instead of via top-level await.
healthBehaviour()
  .catch((e) => {
    failures.push("health behaviour section aborted");
    console.log(`  ✗ health behaviour section aborted\n      ${(e as Error).message}`);
  })
  .then(() => {
    console.log(`\n=== Results: ${passed} passed, ${failures.length} failed ===\n`);
    if (failures.length > 0) {
      console.log("Failures:");
      for (const f of failures) console.log(`  ✗ ${f}`);
      process.exit(1);
    }
  });
