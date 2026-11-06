# PHASE 43 — Final Report
## Security findings triage & targeted remediation

**Date:** 2026-10-25
**Scope:** remediation of the confirmed findings and material verification gaps recorded in `PHASE_42_FINAL_REPORT.md`.
**Not in scope:** redesign, deployment, staging access, production access, Phase 44.

---

## 1. Verdict

# `PHASE 43 PASS`

Every in-scope confirmed finding with a code-level remedy is **fixed and regression-tested**, and the full release gate passes on the supported runtime.

| Finding | Severity | Final status |
|---|---|---|
| F-01 — untrusted `X-Forwarded-For` defeated login rate limiting | **High** | **FIXED** — live regression, fails before / passes after |
| F-02 — untrusted `X-Forwarded-Host` satisfied the CSRF origin check | Medium | **FIXED** — live regression, fails before / passes after |
| F-03 — lockout evaluated after the password check | Medium | **FIXED** — live regression, fails before / passes after |
| F-04 — no HSTS | Medium | **FIXED** — header verified live |
| F-05 — no CSP | Low | **MITIGATED** — report-only policy; enforcement needs nonce plumbing (follow-up) |
| F-06 — lockout settings from an arbitrary organization, fail-open | Low | **FIXED** — unit test + source guard |
| F-07 — process-local rate limiter | Low | **DEFERRED** — architecture decision, out of scope (justified in §10) |
| F-08 — CSRF check skipped when `Origin` is absent | Info | **BY DESIGN** — unchanged, explicitly re-tested |

**What PASS means here.** It means the security defects this phase set out to fix are fixed and provably so. It does **not** mean the application is vulnerability-free: the XSS and browser-CSRF areas are still not tested (§6), `npm audit` was still not run, and **Phase 37 remains `BLOCKED`** on organizational staging inputs that do not exist.

---

## 2. Why Phase 42 was PARTIAL — and whether that reason is now resolved

Phase 42's verdict was driven by a single stated cause, quoted from its report:

> **One High finding (F-01) remains unresolved**, and per this phase's verdict rules a PASS requires no unresolved Critical or High findings.

The two material verification gaps attached to that finding were:

1. *"Proxy/ingress header sanitisation — NOT VERIFIED: no deployment manifest, no proxy config, no staging environment exists."*
2. *"No CI, no ingress configuration — exploitability of F-01/F-02 depends on an undocumented deployment topology."*

**Gap 1 is closed by changing the code's default, not by discovering the topology.** The application no longer needs to know what the proxy does in order to be safe: forwarded headers are ignored unless the operator explicitly declares `TRUSTED_PROXY_HOPS`. The unsafe dependency is gone rather than documented.

**Gap 2 remains genuinely open**, and is now recorded as an operator action (B16) rather than a defect: choosing the hop count is a deployment decision, and it is now safe to leave unset.

---

## 3. Findings inherited from Phase 42 — final status

| ID | Phase 42 status | Phase 43 status | Evidence |
|---|---|---|---|
| F-01 | Confirmed (live) | **Fixed** | `src/lib/request-trust.ts`, `login/route.ts:33`; live A1/A2 |
| F-02 | Confirmed (live) | **Fixed** | `src/lib/app-origin.ts`, `api.ts:69`; live C1–C4 |
| F-03 | Confirmed (live+static) | **Fixed** | `login/route.ts:47-59`; live B1–B3 |
| F-04 | Confirmed (live) | **Fixed** | `next.config.mjs`; live D1 |
| F-05 | Confirmed (live) | **Mitigated** | `next.config.mjs`; live D2. Report-only, not enforcing |
| F-06 | Confirmed (static) | **Fixed** | `security.ts:98-121`; unit test |
| F-07 | Confirmed (static) | **Deferred** | See §10 — requires a shared store; no evidence it is exploitable single-instance |
| F-08 | By design | **Unchanged** | Unit test pins the documented behaviour |

All findings were re-verified against current source before any edit; none had been silently fixed by earlier phases. Line numbers in the Phase 42 report were still accurate.

---

## 4. Vulnerabilities reproduced and fixed

### F-01 — High — Untrusted `X-Forwarded-For` defeated login rate limiting

**Root cause.** `login/route.ts:30` read `x-forwarded-for.split(",")[0]` — the *first*, i.e. client-supplied, entry — and used it in the rate-limit key `${ip}:${identifier}`. Rotating the header produced a fresh bucket per request. The same value was written to `loginAttempt` and audit rows, so an attacker could also choose which IP the log blamed.

