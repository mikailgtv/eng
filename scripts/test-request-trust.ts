/**
 * Phase 43 — regression tests for the request-trust and origin policy.
 *
 * These cover the two Phase 42 findings that could be fixed in application code
 * without a deployment-topology decision:
 *
 *   F-01  the login rate limiter accepted a caller-supplied `x-forwarded-for`
 *         as the client identity, so rotating the header produced a fresh
 *         bucket per request and defeated the throttle entirely.
 *   F-02  the CSRF origin check compared `Origin` against `x-forwarded-host`,
 *         so echoing the attacker's origin into that header satisfied it.
 *
 * The tests are pure: no server, no database, no network. Behaviour against a
 * real socket is covered by scripts/test-auth-hardening-live.mjs.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  clientIp,
  clientIpKey,
  trustedProxyHops,
} from "../src/lib/request-trust";
import {
  DEFAULT_DEV_ORIGIN,
  resolveAppOrigin,
  sameOriginDecision,
} from "../src/lib/app-origin";

const root = process.cwd();
const read = (p: string) => fs.readFileSync(path.join(root, p), "utf8");

const results: { name: string; ok: boolean }[] = [];
function check(name: string, fn: () => void) {
  try {
    fn();
    results.push({ name, ok: true });
    console.log(`✓ ${name}`);
  } catch (err) {
    results.push({ name, ok: false });
    console.log(`✗ ${name}\n    ${(err as Error).message}`);
  }
}

const reqWith = (headers: Record<string, string>) => new Request("http://127.0.0.1:4043/api/auth/login", { headers });

// ---------------------------------------------------------------- trustedProxyHops

check("TRUSTED_PROXY_HOPS: unset/blank/malformed/out-of-range all resolve to 0", () => {
  for (const raw of [undefined, "", "   ", "abc", "-1", "1.5", "99", "0x1", "1e3", "  "]) {
    assert.equal(trustedProxyHops(raw as string | undefined), 0, `input ${JSON.stringify(raw)} must yield 0`);
  }
});

check("TRUSTED_PROXY_HOPS: valid hop counts are honoured", () => {
  assert.equal(trustedProxyHops("1"), 1);
  assert.equal(trustedProxyHops("2"), 2);
  assert.equal(trustedProxyHops(" 2 "), 2);
  assert.equal(trustedProxyHops("10"), 10);
});

// ---------------------------------------------------------------- clientIp

check("F-01: with no trusted proxy, x-forwarded-for is ignored entirely", () => {
  const req = reqWith({ "x-forwarded-for": "203.0.113.10" });
  assert.equal(clientIp(req, 0), null, "an untrusted forwarded header must not yield an IP");
  assert.equal(clientIpKey(req, 0), "untrusted");
});

check("F-01: rotating x-forwarded-for cannot change the key when no proxy is trusted", () => {
  const keys = new Set<string>();
  for (let i = 1; i <= 12; i += 1) {
    keys.add(clientIpKey(reqWith({ "x-forwarded-for": `198.51.100.${i}` }), 0));
  }
  assert.deepEqual([...keys], ["untrusted"], "every spoofed address must collapse to one bucket");
});

check("clientIp: one trusted hop takes the right-most entry", () => {
  assert.equal(clientIp(reqWith({ "x-forwarded-for": "1.2.3.4, 203.0.113.9" }), 1), "203.0.113.9");
  assert.equal(clientIp(reqWith({ "x-forwarded-for": "203.0.113.9" }), 1), "203.0.113.9");
});

check("clientIp: two trusted hops take the second entry from the right", () => {
  assert.equal(clientIp(reqWith({ "x-forwarded-for": "9.9.9.9, 203.0.113.9, 10.0.0.1" }), 2), "203.0.113.9");
});

check("clientIp: chain shorter than the declared hop count fails closed", () => {
  assert.equal(clientIp(reqWith({ "x-forwarded-for": "203.0.113.9" }), 2), null);
});

check("clientIp: non-IP entries are rejected rather than trusted", () => {
  for (const bad of ["unknown", "hostname.example", "203.0.113.9:443", "203.0.113.999", "<script>", " "]) {
    assert.equal(clientIp(reqWith({ "x-forwarded-for": bad }), 1), null, `"${bad}" must be rejected`);
  }
});

check("clientIp: IPv6 literals are accepted", () => {
  assert.equal(clientIp(reqWith({ "x-forwarded-for": "2001:db8::1" }), 1), "2001:db8::1");
});

// ---------------------------------------------------------------- sameOriginDecision

check("F-02: Origin is never compared against x-forwarded-host", () => {
  // The spoof that defeated Phase 42: attacker sets BOTH the Origin and the
  // forwarded host to their own domain. The decision function has no parameter
  // for a forwarded host at all, so the spoof is structurally impossible.
  const decision = sameOriginDecision({
    originHeader: "https://evil.example",
    hostHeader: "127.0.0.1:4043",
    isProduction: false,
  });
  assert.equal(decision.allowed, false);
  assert.equal(decision.allowed === false && decision.status, 403);

  // Even if a caller appends a matching forwarded-host header, it is not read.
  const req = new Request("http://127.0.0.1:4043/api/auth/login", {
    headers: { origin: "https://evil.example", host: "127.0.0.1:4043", "x-forwarded-host": "evil.example" },
  });
  const fromHeaders = sameOriginDecision({
    originHeader: req.headers.get("origin"),
    hostHeader: req.headers.get("host"),
    isProduction: false,
  });
  assert.equal(fromHeaders.allowed, false, "a spoofed x-forwarded-host must not rescue a foreign Origin");
});

check("sameOriginDecision: matching Origin/Host is allowed in development", () => {
  const decision = sameOriginDecision({
    originHeader: "http://127.0.0.1:4043",
    hostHeader: "127.0.0.1:4043",
    isProduction: false,
  });
  assert.equal(decision.allowed, true);
});

check("sameOriginDecision: absent Origin is allowed by documented design (F-08)", () => {
  assert.equal(sameOriginDecision({ originHeader: null, hostHeader: null, isProduction: false }).allowed, true);
  assert.equal(sameOriginDecision({ originHeader: null, hostHeader: null, isProduction: true }).allowed, true);
});

check("sameOriginDecision: unparseable Origin is a 400", () => {
  const decision = sameOriginDecision({ originHeader: "null", hostHeader: "127.0.0.1:4043", isProduction: false });
  assert.equal(decision.allowed, false);
  assert.equal(decision.allowed === false && decision.status, 400);
});

check("sameOriginDecision: production without PUBLIC_APP_URL fails closed (503)", () => {
  const previous = process.env.PUBLIC_APP_URL;
  delete process.env.PUBLIC_APP_URL;
  try {
    const decision = sameOriginDecision({
      originHeader: "https://app.example.invalid",
      hostHeader: "app.example.invalid",
      isProduction: true,
    });
    assert.equal(decision.allowed, false, "production must not fall back to a header-derived origin");
    assert.equal(decision.allowed === false && decision.status, 503);
  } finally {
    if (previous !== undefined) process.env.PUBLIC_APP_URL = previous;
  }
});

check("sameOriginDecision: production compares against the configured canonical origin", () => {
  const previous = process.env.PUBLIC_APP_URL;
  process.env.PUBLIC_APP_URL = "https://app.example.invalid";
  try {
    const ok = sameOriginDecision({
      originHeader: "https://app.example.invalid",
      hostHeader: "internal-10-0-0-4:3000",
      isProduction: true,
    });
    assert.equal(ok.allowed, true, "a proxied request behind a rewrites-Host proxy must still pass");

    const bad = sameOriginDecision({
      originHeader: "https://evil.example",
      hostHeader: "app.example.invalid",
      isProduction: true,
    });
    assert.equal(bad.allowed, false);
    assert.equal(bad.allowed === false && bad.status, 403);

    const downgrade = sameOriginDecision({
      originHeader: "http://app.example.invalid",
      hostHeader: "app.example.invalid",
      isProduction: true,
    });
    assert.equal(downgrade.allowed, false, "scheme must match: http Origin vs https canonical is a mismatch");
  } finally {
    if (previous === undefined) delete process.env.PUBLIC_APP_URL;
    else process.env.PUBLIC_APP_URL = previous;
  }
});

// ---------------------------------------------------------------- resolveAppOrigin

check("resolveAppOrigin: development falls back, production refuses to guess", () => {
  const previous = process.env.PUBLIC_APP_URL;
  delete process.env.PUBLIC_APP_URL;
  try {
    const dev = resolveAppOrigin(false);
    assert.equal(dev.ok, true);
    assert.equal(dev.ok === true && dev.origin, DEFAULT_DEV_ORIGIN);
    assert.equal(resolveAppOrigin(true).ok, false);
  } finally {
    if (previous !== undefined) process.env.PUBLIC_APP_URL = previous;
  }
});

check("resolveAppOrigin: rejects loopback, non-HTTPS and non-HTTP schemes in production", () => {
  const previous = process.env.PUBLIC_APP_URL;
  try {
    for (const bad of ["http://app.example.invalid", "https://localhost", "https://127.0.0.1", "ftp://app.example.invalid", "not a url"]) {
      process.env.PUBLIC_APP_URL = bad;
      assert.equal(resolveAppOrigin(true).ok, false, `${bad} must be rejected in production`);
    }
  } finally {
    if (previous === undefined) delete process.env.PUBLIC_APP_URL;
    else process.env.PUBLIC_APP_URL = previous;
  }
});

// ---------------------------------------------------------------- source-level guards

/**
 * Remove comments before scanning source. A security guard must match code, not
 * prose: doc comments legitimately *name* the header being avoided, and Phase 39
 * hit exactly this false positive when a comment describing the absence of a
 * dependency was read as the dependency itself.
 */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

