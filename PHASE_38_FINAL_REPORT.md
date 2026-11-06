# PHASE 38 — Final Report
## Staging blocker management, gate verification & deployment readiness

**Date:** 2026-10-25
**Preceding state:** `PHASE 37 BLOCKED / ORGANIZATIONAL STAGING INPUTS MISSING`
**Scope:** bounded verification and readiness. Not an attempt to provision staging from inside the repository.

---

## 1. Final verdict

# `PHASE 38 PASS — BOUNDED VERIFICATION SCOPE`

**What this PASS covers:** the objectives Phase 38 could actually achieve without organizational
inputs — audit the readiness gate, correct its defects, reconcile documentation with reality,
establish deployment readiness as an auditable proposal, and record the storage decision as pending.
All of that was completed and verified.

**What it does not cover, and must not be read as covering:**

| Statement | Status |
|---|---|
| Organizational staging is onboarded | **NO** — still absent |
| Phase 37 passed | **NO — it remains `BLOCKED`.** Nothing here satisfies a single organizational input |
| Any migration, backup, restore, upload, or remote probe was run | **NO** |
| The deployment checklist is validated | **NO** — it is a proposal; no orchestrator was contacted |
| Storage is durable | **NO** — decision still `PENDING`, no volume examined |

A PASS here means *"the engineering-side readiness work is correct and verified."* It is not a claim
about the environment, because the environment does not exist.

---

## 2. Baseline and final test results

Both columns are the **repository environment** (no network, no database, no staging).

| Check | Baseline (before changes) | Final (after changes) |
|---|---|---|
| `npm run staging:ready` | exit **2** — `0 ready / 7 blocked / 7 checked` | exit **2** — `18 checks: 0 ready / 7 blocked / 11 skipped` |
| `npm run typecheck` | exit **0** | exit **0** |
| `npm test` | exit **0** | exit **0** (now includes the gate contract suite) |
| Production build (`NODE_OPTIONS=--max-old-space-size=1400 npx next build`) | exit **0** | exit **0**; `/health` and `/health/live` emitted as dynamic routes |
| `scripts/test-staging-gate.mjs` (new) | — (did not exist) | **27 passed / 0 failed** |
| `scripts/test-db-tls.ts` | 32 / 0 | 32 / 0 (unchanged) |
| `scripts/test-storage-regression-simple.mjs` | 21 / 0 | 21 / 0 (unchanged) |
| `scripts/test-backup-recovery.mjs` | 22 / 0 | 22 / 0 (unchanged) |
| `scripts/test-idor-simple.mjs` | 15 / 0 | 15 / 0 (unchanged) |

Both baselines and finals are green on the pre-existing suites. The gate's *output shape* changed
because of the fixes in §3 — deliberately, not incidentally.

---

## 3. Gate audit

`npm run staging:ready` (`scripts/db/staging-readiness.mjs`) was audited against all thirteen
requirements, using **synthetic fixtures only** — placeholder hosts under `.invalid`, the literal
sentinel password `SYNTHETIC-PASSWORD-SENTINEL`, and self-generated dummy CA files. No real
credential was used, including for negative tests.

### 3.1 Defects found and fixed

| ID | Defect | Why it mattered | Fix |
|---|---|---|---|
| **G-1** | `TOOL-4` claimed *"trust anchor is consistent (both URLs reference a readable CA)"* but only checked that the **app** CA was readable. It never looked at the tooling's `sslrootcert`. | An **unsupported PASS**: app and tooling could trust different CAs (backups trusting a CA that never signed the server certificate) and the gate would still report consistent. This is precisely the "green check that means nothing" failure mode. | Compare the two anchors by **content fingerprint** (SHA-256 of the file), not by path string — the same CA may legitimately live at two paths. Mismatch → `BLOCKED`. |
| **G-2** | Dependent checks were **silently omitted** when their prerequisite was absent. An empty environment produced 7 records, with no indication that 11 more existed. | A reader could not distinguish "not evaluated" from "satisfied". The Phase 37 report had to explain the 7-vs-18 gap in prose — a sign the tool should have said it itself. | All 18 checks are now always emitted; unevaluated ones appear as **`SKIPPED`** with the prerequisite named. Output is deterministically ordered. |
| **G-3** | `REC-1` compared restore-target identity by **host + database name**, ignoring the port, while `TOOL-2` compared **host + port + database**. | Inconsistent definition of "same database": a genuinely distinct instance on a different port was reported as the *same* database and wrongly blocked. | A single `sameDatabase()` helper (host + port + database) is now used by both checks. |