**Fix.** New `src/lib/request-trust.ts`:

- `trustedProxyHops()` reads `TRUSTED_PROXY_HOPS`; unset, blank, malformed, negative or absurd values all resolve to **0** (trust nothing) — fail closed on misconfiguration.
- `clientIp()` returns `null` unless a hop count is configured, then takes the **Nth entry from the right** (each trusted proxy appends the address it received the request from). Entries are validated with `net.isIP`; hostnames, `ip:port`, `unknown` and header injection are rejected.
- `clientIpKey()` collapses unknown IPs to a constant, so the limiter keys on the identifier — which an attacker cannot rotate.

Applied at all eight `X-Forwarded-For` call sites (`login`, `password-reset`, `invitations/accept`, `mfa`, `security/impersonate`, `audit.clientIp`). `audit.clientIp` now records `unknown` rather than a caller-chosen address, because a forged IP in the audit trail is worse than an absent one.

**Live proof.**

| Run | Code | Behaviour |
|---|---|---|
| Phase 42 | pre-fix | 12 rotating-XFF attempts → **12 × 401, never throttled** |
| Phase 43 control | pre-fix (temporarily restored) | 12 rotating-XFF attempts → **12 × 401, never throttled** (reproduced exactly) |
| Phase 43 | fixed | **429 at attempt 6** |

Control case A1 (fixed header) throttles at attempt 6 in both, proving the limiter itself was never the problem.

### F-02 — Medium — `X-Forwarded-Host` satisfied the CSRF origin check

**Root cause.** `api.ts:67` compared `Origin` against `x-forwarded-host ?? host`. Both values are attacker-influenced, so `Origin: https://evil.example` plus `x-forwarded-host: evil.example` compared equal.

**Fix.** New `src/lib/app-origin.ts` holds one canonical-origin definition, already used by certificate links, now shared with the CSRF check:

| Environment | Expected origin | Failure |
|---|---|---|
| production | `PUBLIC_APP_URL` (full origin: scheme+host+port) | `403`, or `503` if unset/invalid |
| development / test | `Host` header | `403` |

`x-forwarded-host` is never consulted. `certificates/access.ts` was refactored to delegate to the same module (its error strings preserved verbatim), so there is no duplicated policy and no import cycle.

**Live proof.**

| Case | Pre-fix | Fixed |
|---|---|---|
| C1 `Origin: evil`, no XFH | 403 | 403 |
| **C2** `Origin: evil` + `XFH: evil` | **401 (bypass)** | **403** |
| C3 legitimate sign-in | 200 | 200 |
| **C4** legitimate sign-in *carrying* `XFH: evil` | **403 (false rejection)** | **200** |

C4 is a bonus defect the fix also removes: the old code rejected *legitimate* requests that merely carried the header, which would have broken any proxy that rewrites `X-Forwarded-Host`.

**Mitigating context, restated honestly:** at the time of Phase 42 this was not directly exploitable for CSRF because the session cookie is `SameSite=Lax`; it was recorded as latent and is now closed rather than latent.

### F-03 — Medium — Lockout did not throttle guessing

**Root cause.** `login/route.ts` checked `assertNotLocked` only *after* `bcrypt.compare`. A locked account still answered unlimited wrong-password attempts; the lock only stopped the legitimate owner. Phase 42 observed `failedLoginCount: 12`, `lockedUntil` set, and attempts 6–12 still processing.

**Fix.** The lock is evaluated immediately after the user lookup and before any password comparison; the now-redundant post-password check was removed.

**Live proof.** B2 isolates the ordering by presenting the wrong password through the account's **email** — a different rate-limit key, so the limiter cannot mask the lock:

| Case | Pre-fix | Fixed |
|---|---|---|
| B1 five failures | 401×5 | 401×5 |
| **B2** locked + **wrong** password | **401** | **403** |
| B3 locked + correct password | 403 | 403 |

**Accepted trade-off:** a locked account now returns `403` to a wrong-password attempt, revealing the account exists. That was already observable by failing five times; enumeration is bounded by the rate limiter, not by lockout ambiguity.

### F-04 — Medium — No HSTS  /  F-05 — Low — No CSP

`next.config.mjs` now emits `Strict-Transport-Security: max-age=31536000` **without** `includeSubDomains` (whether sibling hosts serve HTTPS is a deployment decision, and adding it unilaterally can take unrelated internal hosts offline) and `Content-Security-Policy-Report-Only`.

