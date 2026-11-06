# PHASE 39 — Final Report
## Staging deployment contract, CI safety guards & release verification

**Date:** 2026-10-25
**Preceding state:** Phase 37 `BLOCKED` · Phase 38 `PASS — BOUNDED VERIFICATION SCOPE`
**Scope:** repository-level release safety only. No staging provisioned, nothing deployed, no migration run, no organizational acceptance claimed.

---

## 1. Verdict

# `PHASE 39 PARTIAL`

**Delivered and verified:** every repository-level safeguard this phase could implement without
organizational infrastructure — a single release-verification entry point, 13 new contract assertions
covering three demonstrable gaps, the CI decision with rationale, and reconciliation of the operational
docs. All validation is green and all integrity constraints were preserved.

**Why not PASS:** the repository declares `engines.node >= 22.13.0 <23.0.0` and `.nvmrc` 22.23.3, but
this environment runs **Node 20.20.2**. Every result in this report — and in Phases 36–38 — was
produced on a runtime the project does not support. The release gate has therefore **not been
exercised on the runtime the repository requires**, and calling that a full PASS would be an
unsupported claim of exactly the kind these phases exist to prevent.

Two secondary items also remain non-automatable (§6), so PARTIAL is the accurate verdict.

**What this is not:** not a Phase 37 pass, not staging readiness, not a deployment authorization.

---

## 2. Baseline and final validation results

Environment: **repository only** — no network, no database server, no staging. Node 20.20.2 (see §1).

| Command | Baseline (before changes) | Final (after changes) |
|---|---|---|
| `npm run release:verify` | *did not exist* | exit **0** (typecheck → test chain → build, ~101 s) |
| `npm run staging:ready` | exit **2** — 18 checks: 0 ready / 7 blocked / 11 skipped | exit **2** — **identical**, same 7 blocked / 11 skipped |
| `npm run typecheck` | exit **0** | exit **0** |
| `npm test` | exit **0** | exit **0** — now includes `test:release-contracts` |
| `npm run test:staging-gate` | 27 passed / 0 failed | 27 passed / 0 failed (unchanged) |
| `npm run test:release-contracts` | *did not exist* | **13 passed / 0 failed** |
| `npm run build:safe` | *did not exist* (equivalent command run manually) | exit **0** |
| Existing suites (db-tls / storage / backup / environment / api-safety) | all green | all green, unchanged |

The readiness gate is blocked for **exactly the same genuine reasons** as Phase 38 — no organizational
input appeared, and none was fabricated to make it return zero.

---

## 3. CI decision and rationale

**Decision: no provider-specific CI workflow was added.** A provider-neutral validation entry point was
added instead, as the phase instructions allow.

Rationale, in priority order:

1. **This is not a git repository.** `.git` is absent and no remote is configured. A GitHub Actions
   workflow — or any VCS-triggered pipeline — could not run here and could not be verified. Adding one
   would create a file that *looks* like enforcement while enforcing nothing: the precise failure mode
   these phases keep finding.
2. **No CI provider is evidenced anywhere.** No `.github/`, no provider config, no deployment manifest.
   Choosing GitHub Actions would invent an organizational infrastructure decision, which the standing
   constraints forbid.
3. **The protective value is available now without that guess.** `npm run release:verify` runs the same
   checks a pipeline would, is verifiable in this environment today, and is provider-neutral: any CI
   system can call it as a single step.

**Provider-neutral sequence** (usable by any CI system, or by a human before a release):

```bash
# 1. deterministic dependency install (lockfile is present: package-lock.json, lockfileVersion 3)
npm ci

# 2. release verification — types, full test chain, production build
npm run release:verify
```

Requirements for whatever orchestrates this: **Node 22.13–22.x** (`engines` + `.nvmrc`), **no secrets**
(the chain needs none), and **no network access beyond dependency install** — the suite contacts no
database or remote service.

**No YAML was committed.** The two alternatives were not added together.

---

## 4. New or modified files

| File | Change | Reason |
|---|---|---|
| `scripts/test-release-contracts.ts` | **new** (13 assertions) | Covers the three gaps no existing suite covered: gate determinism/ordering, destructive-command scanning of the release path, and liveness/readiness separation. |
| `package.json` | **modified** | Added `release:verify`, `build:safe`, `test:release-contracts`; appended the new suite to the aggregate `test` chain. |
| `_STAGING_RUNBOOK.md` | **modified** | Added a "Release verification" section stating that `release:verify` is not a staging check and not a deployment gate. |
| `PHASE_39_FINAL_REPORT.md` | **new** | This report. |

**Not changed:** every file under `src/` (**0 files modified**), the Prisma schema, both migration
trees, `MANIFEST.sha256`, `PHASE_37_*`/`PHASE_38_*` reports, and `dev.db`.

**Design of `release:verify`:**

```
npm run release:verify  =  npm run typecheck && npm test && npm run build:safe
```