**A fourth defect was introduced during the fix and caught by the new tests before it shipped:** my
first `TOOL-4` implementation read `sp.get("sslcert")` after `sp` had been rebound to the *tooling*
search parameters, so it compared the tooling URL against itself. The contract test
(`same trust anchor via a different path → PASS`) failed, I traced the shadowing, and corrected it to
use the app CA path captured during `DATABASE_URL` parsing. Disclosed because a silent fix would hide
that the test suite is what prevented a regression.

### 3.2 Requirement-by-requirement results

| # | Requirement | Result | Test evidence (synthetic) |
|---|---|---|---|
| 1 | Missing inputs produce a nonzero exit | **PASS** | empty env → exit 2, zero PASS records |
| 2 | Dependent checks skipped/blocked, never silently passed | **PASS** *(fixed — G-2)* | `DB-2…DB-5`, `TOOL-*`, `REC-1` appear as `SKIPPED`; nothing passes on a failed prerequisite |
| 3 | No network, database, storage writes, or migrations | **PASS** | static surface check (imports limited to `node:crypto, node:fs, node:process`; no `fetch`/`net`/`http`/`dns`/`child_process`/Prisma/write APIs) + fixture tree unchanged after a run |
| 4 | No credentials, URLs, tokens, keys, or certificate content printed | **PASS** | 2 runs × 5 sentinels (password, host, both CA markers, `postgresql://`) — zero occurrences in stdout+stderr |
| 5 | Loopback not accepted as organizational staging | **PASS** | loopback `DATABASE_URL` → `DB-2 BLOCKED` |
| 6 | Authorization reference and owner required | **PASS** | 4 sub-cases: `STAGING_AUTHORIZED` absent / `no`, `_REF` absent, `STAGING_OWNER` absent |
| 7 | App and tooling URLs checked for same-database relationship | **PASS** | different DB name → `TOOL-2 BLOCKED`; different port → `TOOL-2 BLOCKED` |
| 8 | Restore target distinct from active target | **PASS** *(fixed — G-3)* | same DB → `BLOCKED`; other port → `PASS`; missing → `BLOCKED` |
| 9 | CA must be a readable regular file | **PASS** | absent path, empty file, and directory all → `DB-4 BLOCKED` |
| 10 | Storage requirements match provider and real capability | **PASS** | `s3` → `STO-1 BLOCKED` ("unimplemented"); missing root → `STO-2 BLOCKED` |
| 11 | Durability attestation never inferred from writability | **PASS** | writable root → `STO-2 PASS` but `STO-3 BLOCKED`, exit 2 |
| 12 | Missing app target stays blocked | **PASS** | absent / `http://` / loopback → `APP-1 BLOCKED` |
| 13 | Production-like configuration refused | **PASS** | exit **3**, refusal message, no value printed |

**Gate verdict: 3 real defects fixed, 27 regression assertions added, 0 known defects remaining.**

---

## 4. Handoff / runbook consistency findings

| # | Finding | Severity | Resolution |
|---|---|---|---|
| C-1 | **`STORAGE_DURABILITY_ATTESTED` was documented nowhere** — not in the handoff, runbook, or `.env.example`. The gate *requires* it to pass `STO-3`. | HIGH (operator-blocking) | Added to the new variable reference table |
| C-2 | `BACKUP_TOOLING_DATABASE_URL`, `BACKUP_RECOVERY_DATABASE_URL`, `STORAGE_LOCAL_ROOT` were named in prose but **never by their exact variable name** in the handoff | HIGH | Same table |
| C-3 | Handoff §5 showed **stale gate output** (`7 checked`) with a prose explanation of the 7-vs-18 gap | MEDIUM | Replaced with the actual 18-check output including `SKIPPED` lines |
| C-4 | Check IDs `DB-3`, `TOOL-2`, `TOOL-3`, `ENV-1`, `STO-2` were not referenced anywhere an operator could map them | LOW | New table maps every check to its variables |
| C-5 | **Runbook §6 (migrate) lacked the prerequisite gate**: it went straight from "dry run" to "execute" without requiring authorization, a read-only assessment, or an authorized recovery point | HIGH (safety) | Added an explicit three-part prerequisite block; also restates that `DROP SCHEMA` / `migrate reset` / `db push` are never correct against staging |

Verified as **already correct** (no change made):