HSTS is sent unconditionally: user agents ignore HSTS received over plain HTTP, so HTTP-only development is unaffected. **F-05 is mitigation, not closure** — an enforcing policy needs nonce plumbing for Next's inline bootstrap scripts, which is a larger change than a targeted fix justifies. Verified live (D1/D2) and pinned by source guard.

### F-06 — Low — Lockout settings from an arbitrary organization, fail-open

`noteFailedLogin` used `organization.findFirst()` with no filter — the first tenant governed everyone — and did `if (!settings) return;`, silently disabling lockout entirely when that tenant had no settings row. Settings are now scoped to the user's own `organizationId`, and a missing row falls back to the schema defaults (`lockoutThreshold` 5, `lockoutMinutes` 15, `progressiveDelay` true) instead of disabling the control.

---

## 5. Regression tests added

Both suites were validated **in both directions**, as required.

### `scripts/test-request-trust.ts` — 23 cases, exit 0

Pure policy tests (no server, no DB, no network): hop-count parsing matrix, right-most-hop selection, chain-shorter-than-hops, non-IP rejection, IPv6, the F-02 spoof scenario, production fail-closed `503` without `PUBLIC_APP_URL`, downgrade `http` vs `https` canonical origin, loopback rejection. Plus source guards that fail if a future edit reintroduces a raw forwarded header, moves the lock check after the password comparison, or drops the headers.

Wired into the aggregate `npm test` chain.

### `scripts/test-auth-hardening-live.mjs` — 14 cases

Drives the real handler over HTTP. **Control run against the pre-fix code: 10 passed, 4 failed** — A2, B2, C2 and C4, precisely the four intended regression cases, with A2 reproducing Phase 42's "12 attempts, never throttled" verbatim. **Fixed code: 14/14, exit 0.**

Kept out of `npm test` (needs a running app + seeded DB), mirroring `test:idor-live`.

| ID | Asserts |
|---|---|
| A1/A2 | fixed / rotating `X-Forwarded-For` both throttle at attempt 6 |
| B1–B3 | lock engages; a locked account refuses wrong *and* correct passwords |
| C1–C4 | cross-origin blocked; XFH spoof blocked; legitimate sign-in unaffected; XFH presence not over-rejected |
| D1–D4 | HSTS + CSP-RO present, baseline headers retained, `X-Powered-By` suppressed |
| E1 | unauthenticated `/api/users` still 401 |

---

## 6. Verification gaps — closed and still open

### Closed

| Gap | How |
|---|---|
| Proxy header sanitisation (Phase 42: NOT VERIFIED) | Removed as a dependency: default is "trust nothing", so the answer no longer depends on unknown topology. Verified by unit + live tests. |
| Live behaviour of the origin check | Now exercised end-to-end, both fixed and pre-fix (C1–C4). |
| Lock ordering | Behavioural proof (B2) plus a source guard. |
| Header emission | Verified on a live response, not from config alone. |

### Still open

| Gap | Reason | Evidence needed |
|---|---|---|
| XSS execution | No browser harness in this environment | DOM/browser test run |
| CSRF via a real browser | `SameSite=Lax` reasoned statically; no browser | Browser-driven CSRF matrix |
| Dependency vulnerability scan | `npm audit` deliberately not enabled during `npm ci` | `npm audit --audit-level=high` review |
| Production `PUBLIC_APP_URL` / hop count in a real deployment | No deployment exists | Org staging (B1) |
| Nonce-based enforcing CSP | Larger change; out of scope | Follow-up phase |
| Multi-instance rate limiting (F-07) | Needs a shared store | Architecture decision |

**I have not claimed any external control as verified from local inspection.** The production origin path is unit-tested with synthetic configuration, not tested against a real proxy.

---

## 7. Commands executed

Runtime: **Node v22.23.3 / npm 10.8.2** (`runtime:check` exit 0).

