#!/usr/bin/env node
/**
 * Production environment preflight. Does not print values, connect to services,
 * or write to the database. It validates configuration safety gates only.
 */
const problems = [];
const localHosts = new Set(["localhost", "127.0.0.1", "::1"]);

const requireValue = (name, predicate, message) => {
  const value = process.env[name];
  if (!value || !predicate(value)) problems.push(`${name}: ${message}`);
};
const isPublicHttpsUrl = (value) => {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !localHosts.has(url.hostname);
  } catch {
    return false;
  }
};

if (process.env.NODE_ENV !== "production") problems.push("NODE_ENV: must equal production for this preflight.");
requireValue("SESSION_SECRET", (value) => value.length >= 32, "must be configured with at least 32 characters.");
requireValue("INTEGRATION_SECRET_KEY", (value) => value.length >= 32, "must be configured with at least 32 characters.");
requireValue("PUBLIC_APP_URL", isPublicHttpsUrl, "must be a public HTTPS origin (not localhost)." );
requireValue("DATABASE_URL", (value) => {
  try {
    const url = new URL(value);
    return ["postgres:", "postgresql:"].includes(url.protocol) && !localHosts.has(url.hostname);
  } catch { return false; }
}, "must target a non-local PostgreSQL database; SQLite is not approved for production." );

// Phase 36 (PG-35-01): Prisma does not verify the server certificate from
// `sslmode`; only `sslaccept=strict` + `sslcert` authenticates the server.
// A production deployment without them is encrypted but unauthenticated.
if (process.env.DATABASE_URL) {
  try {
    const url = new URL(process.env.DATABASE_URL);
    if (["postgres:", "postgresql:"].includes(url.protocol)) {
      const sslaccept = url.searchParams.get("sslaccept");
      const sslcert = (url.searchParams.get("sslcert") || "").trim();
      const sslmode = (url.searchParams.get("sslmode") || "").toLowerCase();
      if (sslaccept !== "strict") {
        problems.push("DATABASE_URL: must set sslaccept=strict for certificate authentication (Prisma ignores sslmode).");
      }
      if (!sslcert) problems.push("DATABASE_URL: must set sslcert to the server CA certificate path.");
      if (!["require", "verify-ca", "verify-full"].includes(sslmode)) {
        problems.push("DATABASE_URL: sslmode must be require, verify-ca or verify-full.");
      }
    }
  } catch {
    // URL shape already reported above.
  }
}

// Phase 36 (PG-35-02): the S3 adapter is a stub - every operation throws.
// It must never pass a production preflight.
const storageProvider = (process.env.STORAGE_PROVIDER || "local").toLowerCase();
if (storageProvider === "s3") {
  problems.push("STORAGE_PROVIDER: S3 storage is not implemented in this release; use local storage with a persistent volume.");
} else if (!["local", "memory"].includes(storageProvider)) {
  problems.push("STORAGE_PROVIDER: must be local (supported) - S3 is not implemented.");
}
if (storageProvider === "memory") {
  problems.push("STORAGE_PROVIDER: in-memory storage is not durable and is not permitted in production.");
}

if (process.env.NEXT_PUBLIC_DEMO_HINTS !== "false") problems.push("NEXT_PUBLIC_DEMO_HINTS: must be explicitly false in production.");
if (process.env.ALLOW_DEMO_SEED === "true") problems.push("ALLOW_DEMO_SEED: must not be enabled in production.");
if (process.env.WORKFLOW_WORKER_SECRET && process.env.WORKFLOW_WORKER_SECRET.length < 32) {
  problems.push("WORKFLOW_WORKER_SECRET: if configured, must contain at least 32 characters.");
}

for (const [key, value] of Object.entries({
  AI_BASE_URL: process.env.AI_BASE_URL,
  STT_BASE_URL: process.env.STT_BASE_URL,
  TTS_BASE_URL: process.env.TTS_BASE_URL,
  EMAIL_WEBHOOK_URL: process.env.EMAIL_WEBHOOK_URL,
  SMS_WEBHOOK_URL: process.env.SMS_WEBHOOK_URL,
  AI_CONTENT_WEBHOOK_URL: process.env.AI_CONTENT_WEBHOOK_URL,
})) {
  if (value && !isPublicHttpsUrl(value)) problems.push(`${key}: configured endpoints must use public HTTPS URLs.`);
}
for (const [key, first, second] of [
  ["STT_API_KEY", process.env.STT_API_KEY, process.env.STT_BASE_URL],
  ["TTS_API_KEY", process.env.TTS_API_KEY, process.env.TTS_BASE_URL],
  ["VAPID_PUBLIC_KEY", process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY],
]) {
  if (Boolean(first) !== Boolean(second)) problems.push(`${key}: related configuration values must be provided together.`);
}
if (process.env.EMAIL_PROVIDER === "webhook" && !process.env.EMAIL_WEBHOOK_URL) problems.push("EMAIL_WEBHOOK_URL: required when EMAIL_PROVIDER=webhook.");
if (process.env.SMS_PROVIDER === "webhook" && !process.env.SMS_WEBHOOK_URL) problems.push("SMS_WEBHOOK_URL: required when SMS_PROVIDER=webhook.");

for (const key of Object.keys(process.env)) {
  if (key.startsWith("NEXT_PUBLIC_") && /(SECRET|TOKEN|PASSWORD|PRIVATE|DATABASE_URL|API_KEY)/i.test(key)) {
    problems.push(`${key}: secret-like public environment variable name is prohibited.`);
  }
}

if (problems.length) {
  console.error("Production environment preflight failed. Values are intentionally not printed:");
  for (const problem of problems) console.error(`- ${problem}`);
  process.exitCode = 1;
} else {
  console.log("Production environment preflight passed. No credentials were printed or probed.");
}