- App-vs-tooling TLS distinction (`sslaccept` vs `sslrootcert`/`verify-full`) is present in both docs.
- **No instruction anywhere advises weakening TLS.** The `sslmode=disable` strings in older reports are *historical statements* about what Phase 34 did, not recommendations.
- Database backup and file recovery are treated as separate domains.
- S3 rejection is stated in both docs.
- `/health/live` for liveness and `/health` for readiness, in both docs.
- No document claims orchestrator probe wiring was verified — searches for such claims returned nothing.

---

## 5. Deployment configuration findings

| Question | Finding |
|---|---|
| Deployment manifest present? | **No** — no Dockerfile, compose, k8s, Helm, `fly.toml`, `vercel.json`, `netlify.toml`, `Procfile`, `app.yaml`, or charts |
| CI pipeline present? | **No** — no `.github/workflows` |
| Deployment target documented? | **No** — only RFC 2606 `*.example.invalid` placeholders |
| Is the absence accurately documented? | It was **not** documented before this phase. It is now: `PHASE_38_DEPLOYMENT_READINESS_CHECKLIST.md` states it explicitly. |

A checklist was produced because it materially helps the next authorized deployment. It contains
**placeholders only** and invents no provider, orchestrator, registry, domain, secret manager,
topology, or volume class.

Its enforcement matrix is deliberately unflattering. Seven invariants are enforced by **code**
(strict TLS, fail-closed startup, S3 refusal, no fabricated durability, separate probes, backup
no-downgrade, restore-never-targets-live). Three are **checklist-only** and labelled as such:

- **D-6** non-superuser runtime role — the repository passes through whatever role the URL names; it
  cannot verify the role's privileges from here.
- **D-7** credentials out of source control — enforced by review; there is no CI to enforce it.
- **D-11** no production deployment path without authorization — a process control, not a mechanism.

**Nothing was deployed**, and no orchestrator configuration is described as tested.

---

## 6. Storage decision status

`DECISION PENDING` — carried forward, not resolved, and not decided on the organization's behalf.
Recorded in `PHASE_38_STORAGE_DECISION_RECORD.md` with **15 decision fields, all `PENDING`**.

Both options are represented accurately:

- **Option A (persistent local volume):** zero implementation cost, but requires a real persistent
  volume, confirmed mount path, snapshot arrangement, **operator attestation**, coordinated file+DB
  recovery, and acceptance of the **single-instance** constraint.
- **Option B (S3-compatible adapter):** requires an explicit organizational decision, an approved
  provider, a disposable **test** bucket, secret-manager configuration, and a separately scoped
  implementation **and validation phase** covering all eight operations.

The record also states what is **not** a decision: setting `STORAGE_PROVIDER=s3` (the app refuses to
start), possessing bucket credentials, adding `STORAGE_S3_*` variables, or a passing test of a stub.

---

## 7. Files changed