| # | Command | Exit | Result |
|---|---|---|---|
| 1 | `npm run runtime:check` | **0** | runtime verified |
| 2 | `npm run typecheck` | **0** | clean (17 s) |
| 3 | `npm run test:request-trust` | **0** | 23/23 |
| 4 | `npm run test:staging-gate` | **0** | 27/27 |
| 5 | `npm run test:release-contracts` | **0** | 13/13, 38 scripts scanned |
| 6 | `npm run release:verify` | **0** | 2 m 6 s: typecheck + full chain + build |
| 7 | ↳ `test:session-rules` | 0 | passed |
| 8 | ↳ `test:book-import-preview` | 0 | passed |
| 9 | ↳ `test-production-env` | 0 | passed |
| 10 | ↳ `test:environment` | 0 | strict TLS required, S3 rejected, no secrets in messages |
| 11 | ↳ `test:db-tls` | 0 | 32/32 |
| 12 | ↳ `test:api-safety` | 0 | passed |
| 13 | ↳ `test:request-trust` | 0 | 23/23 |
| 14 | ↳ `test:staging-gate` | 0 | 27/27 |
| 15 | ↳ `test:release-contracts` | 0 | 13/13 |
| 16 | ↳ `build:safe` | 0 | compiled successfully in 45 s |
| 17 | `test:auth-hardening-live` (fixed code) | **0** | 14/14 |
| 18 | `test:auth-hardening-live` (pre-fix control) | **1** | 10/14 — 4 intended failures |
| 19 | `test:idor-live` | **0** | **50/50** cross-tenant |
| 20 | final re-confirm: request-trust / release-contracts / typecheck | 0 / 0 / 0 | after the last doc edit |

Rows 7–16 ran **inside** row 6; `typecheck`, `npm test` and `build:safe` were deliberately not run a second time standalone, and the build was run once.

### Two test-harness errors I made and corrected

- **IDOR suite first run: 48/50** — L05/L06 failed. Cause: I started the app with `STORAGE_LOCAL_ROOT=/tmp/p43_storage` while the seed writes media to `e2e/storage`, so the app legitimately 404'd on its own fixture media. My error, not a product regression. Restarted with the documented storage root → 50/50.
- **Unit-test helper: 3 false failures** — my comment-stripping guard matched its own prose, and the body extractor only understood `function NAME`, not `export const NAME =`. Both were defects in the *test*; fixed by stripping comments before scanning (the same lesson Phase 39 learned) and supporting `const` declarations. Assertions were not weakened.

---

## 8. Files modified

| File | +/− | Justification |
|---|---|---|
| `src/lib/request-trust.ts` | **new** 68 | F-01: single trusted-IP policy replacing eight ad-hoc header reads |
| `src/lib/app-origin.ts` | **new** 103 | F-02: single canonical-origin policy |
| `src/app/api/auth/login/route.ts` | +20/−8 | F-01 key, F-03 ordering |
| `src/lib/api.ts` | +11/−12 | F-02: delegate to `sameOriginDecision` |
| `src/lib/identity/security.ts` | +26/−3 | F-06 tenant scoping + fail-safe default |
| `src/lib/audit.ts` | +12/−4 | F-01: never record a caller-chosen IP |
| `src/lib/certificates/access.ts` | +8/−16 | dedupe onto the shared origin module (no cycle), stop reading XFH in dev |
| `src/app/api/mfa/route.ts` | +2/−1 | F-01: session IP |
| `src/app/api/security/impersonate/route.ts` | +2/−1 | F-01: session IP |
| `src/app/api/auth/password-reset/route.ts` | +2/−1 | F-01: rate-limit key |
| `src/app/api/invitations/accept/route.ts` | +2/−1 | F-01: rate-limit key |
| `next.config.mjs` | +24/−0 | F-04, F-05 |
| `scripts/test-request-trust.ts` | **new** 317 | regression tests |
| `scripts/test-auth-hardening-live.mjs` | **new** 251 | live regression suite |
| `package.json` | +3/−1 | wire the two suites |
| `.env.example` | +8/−0 | document `TRUSTED_PROXY_HOPS` |
| `docs/PHASE43_SECURITY_HARDENING.md` | **new** 140 | operator notes + trade-offs |

Every modified file traces to a confirmed finding or its regression test. No unrelated module was touched; no interface was redesigned; no established behaviour changed without a demonstrated security reason.

**Generated test fixtures changed** (disclosed, not application source): `e2e/fixtures.json` and `e2e/storage/**` were rewritten by `npx tsx e2e/seed.ts` during test setup. They are a consistent pair and are regenerated by that command; the versions found at the start were stale (their IDs matched no database — 0 of 4 present in `dev.db`). They reference a disposable DB that has been deleted; any live suite must re-seed per its documented contract.

---

## 9. Integrity results

