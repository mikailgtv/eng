#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const checker = path.join(root, "scripts/production/check-env.mjs");
const run = (extra) => spawnSync(process.execPath, [checker], {
  cwd: root,
  encoding: "utf8",
  env: {
    PATH: process.env.PATH ?? "",
    NODE_ENV: "production",
    SESSION_SECRET: "S".repeat(48),
    INTEGRATION_SECRET_KEY: "I".repeat(48),
    PUBLIC_APP_URL: "https://lms.example.invalid",
    // Phase 36 (PG-35-01): authenticated TLS is mandatory in production.
    DATABASE_URL: "postgresql://phase27:synthetic-only@db.example.invalid:5432/lms?sslmode=require&sslcert=/etc/lms/ca.pem&sslaccept=strict",
    NEXT_PUBLIC_DEMO_HINTS: "false",
    ...extra,
  },
});

const valid = run({});
assert.equal(valid.status, 0, "complete production environment should pass without contacting services");
assert.match(valid.stdout, /preflight passed/);
assert.doesNotMatch(valid.stdout + valid.stderr, /synthetic-only|S{32}|I{32}/);

// Phase 36 (PG-35-01): production must authenticate the server certificate.
const noStrictTls = run({ DATABASE_URL: "postgresql://phase27:synthetic-only@db.example.invalid:5432/lms?sslmode=verify-full&sslrootcert=/etc/lms/ca.pem" });
assert.notEqual(noStrictTls.status, 0, "sslmode=verify-full without sslaccept=strict must fail the preflight");
assert.match(noStrictTls.stderr, /sslaccept=strict/);
assert.doesNotMatch(noStrictTls.stdout + noStrictTls.stderr, /synthetic-only/);

const noCa = run({ DATABASE_URL: "postgresql://phase27:synthetic-only@db.example.invalid:5432/lms?sslmode=require&sslaccept=strict" });
assert.notEqual(noCa.status, 0, "strict mode without a CA path must fail the preflight");
assert.match(noCa.stderr, /sslcert/);

// Phase 36 (PG-35-02): S3 must never pass a production preflight while unimplemented.
const s3 = run({ STORAGE_PROVIDER: "s3", STORAGE_S3_BUCKET: "b", STORAGE_S3_REGION: "r", STORAGE_S3_ACCESS_KEY_ID: "k", STORAGE_S3_SECRET_ACCESS_KEY: "s" });
assert.notEqual(s3.status, 0, "STORAGE_PROVIDER=s3 must fail the preflight");
assert.match(s3.stderr, /not implemented/);
assert.doesNotMatch(s3.stdout + s3.stderr, /synthetic-only/);

const localStorage = run({ STORAGE_PROVIDER: "local", STORAGE_LOCAL_ROOT: "/srv/lms/storage" });
assert.equal(localStorage.status, 0, "explicit local storage must pass the preflight");

const missingSecret = run({ SESSION_SECRET: "" });
assert.notEqual(missingSecret.status, 0);
assert.match(missingSecret.stderr, /SESSION_SECRET/);
assert.doesNotMatch(missingSecret.stdout + missingSecret.stderr, /S{32}|I{32}/);

const sqliteProduction = run({ DATABASE_URL: "file:./phase27-test.db" });
assert.notEqual(sqliteProduction.status, 0);
assert.match(sqliteProduction.stderr, /DATABASE_URL/);
assert.doesNotMatch(sqliteProduction.stdout + sqliteProduction.stderr, /synthetic-only|S{32}|I{32}/);

const partialProvider = run({ STT_API_KEY: "synthetic-stt-key" });
assert.notEqual(partialProvider.status, 0);
assert.match(partialProvider.stderr, /STT_API_KEY/);
assert.doesNotMatch(partialProvider.stdout + partialProvider.stderr, /synthetic-stt-key/);

console.log("Production environment validation tests passed (synthetic configuration only; no service or database contacted).");
