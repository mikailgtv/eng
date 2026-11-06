import assert from "node:assert/strict";
import { validateServerEnvironment } from "../src/lib/server-env";

/**
 * Phase 36 — runtime environment validation.
 *
 * Synthetic values only; no service is contacted.
 *
 * PG-35-01: a PostgreSQL production configuration must authenticate the server.
 * Prisma ignores `sslmode` for certificate verification, so `sslaccept=strict`
 * plus a CA path (`sslcert`) is required. Without this the connection is
 * encrypted but unauthenticated, and a MITM presenting any certificate or any
 * hostname is accepted.
 */

const development = {
  NODE_ENV: "development",
  DATABASE_URL: "file:./dev.db",
  SESSION_SECRET: "D".repeat(40),
} as NodeJS.ProcessEnv;
assert.doesNotThrow(() => validateServerEnvironment(development), "SQLite development must keep working");

const STRICT_URL =
  "postgresql://phase36:synthetic-password@db.example.invalid:5432/lms" +
  "?sslmode=require&sslcert=/etc/lms/ca.pem&sslaccept=strict";

const base = {
  NODE_ENV: "production",
  DATABASE_URL: STRICT_URL,
  SESSION_SECRET: "S".repeat(48),
  INTEGRATION_SECRET_KEY: "I".repeat(48),
  PUBLIC_APP_URL: "https://lms.example.invalid",
  NEXT_PUBLIC_DEMO_HINTS: "false",
  STORAGE_PROVIDER: "local",
  STORAGE_LOCAL_ROOT: "/srv/lms/storage",
} as NodeJS.ProcessEnv;

// --------------------------------------------------------------------------
// Accepted configuration
// --------------------------------------------------------------------------
assert.doesNotThrow(
  () => validateServerEnvironment(base),
  "production PostgreSQL with sslaccept=strict and a CA must be accepted",
);

assert.doesNotThrow(
  () => validateServerEnvironment({ ...base, DATABASE_URL: "file:./dev.db" as string, NODE_ENV: "development" }),
  "SQLite development/tests must not require PostgreSQL TLS settings",
);

// --------------------------------------------------------------------------
// Rejected PostgreSQL TLS configurations (PG-35-01)
// --------------------------------------------------------------------------
const reject = (label: string, url: string, expected?: RegExp) => {
  assert.throws(
    () => validateServerEnvironment({ ...base, DATABASE_URL: url }),
    (error: unknown) => {
      assert.ok(error instanceof Error, `${label}: expected Error`);
      assert.ok(/DATABASE_URL/.test(error.message), `${label}: message must name DATABASE_URL, got: ${error.message}`);
      assert.ok(
        !error.message.includes("synthetic-password"),
        `${label}: message must not leak the password`,
      );
      assert.ok(
        !/postgresql:\/\//.test(error.message),
        `${label}: message must not contain a connection URL`,
      );
      if (expected) assert.ok(expected.test(error.message), `${label}: expected ${expected}, got: ${error.message}`);
      return true;
    },
    `${label}: must be rejected`,
  );
};

// The Phase 35 defect: sslmode=verify-full alone. Prisma does NOT verify with it.
reject(
  "sslmode=verify-full without sslaccept",
  "postgresql://phase36:synthetic-password@db.example.invalid:5432/lms?sslmode=verify-full&sslrootcert=/etc/lms/ca.pem",
  /sslaccept=strict/,
);
reject(
  "no TLS parameters at all",
  "postgresql://phase36:synthetic-password@db.example.invalid:5432/lms",
  /sslaccept=strict/,
);
reject(
  "explicitly disabled verification",
  "postgresql://phase36:synthetic-password@db.example.invalid:5432/lms?sslmode=require&sslcert=/etc/lms/ca.pem&sslaccept=accept_invalid_certs",
  /sslaccept=strict/,
);
reject(
  "strict mode without a CA",
  "postgresql://phase36:synthetic-password@db.example.invalid:5432/lms?sslmode=require&sslaccept=strict",
  /sslcert/,
);
reject(
  "strict mode with plaintext sslmode",
  "postgresql://phase36:synthetic-password@db.example.invalid:5432/lms?sslmode=disable&sslcert=/etc/lms/ca.pem&sslaccept=strict",
  /sslmode/,
);
reject(
  "strict mode with capability-downgrading sslmode=prefer",
  "postgresql://phase36:synthetic-password@db.example.invalid:5432/lms?sslmode=prefer&sslcert=/etc/lms/ca.pem&sslaccept=strict",
  /sslmode/,
);

// --------------------------------------------------------------------------
// Storage provider safety (PG-35-02)
// --------------------------------------------------------------------------
assert.throws(
  () => validateServerEnvironment({ ...base, STORAGE_PROVIDER: "s3" }),
  (error: unknown) =>
    error instanceof Error && /STORAGE_PROVIDER/.test(error.message) && /not implemented/i.test(error.message),
  "STORAGE_PROVIDER=s3 must be rejected while the adapter is a stub",
);

assert.throws(
  () => validateServerEnvironment({ ...base, STORAGE_PROVIDER: "s3", NODE_ENV: "development", DATABASE_URL: "file:./dev.db" }),
  (error: unknown) => error instanceof Error && /not implemented/i.test(error.message),
  "STORAGE_PROVIDER=s3 must be rejected in development too",
);

assert.doesNotThrow(
  () => validateServerEnvironment({ ...base, STORAGE_PROVIDER: "local" }),
  "local storage remains a supported provider",
);

// --------------------------------------------------------------------------
// Pre-existing guarantees must not regress
// --------------------------------------------------------------------------
assert.throws(
  () => validateServerEnvironment({ ...base, DATABASE_URL: "file:./production.db" }),
  (error: unknown) => error instanceof Error && /DATABASE_URL/.test(error.message) && !error.message.includes("synthetic-password"),
  "production must reject SQLite",
);
assert.throws(
  () => validateServerEnvironment({ ...base, SESSION_SECRET: "short" }),
  (error: unknown) => error instanceof Error && /SESSION_SECRET/.test(error.message) && !error.message.includes("short"),
  "short secrets must be rejected without echoing them",
);

console.log(
  "Phase 36 environment tests passed: strict TLS required, S3 rejected, no secrets in messages, SQLite development unaffected.",
);
