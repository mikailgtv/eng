#!/usr/bin/env node
/**
 * Phase 43 — LIVE authentication-hardening regression suite.
 *
 * Drives the real /api/auth/login handler over HTTP to prove the Phase 42
 * findings are closed at the socket, not merely in unit-tested helpers.
 *
 * Each case is written so that it FAILS against the pre-Phase-43 code:
 *
 *   A2  rotating `x-forwarded-for` defeated the rate limiter (Phase 42 observed
 *       12 attempts, 12×401, never throttled). Now: throttled at attempt 6.
 *   B2  a locked account still answered wrong-password guesses (401). Now the
 *       lock is enforced before the password comparison, so it returns 403.
 *   C2  `Origin: evil` + `x-forwarded-host: evil` satisfied the CSRF check
 *       (401 instead of 403). Now the forwarded host is not consulted at all.
 *
 * Requires e2e/seed.ts fixtures and the application running against a
 * DISPOSABLE database copy — never prisma/dev.db:
 *
 *   E2E_BASE=http://127.0.0.1:4043 node scripts/test-auth-hardening-live.mjs
 *
 * SAFETY: synthetic e2e tenants only. No production data, no external hosts.
 */
import { readFileSync } from "fs";
import path from "path";

import { resolveTestBase } from "./lib/test-base.mjs";

const BASE = resolveTestBase();
const HOST = new URL(BASE).host;

// Synthetic fixture credential created by e2e/seed.ts (not a real secret; the
// same constant is used by scripts/test-idor-live.mjs).
const FIXTURE_PASSWORD = "E2eOnly!Passw0rd#32";

const fixtures = JSON.parse(readFileSync(path.join(process.cwd(), "e2e", "fixtures.json"), "utf8"));
const A = fixtures.a;
const B = fixtures.b;

const attempts = Number(process.env.PHASE43_ATTEMPTS || 12);

const results = [];
function record(id, title, expected, actual, pass, note) {
  results.push({ id, title, pass });
  console.log(`  ${pass ? "✓" : "✗"} ${id} :: ${title} — expected=${expected}, got=${actual}`);
  if (!pass && note) console.log(`        ↳ ${note}`);
}

async function attemptLogin({ identifier, password, origin, forwardedFor, forwardedHost }) {
  const headers = { "content-type": "application/json", origin: origin ?? BASE };
  if (forwardedFor !== undefined) headers["x-forwarded-for"] = forwardedFor;
  if (forwardedHost !== undefined) headers["x-forwarded-host"] = forwardedHost;
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers,
    body: JSON.stringify({ identifier, password }),
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}

const wrongPassword = "Definitely-Not-The-Password-9";

