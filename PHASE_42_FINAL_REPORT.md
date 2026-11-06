# PHASE 42 — Final Report
## Application security & release-boundary audit (read-only)

**Date:** 2026-10-25
**Scope:** evidence-based, read-only audit of authentication, authorization, tenant isolation, upload handling, secret/sensitive-data handling, error handling, security headers, runtime/release scripting, and the release boundary.
**Not in scope:** remediation, redesign, deployment, staging access, production access.

---

## 1. Verdict

# `PHASE 42 PARTIAL`

The audit scope was completed and every control was either verified by execution or by direct inspection. **One High finding (F-01) remains unresolved**, and per this phase's verdict rules a PASS requires no unresolved Critical or High findings. That is the whole reason for PARTIAL — not incomplete work.

| Reason | Effect |
|---|---|
| **F-01 (High)** — authentication rate limiting is defeatable by a client-supplied header; **demonstrated live** | Blocks PASS |
| F-02/F-03 (Medium) — CSRF origin check spoofable; account lockout does not throttle guessing | Additional non-blocking findings |
| No CI, no ingress configuration — exploitability of F-01/F-02 depends on an undocumented deployment topology | Scope limitation |

**This is not a clean bill of health.** The application has genuinely strong controls (§7) — session validation, tenant isolation, upload validation and error handling are better than typical. It also has a real, reproducible weakness in its brute-force defence.

---

## 2. Scope and environment

| Item | Value |
|---|---|
| Runtime used | **Node.js v22.23.3 / npm 10.8.2** (provisioned via `npm run runtime:setup`) |
| Database | **Disposable SQLite copy** `/tmp/p42_audit.db` (byte-copy of `prisma/dev.db`) |
| Original `dev.db` | **Never written to** — hash unchanged before and after |
| Application | `next dev` on `127.0.0.1:4042`, local storage root, disposable DB |
| Tests | 50-case live IDOR suite + repository security suites |
| Production / staging | **Not contacted. Do not exist for this project.** |

### Environment note — carried over from Phase 41, now proven

`node_modules` and the Phase 41 runtime install were **both absent** at the start of this session:
`.local` is excluded from snapshots and `node_modules` is a generated directory. Phase 41's durability caveat is therefore not theoretical — it was observed. Re-provisioning cost: ~6 s for the runtime, ~22 s for `npm ci`.

---

## 3. Executive summary

The application's **authorization** posture is strong. Tenant isolation held across all 50 live IDOR cases. Every unauthenticated API endpoint tested returned 401. Role checks are server-side, not UI-only. Upload validation inspects file *contents* (magic bytes), not just the `Content-Type` header. Session handling re-validates against the database on every request, including revocation, expiry, password-version and session-version pinning. Error handling is sanitized. There is no SQL-injection surface.

The **abuse-resistance** posture is the weak point. The application trusts `X-Forwarded-For` and `X-Forwarded-Host` from any caller, and no trusted-proxy configuration exists anywhere in the repository. This was demonstrated live to defeat both the login rate limiter and the CSRF origin check. Separately, the account-lockout control is evaluated *after* password verification, so it never actually throttles password guessing.

Defence-in-depth is also incomplete at the transport layer: no HSTS, no CSP.

---

## 4. Findings by severity

| ID | Severity | Title | Status |
|---|---|---|---|
| **F-01** | **High** | Untrusted `X-Forwarded-For` defeats login rate limiting (and poisons audit-log IP) | **CONFIRMED** (live) |
| **F-02** | **Medium** | Untrusted `X-Forwarded-Host` lets an attacker satisfy the CSRF origin check | **CONFIRMED** (live) |
| **F-03** | **Medium** | Account lockout is evaluated after password verification — it does not throttle guessing | **CONFIRMED** (live + static) |
| **F-04** | **Medium** | No `Strict-Transport-Security` header | **CONFIRMED** (live) |
| **F-05** | **Low** | No `Content-Security-Policy` header | **CONFIRMED** (live) |
| **F-06** | **Low** | Lockout settings are read from an arbitrary organization, not the user's | **CONFIRMED** (static) |
| **F-07** | **Low** | Rate limiter is process-local (resets on restart, not shared across instances) | **CONFIRMED** (static, documented) |
| **F-08** | **Info** | CSRF origin check is skipped entirely when `Origin` is absent | **BY DESIGN** (documented) |