/**
 * Extract a declaration body by name, accepting both `function NAME(...)` and
 * `export const NAME = ...` / `export async function NAME`.
 */
function functionBody(source: string, name: string): string {
  const text = stripComments(source);
  const patterns = [`function ${name}(`, `function ${name}<`, `const ${name} =`, `const ${name}:`];
  let start = -1;
  for (const pattern of patterns) {
    start = text.indexOf(pattern);
    if (start !== -1) break;
  }
  assert.notEqual(start, -1, `${name} not found (looked for: ${patterns.join(", ")})`);
  const open = text.indexOf("{", start);
  let depth = 0;
  for (let i = open; i < text.length; i += 1) {
    if (text[i] === "{") depth += 1;
    else if (text[i] === "}") {
      depth -= 1;
      if (depth === 0) return text.slice(open, i + 1);
    }
  }
  throw new Error(`unbalanced braces in ${name}`);
}

check("F-02 source guard: the shared origin check reads no forwarded-host header", () => {
  const api = stripComments(read("src/lib/api.ts"));
  assert.doesNotMatch(api, /x-forwarded-host/i, "src/lib/api.ts must not consult x-forwarded-host");
  assert.doesNotMatch(api, /x-forwarded-proto/i, "src/lib/api.ts must not consult x-forwarded-proto");
});