async function main() {
  console.log(`\nPhase 43 auth-hardening live suite → ${BASE}\n`);

  // ---------------------------------------------------------------- A. F-01
  console.log("A. F-01 — login rate limiting must not be defeated by a request header");

  {
    // Control: a fixed forwarded address still throttles (unchanged behaviour).
    const identifier = `p43.control.${Date.now()}@example.invalid`;
    const statuses = [];
    for (let i = 0; i < attempts; i += 1) {
      const { status } = await attemptLogin({
        identifier,
        password: wrongPassword,
        forwardedFor: "203.0.113.10",
      });
      statuses.push(status);
    }
    const throttledAt = statuses.indexOf(429) + 1;
    record(
      "A1",
      "fixed x-forwarded-for throttles at the 6th failure (control)",
      "429 at attempt 6",
      throttledAt ? `429 at attempt ${throttledAt}` : statuses.join(","),
      throttledAt === 6,
      "the limiter itself must still work; a failure here is a different regression",
    );
  }

  {
    // REGRESSION: rotating the header used to give every request a fresh bucket.
    const identifier = `p43.rotate.${Date.now()}@example.invalid`;
    const statuses = [];
    for (let i = 0; i < attempts; i += 1) {
      const { status } = await attemptLogin({
        identifier,
        password: wrongPassword,
        forwardedFor: `198.51.100.${i + 1}`,
      });
      statuses.push(status);
    }
    const throttledAt = statuses.indexOf(429) + 1;
    record(
      "A2",
      "rotating x-forwarded-for still throttles (F-01 regression)",
      "429 at attempt 6",
      throttledAt ? `429 at attempt ${throttledAt}` : `${attempts} attempts, statuses ${[...new Set(statuses)].join("/")} — never throttled`,
      throttledAt === 6,
      "Phase 42 observed 12×401 here; if this fails the forwarded header is trusted again",
    );
  }

  // ---------------------------------------------------------------- B. F-03
  console.log("\nB. F-03 — the account lock must be enforced before the password check");
  {
    const username = B.student2User;
    const email = `e2e.student2.b@example.invalid`;
    const statuses = [];
    for (let i = 0; i < 5; i += 1) {
      const { status } = await attemptLogin({ identifier: username, password: wrongPassword });
      statuses.push(status);
    }
    record(
      "B1",
      "five failed sign-ins are rejected and engage the lock",
      "401 ×5",
      statuses.join(","),
      statuses.every((s) => s === 401),
      "if the account was already locked from an earlier run, clear locks first",
    );

    // Wrong password presented through the account's EMAIL: a distinct rate-limit
    // key, so the limiter cannot mask the lock. Pre-fix this returned 401.
    const wrongViaEmail = await attemptLogin({ identifier: email, password: wrongPassword });
    record(
      "B2",
      "a locked account refuses a WRONG password before comparing it (F-03 regression)",
      "403",
      wrongViaEmail.status,
      wrongViaEmail.status === 403,
      "401 here means the password was compared on a locked account — the Phase 42 defect",
    );

    const correctViaEmail = await attemptLogin({ identifier: email, password: FIXTURE_PASSWORD });
    record(
      "B3",
      "a locked account refuses even the CORRECT password",
      "403",
      correctViaEmail.status,
      correctViaEmail.status === 403,
      "the lock must block access, not merely slow guessing",
    );
  }

  // ---------------------------------------------------------------- C. F-02
  console.log("\nC. F-02 — the CSRF origin check must not trust x-forwarded-host");
  {
    const noForwardedHost = await attemptLogin({
      identifier: "e2e.teacher.a",
      password: wrongPassword,
      origin: "https://evil.example",
    });
    record(
      "C1",
      "cross-origin request is rejected (control)",
      "403",
      noForwardedHost.status,
      noForwardedHost.status === 403,
    );

    const spoofedHost = await attemptLogin({
      identifier: "e2e.teacher.a",
      password: wrongPassword,
      origin: "https://evil.example",
      forwardedHost: "evil.example",
    });
    record(
      "C2",
      "spoofing x-forwarded-host does not satisfy the origin check (F-02 regression)",
      "403",
      spoofedHost.status,
      spoofedHost.status === 403,
      "Phase 42 observed 401 here — the check compared Origin against the caller's own header",
    );

    const legit = await attemptLogin({ identifier: "e2e.teacher.a", password: FIXTURE_PASSWORD });
    record("C3", "a legitimate same-origin sign-in still succeeds", "200", legit.status, legit.status === 200);

    const legitWithNoise = await attemptLogin({
      identifier: "e2e.teacher.a",
      password: FIXTURE_PASSWORD,
      forwardedHost: "evil.example",
    });
    record(
      "C4",
      "a legitimate sign-in is not rejected merely because x-forwarded-host is present",
      "200",
      legitWithNoise.status,
      legitWithNoise.status === 200,
      "the header must be ignored, not used to reject: over-rejection would break proxied deployments",
    );
  }

  // ---------------------------------------------------------------- D. F-04/F-05
  console.log("\nD. F-04 / F-05 — transport and content security headers");
  {
    const res = await fetch(`${BASE}/login`);
    const hsts = res.headers.get("strict-transport-security");
    record(
      "D1",
      "Strict-Transport-Security is emitted",
      "max-age present",
      hsts ? hsts : "(absent)",
      Boolean(hsts && /max-age=\d+/.test(hsts)),
    );

    const csp = res.headers.get("content-security-policy-report-only");
    record(
      "D2",
      "Content-Security-Policy (report-only) is emitted",
      "default-src 'self' present",
      csp ? "present" : "(absent)",
      Boolean(csp && /default-src 'self'/.test(csp) && /object-src 'none'/.test(csp)),
    );

    const baseline = ["x-content-type-options", "referrer-policy", "x-frame-options", "permissions-policy"];
    const missing = baseline.filter((h) => !res.headers.get(h));
    record("D3", "pre-existing security headers are retained", "4/4 present", missing.length ? `missing ${missing.join(",")}` : "4/4 present", missing.length === 0);

    const poweredBy = res.headers.get("x-powered-by");
    record("D4", "X-Powered-By stays suppressed", "absent", poweredBy ? "present" : "absent", !poweredBy);
  }

  // ---------------------------------------------------------------- E. no authz regression
  console.log("\nE. authorization boundary unchanged");
  {
    const res = await fetch(`${BASE}/api/users`, { headers: { origin: BASE } });
    record("E1", "unauthenticated /api/users is still rejected", "401", res.status, res.status === 401);
  }

  const failed = results.filter((r) => !r.pass);
  console.log(`\n=== auth-hardening live: ${results.length - failed.length} passed, ${failed.length} failed ===\n`);
  if (failed.length) process.exitCode = 1;
}

main().catch((err) => {
  console.error(`\nSUITE ERROR: ${err.message}\n`);
  process.exitCode = 1;
});