| Check | Result |
|---|---|
| `prisma/dev.db` SHA-256 | `e9b4eac119cc44941d7cdea88c1429945fce40dd1ee7c548759bcfbc68f7fb02` — **byte-identical** |
| `package-lock.json` | `035df9a3…b66a76b48` — **unchanged** (no dependency added; both new modules use only `node:net`) |
| `.env` | parked during test runs, restored **byte-identical** (`6da80015…`), verified after restore |
| SQLite migrations | **4** — unchanged |
| PostgreSQL migrations | **5** — unchanged |
| `prisma/migrations.postgresql/MANIFEST.sha256` | **4/4 OK** |
| `.nvmrc` / `engines` | `22.23.3` / `>=22.13.0 <23.0.0` — **unchanged** |
| Secrets introduced | **none** |

The secret scan flagged three expected hits, all benign and all explained rather than suppressed: the synthetic e2e fixture password (`E2eOnly!Passw0rd#32`, identical to the constant already in `scripts/test-idor-live.mjs` and exported by `e2e/seed.ts`), a deliberately-wrong test password, and a pre-existing documentation placeholder URL in `.env.example`.

No schema change was made, so no migration was proposed or needed. Disposable artifacts (`/tmp/p43_audit.db`, test storage, logs, the throwaway lock-clearing helper) were deleted; no server remains listening on 4032/4042/4043.

---

## 10. Remaining risks, dependencies and next actions

### Risks accepted in this phase

| # | Risk | Why accepted |
|---|---|---|
| R1 | **F-05 CSP is report-only.** An XSS would not be blocked by CSP. | Enforcing CSP needs nonce plumbing; React escapes by default and no `dangerouslySetInnerHTML` was found in the reviewed surface. |
| R2 | **Shared limiter bucket.** With no hop count configured, `password-reset` (8/min) and `invitations/accept` (10/min) collapse onto one key for all callers. | Strictly *more* restrictive than before (the header bypass is gone), but it is an availability trade-off: a busy site could see legitimate resets throttled. Documented in `docs/PHASE43_SECURITY_HARDENING.md`. Fixed by configuring `TRUSTED_PROXY_HOPS`. |
| R3 | **Locked accounts disclose existence via `403`.** | Failing five times already disclosed it; the rate limiter is the anti-enumeration control. |
| R4 | **Audit IPs read `unknown`** when no proxy is configured. | The application cannot see the socket address in this runtime; a forged IP is worse than none. Restored by `TRUSTED_PROXY_HOPS`. |
| **R5** | **F-07 deferred — the limiter is process-local.** Counters reset on restart and are not shared across instances, so N instances allow N× the attempts. | The fix is a shared store (Redis), an architecture decision with cost implications. No evidence single-instance deployment is affected. **Must be revisited before any horizontal scaling.** |

### External dependencies (owner: organization) — unchanged

B1 staging PG endpoint · B2 written authorization · B3 CA + matching SAN · B4 least-privilege role · B5 tooling URL · B6 storage decision (15 `PENDING`) · B7 durable volume + file-backup proof · B8 deployment target · B9 orchestrator probes · B10 timeout values · B11 separate restore DB · B12 durability · B13 ≥4 GB RAM · B14 no GPG verification · B15 no Git/CI.

**New this phase:**

| # | Blocker | Owner | Evidence required to close |
|---|---|---|---|
| **B16** | Only the operator knows the real proxy hop count and public origin | Org / platform | Record `TRUSTED_PROXY_HOPS` and `PUBLIC_APP_URL` per environment; confirm with a known client IP in the audit trail |

### Next actions, in order

1. **Operator:** set `PUBLIC_APP_URL` and `TRUSTED_PROXY_HOPS` per environment (B16). Production already fails closed without the former.
2. Consider keying the two public limiters on the subject token instead of the caller address, removing R2 entirely.
3. Run `npm audit --audit-level=high` and review advisories — the one audit area still untouched across Phases 42–43.
4. Add a browser-driven XSS/CSRF harness to close the two remaining test gaps.
5. Revisit F-07 / R5 before any multi-instance deployment.
6. Phase 37 stays blocked until B1–B11 are supplied.

---

### Safety boundaries honoured

No production access. No organizational staging connection. No migrations, resets, backups or restores. No external storage uploads. No deployment or publication. No change to `prisma/dev.db`, migration histories, `MANIFEST.sha256`, `package-lock.json`, `.nvmrc` or the Node engine policy. No TLS, authentication, authorization, validation or security check weakened — the security posture is strictly tighter on every axis touched. No secrets printed or committed. No historical report rewritten. No Git initialization and no CI provider. No destructive testing against external systems. All state-changing tests ran against a disposable SQLite copy that was deleted afterwards. Phase 44 not started.