check("F-01 source guard: the login route reads no forwarded header directly", () => {
  const login = stripComments(read("src/app/api/auth/login/route.ts"));
  const body = functionBody(login, "POST");
  assert.doesNotMatch(body, /x-forwarded-for/i, "login POST must resolve the IP through request-trust");
  assert.doesNotMatch(body, /x-real-ip/i, "login POST must not read x-real-ip directly");
});

check("F-01 source guard: no route derives a rate-limit key from a raw forwarded header", () => {
  const offenders: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(ts|tsx)$/.test(entry.name)) {
        const src = stripComments(fs.readFileSync(full, "utf8"));
        if (/assertIdentityRate\([^)]*x-forwarded-for/i.test(src)) offenders.push(path.relative(root, full));
      }
    }
  };
  walk(path.join(root, "src"));
  assert.deepEqual(offenders, [], `rate-limit keys built from x-forwarded-for: ${offenders.join(", ")}`);
});

check("F-03 source guard: the account lock is checked before the password is compared", () => {
  const body = functionBody(read("src/app/api/auth/login/route.ts"), "POST");
  const lockAt = body.indexOf("assertNotLocked");
  const compareAt = body.indexOf("bcrypt.compare");
  assert.notEqual(lockAt, -1, "login must check the lock");
  assert.notEqual(compareAt, -1, "login must compare the password");
  assert.ok(lockAt < compareAt, "assertNotLocked must run before bcrypt.compare, or a locked account keeps answering guesses");
});

check("F-06 source guard: failed-login accounting is scoped to the user's own tenant", () => {
  const body = functionBody(read("src/lib/identity/security.ts"), "lockoutSettingsFor");
  assert.doesNotMatch(body, /organization\.findFirst/, "lockout settings must not be taken from an arbitrary organization");
  assert.match(body, /organizationId/, "the lookup must be scoped by organizationId");

  const noteBody = functionBody(read("src/lib/identity/security.ts"), "noteFailedLogin");
  assert.doesNotMatch(noteBody, /if \(!settings\) return;/, "missing settings must fall back to defaults, not disable lockout");
});

check("F-04/F-05 source guard: transport and content policies are emitted", () => {
  const cfg = stripComments(read("next.config.mjs"));
  assert.match(cfg, /Strict-Transport-Security/, "HSTS header missing from next.config.mjs");
  assert.match(cfg, /Content-Security-Policy-Report-Only/, "CSP (report-only) missing from next.config.mjs");
});

// ---------------------------------------------------------------- summary

const failed = results.filter((r) => !r.ok);
console.log(`\n=== request-trust & origin policy: ${results.length - failed.length} passed, ${failed.length} failed ===\n`);
if (failed.length) process.exitCode = 1;