No Critical findings. No confirmed injection, XSS, path-traversal, IDOR or privilege-escalation findings.

---

## 5. Detailed evidence

### F-01 — High — Untrusted `X-Forwarded-For` defeats login rate limiting

**File / route**
- `src/app/api/auth/login/route.ts:30` — `const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";`
- `src/app/api/auth/login/route.ts:32` — `const key = \`${ip}:${identifier}\``
- Same pattern at `src/app/api/auth/password-reset/route.ts:13`, `src/app/api/invitations/accept/route.ts:8`, and `src/app/api/mfa/route.ts:27` (session IP attribution).

**Evidence (executed, not inferred)** — two runs against the same disposable instance, same account, same wrong password:

| Run | Header sent | Result |
|---|---|---|
| Control | fixed `x-forwarded-for: 203.0.113.10` | 401 ×5, then **429** at attempts 6–8 |
| Attack | rotating `x-forwarded-for: 198.51.100.N` | **12 × 401 — never throttled** |

The limiter itself works. Its input is attacker-controlled.

**Supporting static evidence:** `grep` for any trusted-proxy configuration (`TRUSTED_PROXY`, `trustProxy`, XFF allowlist) across `src/`, `next.config.*` and `docs/` returns **nothing**. Phase 29 recorded this as *"proxy sanitization is NOT VERIFIED"*; it is now confirmed as unhandled.

**Attack scenario.** An unauthenticated attacker submits guesses while varying the header. Because the key is `ip:identifier`, every request lands in a fresh bucket. The audit trail records the spoofed value, so `recordLoginAttempt` / `recordSecurityEvent` attribute the attack to arbitrary IPs — forensic evidence becomes unreliable. Exploitability depends on the ingress: if a proxy **overwrites** XFF the first value is genuine; the common `$proxy_add_x_forwarded_for` configuration **appends**, leaving the client value first. The repository contains no ingress configuration, so this cannot be ruled out — and F-01 is exploitable by default if the app is exposed directly.

**Why High, not Critical.** Bcrypt cost 12 and the progressive delay (≤1.5 s) still bound the rate, and no credential compromise was demonstrated.

**Remediation.** Read the peer address from the socket/trusted layer; honor `X-Forwarded-For` only when the immediate peer is in an explicitly configured trusted-proxy list, and take the *right-most untrusted* hop rather than `split(",")[0]`. Fail closed to a single shared bucket when the peer is untrusted.

**Regression test required.** Fixed XFF → 429 after 5 failures; rotating XFF from an untrusted peer → still 429 after 5 failures; rotating XFF from a configured trusted proxy → distinct buckets. Assert the stored audit IP is not client-controlled.

---

### F-02 — Medium — Untrusted `X-Forwarded-Host` satisfies the CSRF origin check

**File** — `src/lib/api.ts:67` — `const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");`

**Evidence (executed):**

| Request | Result |
|---|---|
| `Origin: https://evil.example` (no XFH) | **403** — "cross-origin requests are not allowed" |
| `Origin: https://evil.example` + `x-forwarded-host: evil.example` | **401** — origin check passed, reached password logic |

**Attack scenario.** The "same-origin" comparison compares two attacker-influenced values, so it is only meaningful when the peer is trusted. **Currently mitigated**: the session cookie is `SameSite=Lax` + `httpOnly`, and Lax prevents the cookie being sent on cross-site POST, so this is not directly exploitable for CSRF today. It is a **latent** finding: if `SameSite` is ever relaxed to `None` (a common change for embedded/third-party flows), this becomes an exploitable CSRF bypass.

**Remediation.** Compare `Origin` against a configured canonical public origin (`PUBLIC_APP_URL`), not against a request header.

**Regression test required.** With a configured `PUBLIC_APP_URL`, a mismatched `Origin` must be rejected even when `x-forwarded-host` matches it.