- `&&` chaining means any stage's non-zero exit aborts the run and propagates.
- It does **not** require staging credentials, does **not** read the staging gate, and contains no
  `migrate` / `pg_dump` / `pg_restore` / `deploy` / `publish` token — asserted by the contract suite.
- `build:safe` sets `NODE_OPTIONS=--max-old-space-size=1400`, the documented memory-safe build.
  It is POSIX-shell syntax; a Windows contributor would need to set `NODE_OPTIONS` manually.

---

## 5. Safety contracts tested and evidence

Only gaps were tested — existing coverage was verified and deliberately **not** duplicated.

| Contract | Test | Result |
|---|---|---|
| **A1.** Gate output is deterministic | two identical runs, byte-compared stdout | **PASS** — identical output and exit code |
| **A2.** All 18 checks always emitted, in documented order | order compared to the 18-item list | **PASS** — exact order match |
| **A3.** Incomplete configuration never yields a ready check | empty env | **PASS** — 0 ready, 7 blocked, 11 skipped |
| **C1.** No `package.json` script invokes a destructive command | regex scan across all scripts | **PASS** — 34 scripts scanned, 0 offenders |
| **C2.** No executable script under `scripts/` does either | recursive scan of `.mjs/.js/.cjs/.ts/.mts` | **PASS** — 0 offenders |
| **C3.** `release:verify` runs the real suites and needs no staging config | structural assertion on the chain | **PASS** |
| **C4.** `release:verify` runs no migration/backup/restore/deploy | token assertion | **PASS** |
| **E1.** Liveness performs no I/O | import + comment-stripped source analysis | **PASS** — 1 import (`next/server`), zero `await`, correct headers |
| **E2.** Readiness reports unavailable on dependency failure | source: `HEALTHY ? 200 : 503`, no `catch` swallowing | **PASS** |
| **E3.** Handlers are distinct modules | file comparison | **PASS** |
| **E4.** Healthy DB + usable storage → 200 | `getSystemHealth()` with temp SQLite + writable root | **PASS** — HEALTHY/HEALTHY → 200 |
| **E5.** Healthy DB + **unusable** storage → 503 | same, storage forced to `memory` | **PASS** — storage `DOWN`, readiness 503 |
| **E6.** The 503 is correctly attributed, not a blanket failure | database component still `HEALTHY` | **PASS** |

E4–E6 exercise the **real aggregation code** against a throwaway SQLite file in `os.tmpdir()` — no
database server, no external service — and confirm storage detail strings expose no filesystem paths.

**Already covered elsewhere, verified rather than re-written:**

| Contract | Where it is covered |
|---|---|
| Strict TLS audit; `verify-full` alone rejected; `accept_invalid_certs` rejected | `scripts/test-db-tls.ts` (32) |
| Anti-downgrade: libpq URL refused without verified TLS | `test-db-tls.ts` — "refuses to build a URL without verified TLS" |
| Rogue-CA rejection | `test-db-tls.ts` audit assertions + `pg-tls-check.mjs` probe (Phase 35/36, **local only**) |
| Backup cannot target a different database | `test-db-tls.ts` — "explicit tooling URL pointing elsewhere is refused" |
| Restore refuses the active database | `test-db-tls.ts` — "target equal to the active database is refused" |
| No silent SQLite fallback in production | `scripts/test-server-env.ts` — "production must reject SQLite" |
| S3 fail-closed; writable ≠ durable | `test-storage-regression-simple.mjs` (21) + gate `STO-3` |
| Gate contract, 13 requirements | `test-staging-gate.mjs` (27) |

---

## 6. Safeguards that remain checklist-only

These **cannot** be verified from repository code, and are recorded as external controls rather than
simulated:

| # | Control | Why it cannot be automated here | Owner |
|---|---|---|---|
| X-1 | Non-superuser runtime role actually lacks `CREATEDB`/`CREATEROLE`/replication/`BYPASSRLS` | Depends on the live database's grants, not on repository content | DBA |
| X-2 | Credentials stay out of source control | Requires a CI hook or VCS protection; there is no VCS and no CI | Organization |
| X-3 | No unauthorized production deployment path | A process/authorization control, not a code property | Organization |
| X-4 | "No claim that a database backup covers uploaded files" | Prose claims and disclaimers are not reliably distinguishable by pattern; a regex guard would be theatre. Instead, the separation is stated in `PHASE_36_STORAGE_DECISION.md` and Phase 37/38 reports, and file recovery remains `NOT RUN` | Documentation review |
| X-5 | Rogue-CA rejection against the **real** staging certificate | Requires the organizational CA and endpoint | Organization / PKI |
| X-6 | Release verification on the **supported** Node runtime | Sandbox runs Node 20.20.2; repo requires ≥22.13. Needs a Node 22 runtime | Environment owner |

---

## 7. Phase 37 status

**Phase 37 remains `BLOCKED / ORGANIZATIONAL STAGING INPUTS MISSING`.** No organizational input has
been provided or verified since Phase 38.

