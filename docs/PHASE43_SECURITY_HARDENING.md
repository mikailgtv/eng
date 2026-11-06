# Phase 43 — Security hardening: deployment notes

This page documents the configuration introduced or clarified while remediating
the Phase 42 findings. It is operator-facing: the code changes are small, but
two of them depend on a deployment decision that only the operator can make.

---

## 1. `TRUSTED_PROXY_HOPS` — who may be trusted to report a client IP

**Finding closed:** F-01 (High) — login rate limiting was defeatable with a
request header.

`X-Forwarded-For` is a request header. Any client can set it, and the previous
code used its first entry as the client identity for the login rate limiter and
for the audit trail. Rotating the header produced a fresh rate-limit bucket on
every request, so the five-attempt limit never applied; the same value was
written to `loginAttempt` and audit rows, letting an attacker choose which IP an
investigation would blame.

### Behaviour by configuration

| `TRUSTED_PROXY_HOPS` | Client IP | Login rate limit key | Audit `ipAddress` |
|---|---|---|---|
| unset / `0` (default) | unknown | `untrusted:<identifier>` | `unknown` |
| `1` (one proxy in front) | right-most `X-Forwarded-For` entry | `<ip>:<identifier>` | the IP |
| `N` | Nth entry from the **right** | `<ip>:<identifier>` | the IP |

Trusting nothing is the safe default: the limiter then keys on the account
identifier alone, which an attacker cannot rotate. The cost is that five failed
sign-ins from anywhere will rate-limit that one identifier for five minutes —
the same trade-off the account lockout already made.

Setting a hop count restores per-client-IP granularity. The address is read from
the **right** of the chain because each trusted proxy appends the address it
received the request from; reading from the left (as the previous code did)
trusts whatever the client sent.

### Choosing the value

- Directly exposed (no proxy, e.g. `next start` on a public port): leave unset.
  Application code cannot see the socket address in this runtime, so there is no
  trustworthy IP to report.
- One nginx / Caddy / ALB / Cloudflare in front: `1`.
- CDN → load balancer → app: `2`.

Set it **only** to the real number of hops. A value larger than the true hop
count makes the app read an address the client supplied.

Malformed values (`abc`, `-1`, `1.5`, `99`) are treated as `0`, so a typo fails
closed rather than open.

### Trade-off to be aware of (availability)

Two public endpoints rate-limit by client IP before they have parsed a body:
`POST /api/auth/password-reset` (8/minute) and
`POST /api/invitations/accept` (10/minute). With no trusted proxy configured,
their key becomes the constant `untrusted`, so **all callers share one bucket**.

This is not a new failure mode — the previous code also produced one shared
bucket (`…:local`) for every request that arrived without an
`X-Forwarded-For` header — but it now applies to all traffic instead of the
uncommon case. In practice:

- security-wise it is strictly more restrictive: the old header-sending bypass
  is gone;
- availability-wise a busy deployment could see legitimate password-reset
  requests throttled, and in the worst case a single client could occupy the
  bucket and delay resets for everyone.

**Configure `TRUSTED_PROXY_HOPS` in any proxied deployment.** Doing so restores
per-client keys and removes the shared bucket entirely. A follow-up worth
considering (not implemented here, because it changes control flow in routes
that were not implicated by the audit) is to key these two limiters on the
subject being acted upon — the reset token or the invitation token — rather than
on the caller's address.

---

## 2. `PUBLIC_APP_URL` — the canonical origin for CSRF checks

**Finding closed:** F-02 (Medium) — the CSRF origin check compared `Origin`
against `x-forwarded-host`, so a caller could satisfy it by echoing its own
origin into that header.

The origin check now behaves as follows:

| Environment | Expected origin | On mismatch |
|---|---|---|
| production | `PUBLIC_APP_URL` (scheme + host + port must match exactly) | `403` |
| production, `PUBLIC_APP_URL` unset/invalid | — | `503`, fail closed |
| development / test | the `Host` header | `403` |

Production therefore **requires** `PUBLIC_APP_URL`. This was already enforced by
`server-env` and `staging:ready`, so no deployment that passed those checks is
affected. Behind a TLS-terminating proxy this is also what keeps the check
correct: the proxy rewrites `Host` to an internal address, and comparing against
the configured public origin still matches the browser's `Origin`.

`x-forwarded-host` is never consulted for this decision in any environment.

Requests with **no** `Origin` header are still allowed. Browsers always send
`Origin` on cross-site `POST`/`PUT`/`PATCH`/`DELETE`, so a missing header means a
non-browser client authenticated by its session cookie. This is unchanged,
documented behaviour (Phase 42 finding F-08), not a regression.

---

## 3. Security headers

| Header | Value | Notes |
|---|---|---|
| `Strict-Transport-Security` | `max-age=31536000` | Added in Phase 43. **No** `includeSubDomains`: whether sibling hostnames serve HTTPS is a deployment decision, and adding it unilaterally can take unrelated internal hosts offline. Add it once every subdomain is HTTPS-only. |
| `Content-Security-Policy-Report-Only` | see `next.config.mjs` | Added in Phase 43. Report-only, not enforcing. An enforcing policy needs nonce plumbing for Next's inline bootstrap scripts. |

HSTS is sent on every response. User agents ignore it over plain HTTP, so
HTTP-only development setups are unaffected, and a production deployment that is
mistakenly HTTP-only gets no benefit — which is exactly why TLS termination
must be verified independently.

---

## 4. Account lockout

**Finding closed:** F-03 (Medium) and F-06 (Low).

- The lock is now evaluated **before** the password comparison. Previously a
  locked account still answered wrong-password attempts; the lock only stopped
  the legitimate owner.
- Lockout settings are read from the **user's own organization**. Previously the
  first organization in the table governed every tenant.
- When an organization has no settings row, the schema defaults apply
  (`lockoutThreshold` 5, `lockoutMinutes` 15, `progressiveDelay` true). Lockout
  is no longer silently disabled in that case.

Trade-off to be aware of: a locked account now reports `403` to a wrong-password
attempt, which reveals that the account exists. That was already observable by
failing five times against an identifier; the rate limiter is the control that
bounds enumeration, not the lockout.

---

## 5. Tests

| Command | Scope | Needs |
|---|---|---|
| `npm run test:request-trust` | Policy unit tests + source guards for F-01/F-02/F-03/F-06/F-04/F-05 (23 cases) | nothing |
| `npm run test:auth-hardening-live` | Live HTTP regression suite (14 cases) | a running app + seeded disposable DB, `E2E_BASE` |

Both were validated in both directions: the live suite fails 4/14 against the
pre-Phase-43 code (reproducing the Phase 42 observations exactly) and passes
14/14 after the fix.

Running the live suite:

```bash
# disposable copy — never prisma/dev.db
cp prisma/dev.db /tmp/audit.db
SEED_TARGET_DB=/tmp/audit.db npx tsx e2e/seed.ts
DATABASE_URL=file:/tmp/audit.db STORAGE_LOCAL_ROOT=$PWD/e2e/storage npx next dev -p 4043
E2E_BASE=http://127.0.0.1:4043 npm run test:auth-hardening-live
```

The suite locks a fixture account by design; re-seed or clear `lockedUntil` on
the disposable database before running other suites against the same copy.