| File | Change | Reason |
|---|---|---|
| `scripts/db/staging-readiness.mjs` | **modified** | Fix G-1 (real trust-anchor comparison), G-2 (explicit `SKIPPED` + deterministic order), G-3 (shared `sameDatabase()`); added `node:crypto` import. No new I/O surface. |
| `scripts/test-staging-gate.mjs` | **new** (27 assertions) | Regression coverage for the gate's contract. Synthetic fixtures only. |
| `package.json` | **modified** | Added `test:staging-gate`; appended it to the aggregate `test` chain. |
| `PHASE_37_STAGING_HANDOFF.md` | **modified** | Added §0.1 variable reference (11 variables); replaced stale §5 output with the real 18-check output. (Living handoff — Phase 37's report was **not** rewritten.) |
| `_STAGING_RUNBOOK.md` | **modified** | §6 migration prerequisites (authorization, read-only assessment, authorized recovery point); §17 gate pointer. |
| `PHASE_38_DEPLOYMENT_READINESS_CHECKLIST.md` | **new** | Deployment proposal with placeholders and an honest enforcement matrix. |
| `PHASE_38_STORAGE_DECISION_RECORD.md` | **new** | Decision record with `PENDING` fields. |

**Not changed — deliberately:** every file under `src/` (0 files modified), the Prisma schema, both
migration trees, `MANIFEST.sha256`, `.env`, `.env.example`, and all prior phase reports.

`PHASE_37_FINAL_REPORT.md` row 15 of its test matrix (`0 ready / 7 blocked / 7 checked`) is now
**superseded** by the 18-check output. The historical record was left intact rather than edited to
match present behaviour; this note is the reconciliation.

### Integrity

| Item | Value |
|---|---|
| `prisma/dev.db` SHA-256 | `e9b4eac119cc44941d7cdea88c1429945fce40dd1ee7c548759bcfbc68f7fb02` — **identical** |
| `prisma/dev.db` size | 4,517,888 B — **identical** |
| SQLite migrations | 4 (unchanged) |
| PostgreSQL migrations | 5 (unchanged) |
| `MANIFEST.sha256` | 4/4 verified (unchanged) |
| Migration changes | **none** |
| Secret scan | **0** real credential matches across all Phase 38 deliverables; the only credential-shaped strings are `postgresql://gate:${PW}@…` interpolations of the literal `SYNTHETIC-PASSWORD-SENTINEL` |

---

## 8. Remaining organizational blockers

Unchanged from Phase 37 — this phase removed engineering-side obstacles, not organizational ones.

| # | Blocker | Owner | Next action |
|---|---|---|---|
| B1 | No non-production PostgreSQL endpoint | Organization / platform | Provision it; supply the URL through the approved mechanism |
| B2 | No written authorization for the database | Staging DB owner | Authorize Phase 37 against that database; record a reference |
| B3 | No organizational CA certificate | Organization / PKI | Make the signing CA readable by the app; ensure the certificate SAN matches the endpoint |
| B4 | No least-privilege application role | DBA | Issue a non-superuser role: no `CREATEDB`, `CREATEROLE`, replication, `BYPASSRLS` |
| B5 | No libpq tooling connection | DBA | Issue `sslmode=verify-full` + `sslrootcert`, no `sslaccept`, same database |
| B6 | Storage decision unresolved | Organization | Complete the 15 fields in the decision record |
| B7 | No persistent volume or file snapshot plan | Organization / ops | Name volume, mount path, snapshot schedule; coordinate with DB backups |
| B8 | No approved deployment target | Organization / ops | Supply the HTTPS staging base URL or approve a controlled-host run |
| B9 | Probe wiring unverified in any orchestrator | Organization / ops | Wire `/health/live` + `/health`; confirm in the real deployment |
| B10 | Timeout / connection-limit values unset | DBA | Measure, then apply per-role values |
| B11 | No separate disposable restore target | Organization / platform | Provision one distinct from staging |

---

## 9. Explicit activity confirmation

| Activity | Occurred? | Detail |
|---|---|---|
| External network connection | **NO** | No `fetch`, HTTP client, or remote call was made. Every command operated on local files or local processes only. |
| Database connection | **NO** | No client connected to any database. The local PostgreSQL cluster remained **stopped** for the entire phase and was never started. |
| Migration run | **NO** | No `prisma migrate`, `db push`, or reset executed. Migration trees byte-unchanged. |
| Storage write | **NO** to any configured storage root. **YES** to local temp only: the gate test harness creates and deletes synthetic CA fixtures and a volume directory under `os.tmpdir()`, and removes the tree at the end. | Disclosed for precision — it is not a staging or application storage write. |
| Deployment | **NO** | Nothing built for deployment, pushed, or started beyond local verification builds. |
| Production access | **NO** | No production endpoint, credential, or command was referenced at any point. |
| Secret exposure | **NO** | No credential requested, received, generated, printed, or committed. Secret scan clean. |
| Original data modified | **NO** | `dev.db` hash and size identical; `.env` untouched. |

---

## 10. The command to run when the organizational inputs arrive

```bash
npm run staging:ready
```

**Required result:** exit **0** with all 18 checks `PASS`/`ATTESTED` and `0 blocked / 0 skipped`.

It performs no network, database, or storage I/O and prints no values, so it is safe to run as often
as needed while assembling the inputs. If it exits `2`, the output names each remaining check, its
owner, and the exact action. If it exits `3`, a production-like value was detected and nothing else
was evaluated.

Only after a clean exit 0 should the operator proceed to Stage B:

```bash
node scripts/db/pg-tls-check.mjs      # require: 11 passed / 0 failed, incl. rogue-CA rejection
```

**Do not** satisfy the gate with a local cluster, `STORAGE_PROVIDER=s3`, or relaxed TLS verification.

**Phase 37 is not passed.** Phase 38 is complete; Phase 39 was not started.

---

### Standing constraints honoured

No production access. No deployment. No migration, reset, destructive operation, or schema change.
No new infrastructure or storage-adapter dependency. No application source changed (0 files under
`src/`). No behavior altered to make a readiness check pass — the gate's stricter behavior is a
correctness fix, not a green-washing change. No organizational input invented or simulated. No local
cluster substituted for staging. Historical reports left intact and superseded explicitly rather than
silently rewritten. Unavailable checks recorded as `BLOCKED` / `NOT RUN` / `SKIPPED` with reasons,
never as `PASS`. No RPO or RTO claimed. Phase 39 not started.