Evidence: the readiness gate still exits **2** with **18 checks: 0 ready / 7 blocked / 11 skipped** —
byte-identical to the Phase 38 final state, with the same seven blocked checks (`DB-1`, `AUTH-1`,
`AUTH-2`, `AUTH-3`, `ENV-1`, `STO-1`, `APP-1`). No environment variable was fabricated to make it
return zero, and the contract suite asserts that an incomplete configuration yields zero ready checks.

A green `release:verify` says the **repository** is internally consistent. It says nothing about
staging, and must never be presented as staging readiness.

---

## 8. Exact commands for local verification

```bash
# Full release verification (types → aggregate tests → memory-safe build)
npm run release:verify                          # require exit 0

# Individually
npm run typecheck                               # exit 0
npm test                                        # exit 0
npm run test:release-contracts                  # 13 passed / 0 failed
npm run test:staging-gate                       # 27 passed / 0 failed
npm run build:safe                              # exit 0

# Staging readiness (separate question, needs organizational inputs)
npm run staging:ready                           # exit 2 in this environment; 0 when inputs exist

# Real-server TLS probe — requires an authorized staging database, NOT runnable here
node scripts/db/pg-tls-check.mjs                # require 11 passed / 0 failed incl. rogue-CA rejection
```

For any CI system: `npm ci` then `npm run release:verify`, on **Node 22.13–22.x**.

---

## 9. Explicit confirmation of external activity

| Activity | Occurred? | Detail |
|---|---|---|
| External network connection | **NO** | No fetch, HTTP client, or remote call. `npm ci` was **not** run (dependencies already present). |
| Database server connection | **NO** | No PostgreSQL was started or contacted; the local cluster remained **down** throughout. |
| Database file write | **YES — local temp only, disclosed** | The E4–E6 tests point Prisma at a throwaway SQLite file in `os.tmpdir()` (`p39-contract-<pid>.db`), then delete it and any `-journal`/`-wal`/`-shm` sidecars. No application or staging storage was written. |
| Migration run | **NO** | No `prisma migrate`, `db push`, or reset executed. |
| Backup / restore run | **NO** | — |
| Storage upload | **NO** | Test storage roots are temp directories; no upload was performed. |
| Deployment / publish | **NO** | — |
| Production access | **NO** | No production endpoint or credential referenced. |
| Original data modified | **NO** | `dev.db` = `e9b4eac1…7fb02`, 4,517,888 B — byte-identical. Migrations 4 (SQLite) + 5 (PG) unchanged; manifest 4/4. |
| Secrets introduced | **NO** | Secret scan across new/changed files: 0 matches. |

---

## 10. Remaining blockers and owners

| # | Blocker | Owner | Next action |
|---|---|---|---|
| B1 | No non-production PostgreSQL endpoint | Organization / platform | Provision; supply URL via the approved mechanism |
| B2 | No written authorization for that database | Staging DB owner | Authorize Phase 37 against it; record a reference |
| B3 | No organizational CA certificate | Organization / PKI | Make the signing CA readable; SAN must match the endpoint |
| B4 | No least-privilege application role | DBA | Non-superuser; no CREATEDB/CREATEROLE/replication/BYPASSRLS |
| B5 | No libpq tooling connection | DBA | `sslmode=verify-full` + `sslrootcert`, no `sslaccept`, same database |
| B6 | Storage decision unresolved (15 `PENDING` fields) | Organization | Complete `PHASE_38_STORAGE_DECISION_RECORD.md` |
| B7 | No persistent volume or file-snapshot plan | Organization / ops | Name volume, mount path, snapshot schedule |
| B8 | No approved deployment target | Organization / ops | HTTPS staging base URL, or approve a controlled-host run |
| B9 | Probe wiring unverified in any orchestrator | Organization / ops | Wire `/health/live` + `/health`; confirm in deployment |
| B10 | Timeout / connection-limit values unset | DBA | Measure, then apply per-role values |
| B11 | No separate disposable restore target | Organization / platform | Provision one distinct from staging |
| **B12** | **Sandbox Node 20.20.2 is below the repository's declared engine (≥22.13)** | Environment owner | Run `npm ci && npm run release:verify` on Node 22.23.3 to close X-6 |

---

### Superseding findings

- Phase 38's statement that the gate reports "18 checks: 0 ready / 7 blocked / 11 skipped" is **confirmed
  unchanged** — not superseded.
- Phase 38's "no `.github/workflows` and no deployment pipeline" is **confirmed** — this phase adds none,
  by decision (§3).
- The Node version discrepancy was first recorded in Phase 28.1R/29. It is **re-raised here as a live
  limitation on this phase's own results** (B12), because it now constrains a release-verification claim
  rather than only a security-audit claim.

### Standing constraints honoured

No production access. No deployment. No migration, reset, or destructive operation. No new
dependency. No application source changed (0 files under `src/`). No secret introduced. No
organizational input invented; the gate was not made to pass. Historical reports were not rewritten.
Unavailable checks marked `BLOCKED`/`NOT RUN`/checklist-only with reasons, never `PASS`. Phase 40 was
not started.