---

### F-03 — Medium — Account lockout does not throttle password guessing

**File** — `src/app/api/auth/login/route.ts:45–57`

```ts
// src/app/api/auth/login/route.ts (ordering, abridged — recordLoginAttempt/
// recordSecurityEvent lines elided, logic preserved)
const passwordOk = user ? await bcrypt.compare(body.password, user.passwordHash) : false;
if (!user || !passwordOk) {              // ← wrong password exits HERE
  recordLoginFailure(key);               //    (per-IP limiter, see F-01)
  if (user) await noteFailedLogin(user.id);   // increments failedLoginCount → sets lockedUntil
  await recordLoginAttempt({ …, reason: "invalid" });
  await recordSecurityEvent("LOGIN_FAILED", { userId: user?.id, ip });
  throw new ApiError(401, "Incorrect username or password.");
}
try {
  await assertNotLocked(user);           // ← lock consulted only AFTER a CORRECT password
} catch (err) { … }
```

**Evidence (executed + database state).** After the 12-attempt run, the account state in the disposable DB was `failedLoginCount: 12`, `lockedUntil: 2026-10-25T18:19:16Z` — the lock **did** engage at the threshold of 5. Yet attempts 6–12 all returned **401**, not 403. The lock is never consulted while guessing.

**Attack scenario.** Lockout only stops the legitimate user from signing in; it does not slow an attacker, who may keep guessing indefinitely (bounded only by the ≤1.5 s progressive delay and by F-01's bypass of the per-IP limiter). It also creates an account-lockout denial of service: an attacker can lock any known account with 5 bad guesses while continuing to attack it.

**Remediation.** Evaluate lock state before the password comparison, returning the same generic message (to avoid account enumeration) and the same timing profile. Alternatively, count guesses against the account and apply an exponential backoff that is enforced pre-comparison.

**Regression test required.** Locked account + wrong password → throttled (429/403), and the correct password is rejected while locked.

---

### F-04 — Medium — No `Strict-Transport-Security`

**File** — `next.config.mjs` `headers()`. Verified live on `GET /login`:

```
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
X-Frame-Options: SAMEORIGIN
Permissions-Policy: camera=(), geolocation=(), microphone=(self)
— no Strict-Transport-Security
```

**Scenario.** A first-visit or downgrade attack (SSL-stripping) can keep a session on HTTP; there is no HSTS to force HTTPS, and the session cookie's `Secure` flag only protects once HTTPS is in use.

**Remediation.** Add `Strict-Transport-Security: max-age=…; includeSubDomains` **after** confirming every host serves HTTPS — enabling it prematurely on a mixed-content origin will break HTTP access.

**Regression test required.** Assert the header is present in production configuration.

---

### F-05 — Low — No `Content-Security-Policy`

Same file; confirmed absent live. React escapes by default and no `dangerouslySetInnerHTML` was found in the reviewed surface, so XSS impact is reduced — but CSP is the backstop if one is ever introduced.

**Remediation.** Roll out a report-only policy first; tighten to enforcement once violation reports are clean.

---

### F-06 — Low — Lockout settings come from an arbitrary organization

**File** — `src/lib/identity/security.ts:99` — `const org = await prisma.organization.findFirst({ include: { settings: true } });`

There is no `where` clause, so the **first** organization's settings apply to every user regardless of tenant. Additionally `if (!settings) return;` makes the whole lockout a silent no-op when no organization has settings — a **fail-open** security control.

**Scenario.** In a multi-tenant deployment, tenant A's thresholds govern tenant B; and a deployment whose organizations lack settings rows has no account lockout at all, silently.

**Remediation.** Scope the lookup to the user's `organizationId`; when settings are absent, apply a safe built-in default rather than returning early.

**Regression test required.** A user in org B is governed by org B's threshold; absent settings still enforce the default.

---

### F-07 — Low — Rate limiter is process-local

**File** — `src/lib/rate-limit.ts:1–10` — in-memory `Map` on `globalThis`; the limitation is honestly documented in the file header.

**Scenario.** Counters reset on every restart/deploy (an attacker can wait out a limit) and are not shared across instances (N instances = N × the allowed attempts). Compounds F-01.

**Remediation.** Move to a shared store when the deployment becomes multi-instance. No change is needed for a single-instance deployment — do not add a dependency speculatively.

---

### F-08 — Informational — CSRF check skipped when `Origin` is absent

**File** — `src/lib/api.ts:64–66` — `if (!origin) return;`

This is **documented as intentional** (non-browser clients authenticated by cookie carry no `Origin`), and `SameSite=Lax` is the primary control. Recorded for completeness, not as a vulnerability. Worth revisiting alongside F-02.

---

## 6. Commands executed and results

All under **Node v22.23.3 / npm 10.8.2**, disposable SQLite, loopback only.

| # | Command / action | Exit / status | Result |
|---|---|---|---|
| 1 | `node scripts/runtime/setup-node.mjs` (runtime absent) | 0 | provisioned + checksum-verified |
| 2 | `npm ci --no-audit --no-fund` | **0** | 232 packages, 22 s; lockfile unchanged |
| 3 | `npm ls --depth=0` | 0 | tree consistent |
| 4 | `cp prisma/dev.db /tmp/p42_audit.db` + `e2e/seed.ts` | 0 | disposable fixtures written |
| 5 | `next dev` on :4042 (disposable DB) | running → stopped | app served; stopped and removed after |
| 6 | **Rate-limit control** — 8 logins, fixed XFF | — | 401×5 then **429**×3 |
| 7 | **Rate-limit attack** — 12 logins, rotating XFF | — | **401×12, never throttled** → F-01 |
| 8 | DB inspection of lockout state | 0 | `failedLoginCount:12`, `lockedUntil` set → F-03 |
| 9 | **CSRF control** — `Origin: evil`, no XFH | **403** | blocked |
| 10 | **CSRF bypass** — `Origin: evil` + `XFH: evil` | **401** | check passed → F-02 |
| 11 | Live IDOR suite (50 cases) | **0** | **50 passed / 0 failed** |
| 12 | Unauthenticated API probes (`/api/users`, `/api/admin/backups/list`, `/api/organizations`, `/api/roles`) | — | **401** on all |
| 13 | Header inspection on `GET /login` | — | 4 headers present, HSTS/CSP absent → F-04, F-05 |
| 14 | Upload: `.svg` (blocked extension) | **400** | "File type .svg is blocked" |
| 15 | Upload: HTML body as `.png` | **400** | "File contents do not match extension" (magic-byte check) |
| 16 | Upload: `filename=../../../../etc/evil.png` | **400** | rejected at content check; key sanitizer also neutralises |
| 17 | Student → upload endpoint | **403** | server-side role denial |
| 18 | `npm test` | **0** | all suites; gate 27/0, contracts 13/0 |

**Honest notes.**

- Row 11 initially failed with `login failed for e2e.teacher.a: 403 account locked`. **Cause: my own row-7 brute-force test had locked that account** in the disposable DB. I cleared the lock and re-ran. That is a test-harness side effect, **not a product defect** — reported here rather than silently retried into a pass.
- No test was re-run to convert a failure into a pass. No assertion was weakened.
- The app was stopped before cleanup; no server remains running.

---

## 7. Controls verified, and controls not verified

### Verified — by execution

| Control | Evidence |
|---|---|
| Tenant isolation / IDOR resistance | 50/50 live cases, cross-tenant reads/writes denied |
| Server-side authorization for privileged ops | student→upload 403; `users.impersonate` permission gate; `POST /api/roles` 403 |
| Unauthenticated access denied | 401 across all sampled API routes |
| Upload validation enforced server-side | blocked extension, magic-byte mismatch, traversal filename all rejected |
| Login rate limiter functions at all | fixed-XFF control returned 429 |
| Security headers partially present | nosniff, referrer, frame-options, permissions-policy |
| `X-Powered-By` suppressed | `poweredByHeader: false`, absent live |
| Error responses sanitized | generic messages + `requestId`, no stack traces |

### Verified — by static inspection

| Control | Evidence |
|---|---|
| Session re-validated per request against DB | `getSessionUser` checks status, password version, `sessionVersion`, session revocation/expiry, impersonation expiry — `src/lib/auth.ts:145` |
| Password hashing strength | bcrypt cost **12** (`src/lib/identity/service.ts:13`) |
| No SQL injection surface | only 2 raw queries, both static `SELECT 1`; no `$queryRawUnsafe`/`$executeRawUnsafe` anywhere |
| Path traversal defence in storage | `validateObjectKey` + `resolveSafePath` re-checks after `path.resolve` (`src/lib/storage/keys.ts`) |
| Logging does not leak | `logSafeError` emits `{level,event,errorType}` only (`src/lib/logging.ts`) |
| No hardcoded secrets in `src/` | pattern scan negative; `.env.example` uses explicit placeholders |
| Open-redirect defence | `safeInternalPath` rejects non-`/`, `//`, and backslash (`src/lib/utils.ts:56`) |
| Release boundary intact | contract suite: no `db push`/`migrate reset`/`--accept-data-loss`; `release:verify` touches no migrate/backup/deploy |
| Runtime bootstrap hardened | verify-checksum-before-extract, no `eval`/`sudo`/`shell:true`, cleanup on every exit path, 120 s transfer timeout |
| MFA brute-force limiter | used and keyed by `userId` (not spoofable) — `src/lib/identity/mfa.ts:70` |

### Not verified — with reasons

| Area | Status | Reason |
|---|---|---|
| Proxy/ingress header sanitisation | **NOT VERIFIED** | no deployment manifest, no proxy config, no staging environment exists |
| XSS (executed) | **NOT TESTED** | no browser harness; static review only |
| CSRF (browser-executed) | **NOT TESTED** | `SameSite=Lax` mitigation reasoned statically; no browser available |
| Organisational staging security posture | **BLOCKED** | Phase 37 inputs still absent |
| DoS / load behaviour of the limiter | **NOT TESTED** | out of scope; requires load generation |
| Dependency vulnerability scan | **NOT RUN** | `npm audit` deliberately not enabled during install; registry advisory data not reviewed this phase |

---

## 8. Recommended remediation plan (ordered by risk × dependency)

1. **F-01 — trusted-proxy handling** *(High, no prerequisites)*. Derive the client IP from the socket unless the peer is an explicitly configured proxy. Do **not** ship a hardcoded allowlist invented here — the trusted proxy set is a deployment decision.
2. **F-03 — enforce lockout before password comparison** *(Medium, no prerequisites)*. Small, contained change in `login/route.ts`; do it with F-01 since both are authentication-throttling.
3. **F-02 — canonical origin for CSRF** *(Medium, needs `PUBLIC_APP_URL` to be authoritative)*. Pairs naturally with any reverse-proxy work.
4. **F-06 — tenant-scoped lockout settings + fail-safe default** *(Low, no prerequisites)*.
5. **F-04 — HSTS** *(Medium, **gated** on confirming HTTPS everywhere)*. Enabling this against an HTTP origin causes an outage.
6. **F-05 — CSP** *(Low, roll out report-only first)*.
7. **F-07 — shared rate-limit store** *(Low, **only** when the deployment is multi-instance)*. Adding Redis now would be speculative.

Each fix carries the regression test named in §5. **None was applied in this phase** — the phase is read-only with respect to application source, and F-01's fix depends on a deployment topology decision the organisation has not made.

---

## 9. Integrity results

| Check | Result |
|---|---|
| `prisma/dev.db` SHA-256 | `e9b4eac119cc44941d7cdea88c1429945fce40dd1ee7c548759bcfbc68f7fb02` — **identical** |
| `package-lock.json` | `035df9a385770ec2fa4494ccb531b507a0cef01e3710d5babd20bc5b66a76b48` — **unchanged** |
| `.env` | parked for the audit run, **restored and hash-verified** (`6da800151ba6962c…`) |
| SQLite migrations | **4** — unchanged |
| PostgreSQL migrations | **5** — unchanged |
| `MANIFEST.sha256` | **4/4 verified** — unchanged |
| `src/**` modified | **0 files** — basis stated below |
| Disposable DB | `/tmp/p42_audit.db` created, used, **deleted** |
| Secret exposure | **none** — no credential, key, or token printed or introduced |

**On the "0 files modified" claim — stated precisely, because the obvious method does not work.**
Phase 41 disclosed that `find -newermt "today"` silently matches nothing and is therefore worthless as evidence. This phase did not reuse it. The substitute method is also imperfect and is reported as such:

- There is **no committed hash manifest for `src/`**, so a byte-level comparison against a known-good state **was not possible**. That must be said plainly rather than papered over.
- What *was* measured: all **611** files under `src/` carry **exactly one mtime** (`2026-10-25 18:01:36`), the snapshot-restore timestamp, and **zero** files have an mtime after `18:02:00` — i.e. nothing in `src/` was written at any point during the audit.
- What this does **not** prove: that `src/` matches some earlier known-good state. A file altered *before* this session and carried in by the snapshot would look identical by this measure.

The strongest available statement is therefore: **this phase wrote nothing to `src/`** (all audit actions were reads, plus writes confined to `/tmp` and this report), and no file in `src/` was touched after the session began. That is evidence of *this phase's* read-only discipline, not an integrity proof of the repository itself — an unqualified "0 files modified" would overstate it.

### Environment changes made (disclosed)

| Change | Why | Reversible |
|---|---|---|
| Re-provisioned Node 22 into `~/.local` | absent at session start (Phase 41 finding confirmed) | yes — `rm -rf`, or just re-run |
| `npm ci` (~764 MB tree) | `node_modules` absent at session start | yes — generated |
| **2 GB swap file created and enabled** | `npm ci` OOMs without it on this 1,982 MB box | yes — `sudo swapoff /swapfile && sudo rm /swapfile` |
| `/tmp/p42_audit.db`, test payloads | audit fixtures | deleted |
| `.env` parked/restored | make the app use the disposable DB | restored, hash-verified |

---

## 10. Remaining blockers

### Application security (new, from this audit)

| # | Blocker | Owner | Next action |
|---|---|---|---|
| S1 | F-01 remediation requires knowing the ingress/trusted-proxy topology | Organization / platform | Decide the proxy layer, then implement trusted-proxy parsing |
| S2 | F-04 HSTS requires confirmed HTTPS-only origin | Organization / ops | Confirm all hosts serve HTTPS |
| S3 | Several controls can only be validated against a real deployment | Organization | Resolve Phase 37 staging inputs |

### Organizational staging — unchanged, still blocking Phase 37

| # | Blocker | Owner |
|---|---|---|
| B1 | No non-production PostgreSQL endpoint | Organization / platform |
| B2 | No written authorization for that database | Staging DB owner |
| B3 | No organizational CA certificate | Organization / PKI |
| B4 | No least-privilege application role | DBA |
| B5 | No libpq tooling connection | DBA |
| B6 | Storage decision unresolved (15 `PENDING` fields) | Organization |
| B7 | No persistent volume / file-snapshot plan | Organization / ops |
| B8 | No approved deployment target | Organization / ops |
| B9 | Probe wiring unverified in any orchestrator | Organization / ops |
| B10 | Timeout / connection-limit values unset | DBA |
| B11 | No separate disposable restore target | Organization / platform |
| B15 | No Git repository and no CI — no security check is enforced automatically | Organization |

**Phase 37 remains `BLOCKED`.** A green release chain and a clean `npm test` are **not** staging readiness and **not** proof the application is secure.

---

### Standing constraints honoured

No production access. No staging connection. No migration, reset, backup, restore or upload to external storage. No deployment or publication. No Git repository or CI provider created. No credentials, CA certificates or environment values fabricated. No authentication, authorization, TLS or validation weakened. No schema, migration, lockfile, engine policy or `MANIFEST.sha256` change. No historical report rewritten. Application source **unchanged** — findings and proposed patches are recorded, not applied. No destructive exploitation against any external system. Phase 43 not started.
