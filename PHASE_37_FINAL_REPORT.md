# PHASE 37 — Final Report
## Organizational staging onboarding, verified TLS & end-to-end acceptance

**Date:** 2026-10-25
**Preceding state:** `PHASE 36 PARTIAL / EXTERNAL DEPENDENCY PENDING`
**Scope:** establish and verify a genuine organizational staging environment — **only if its inputs exist**.
**Not authorized by this phase:** production deployment, production access, Phase 38.

---

## 1. Final verdict

# `PHASE 37 BLOCKED / ORGANIZATIONAL STAGING INPUTS MISSING`

**Stage A was executed in full. Stages B through G were not started, because the inputs they require do not exist.**

Per the phase rules, no local cluster was provisioned as a substitute, no Phase 36 local TLS result was relabelled as organizational staging, and no environment-dependent operation was attempted. The repository-side verification that Stage A permits was completed and is green.

| Stage | Status | Reason |
|---|---|---|
| A — Preflight & external-input discovery | **COMPLETED** | repository verified; external inputs enumerated and found absent |
| B — Authenticate the real PostgreSQL server | **BLOCKED** | no staging endpoint, no organizational CA (I-1, I-4) |
| C — Non-destructive database assessment | **BLOCKED** | no database to assess; migration additionally requires I-2 authorization |
| D — Storage acceptance | **BLOCKED** | no storage decision, no persistent volume (I-8) |
| E — Application & security acceptance | **BLOCKED** | no approved deployment target (I-7) |
| F — Backup & recovery acceptance | **BLOCKED** | depends on B and C |
| G — Operational readiness | **PARTIAL** | items verifiable in the repository only; the rest marked BLOCKED in §9 |

**Nothing in this phase failed.** The application is not defective; the environment does not exist. This distinction is the entire content of the verdict.

---

## 2. Environment identity and authorization

### 2.1 Classification of every environment touched

| Environment | Classification | Used in Phase 37? | Evidence it is non-production |
|---|---|---|---|
| Repository / working tree | repository | **yes** (Stage A) | local files only; no network, no database |
| SQLite disposable copy | E1 disposable | no | not touched this phase |
| Local PostgreSQL 17 cluster | **local disposable — NOT organizational staging** | **no** | created and destroyed in Phases 34–36; currently `down`; loopback-only |
| Organizational staging PostgreSQL | **ABSENT** | — | does not exist |
| Organizational staging storage | **ABSENT** | — | does not exist |
| Production | **not accessed** | **no** | no credential, endpoint, or command referenced production |

### 2.2 Evidence that no organizational staging configuration exists

| Discovery step | Finding |
|---|---|
| Repo env files (`.env`, `.env.local`, `.env.staging`, `.env.production`, `.env.production.local`) | only `.env` exists; it defines `DATABASE_URL`, `SESSION_SECRET`, `NEXT_PUBLIC_DEMO_HINTS` — **no** staging, tooling, recovery, or CA variables |
| Staging-specific variables in any env file | `PG_STAGING_DATABASE_URL`, `PG_APP_DATABASE_URL`, `BACKUP_TOOLING_DATABASE_URL`, `BACKUP_RECOVERY_DATABASE_URL`, `SSL_CERT_FILE`, `NODE_EXTRA_CA_CERTS`, `STAGING_DATABASE_URL`, `CA_CERT_PATH` — **none defined** |
| Certificate / key material in the workspace | **0** files matching `*.pem`, `*.crt`, `*.cer`, `*.key` |
| Secret-manager references (Vault, AWS Secrets Manager, Doppler, Infisical) | **none** |
| Deployment infrastructure (container manifests, orchestrator config, Helm, `vercel.json`, `fly.toml`, `docker-compose`) | **none** |
| Real staging host recorded in any document | **none** — the only host-shaped strings are RFC 2606 `staging.example.com` placeholders in older runbooks |

### 2.3 Authorization status

**NOT AUTHORIZED.** No authorization to use any staging database exists, because no staging database exists. Phase 37 rules forbid migrating an existing staging database until its ownership, isolation, backup, purpose, and authorization are explicitly verified — so even if an endpoint appeared, Stage C could not begin without a written authorization naming the database and permitted operations.

### 2.4 Secrets

No secret was requested, received, generated, printed, or stored in this phase. No connection string, host, password, token, key, or certificate content appears in this report or in any file produced by it.

---

## 3. TLS authentication

### 3.1 Organizational staging TLS — **BLOCKED / NOT RUN**

| Required check | Result | Reason |
|---|---|---|
| App connects to the intended staging database | **NOT RUN** | no staging endpoint |
| Strict server-certificate authentication enforced | **NOT RUN** | no endpoint, no CA |
| CA is the approved trust anchor for the real endpoint | **NOT RUN** | no CA available |
| Certificate hostname matches the endpoint the app uses | **NOT RUN** | no endpoint, no certificate |
| **Rogue CA rejected** | **NOT RUN** | no endpoint |
| Hostname mismatch rejected | **NOT RUN** | no endpoint |
| Role is non-superuser, no CREATEDB/CREATEROLE/replication/BYPASSRLS | **NOT RUN** | no role to inspect |
| App and tooling URLs target the same database | **NOT RUN** | no URLs |
| No TLS downgrade or insecure fallback | **NOT RUN** | no connection attempted |

**Not one item in this table is inferred from configuration.** They are recorded as NOT RUN because no connection to an organizational server was attempted, and a passing handshake cannot be claimed without one.

### 3.2 What TLS verification looks like when it *is* run (procedure, not a result)

`_STAGING_RUNBOOK.md` §16 requires `node scripts/db/pg-tls-check.mjs` to report **11 passed / 0 failed**, and specifically:

```
✓ server certificate is actually verified (rogue CA rejected) — connection refused as required
```

If that probe **connects**, the phase instruction is explicit: stop immediately, do not migrate, do not back up, do not run acceptance tests. The probe exists because Prisma ignores `sslmode` for verification entirely (PG-35-01) — a handshake alone proves encryption, never authentication.

### 3.3 Local TLS evidence — **explicitly NOT organizational staging**

For traceability only, Phase 36 produced the following against a **local disposable** cluster. It is reproduced here as *local* evidence and **must not be read as staging acceptance**:

| Check | Result | Environment |
|---|---|---|
| `pg-tls-check.mjs` | 11 passed / 0 failed, incl. rogue-CA rejection, TLSv1.3 | local disposable PostgreSQL (E3) |
| Live backup over strict TLS | HTTP 201, `VERIFIED` | local disposable PostgreSQL (E3) |
| Tenant isolation suite | 50 passed / 0 failed | local disposable PostgreSQL (E3) |

These results say the code path works. They say nothing about the organization's certificate chain, endpoint, or role privileges — which is precisely what Stage B exists to establish.

---

## 4. Database schema and migrations

### 4.1 Organizational staging database — **BLOCKED / NOT RUN**

| Step | Result | Reason |
|---|---|---|
| Preflight (`pg-preflight.mjs`) | **NOT RUN** | no staging database |
| Database identity / environment classification | **NOT RUN** | no database |
| Empty vs. populated assessment (non-destructive) | **NOT RUN** | no database to inspect |
| Migration history inspection | **NOT RUN** | no database |
| Schema comparison with the PostgreSQL workspace | **NOT RUN** | no database |
| Role privilege verification for the workflow | **NOT RUN** | no role |
| Authorized recovery point before schema change | **NOT RUN** | no database |
| Applying approved migrations | **NOT RUN** | requires I-1, I-2, and a recovery point |
| Drift check / structural verification | **NOT RUN** | no database |

The databases were **not** assumed empty. That assumption is forbidden precisely because it is unverifiable here.

### 4.2 Repository migration state — verified (static)

| Item | Expected | Actual | Status |
|---|---|---|---|
| `prisma/schema.prisma` provider | `sqlite` | `sqlite` (line 18) | ✅ |
| Generated Prisma client datasource | `sqlite` | `sqlite` | ✅ |
| SQLite migrations | 4 + `sqlite` lock | 4 + `sqlite` lock | ✅ |
| PostgreSQL workspace provider | `postgresql` | `postgresql` | ✅ |
| PostgreSQL migrations | 5 + `postgresql` lock | 5 + `postgresql` lock | ✅ |
| `MANIFEST.sha256` | 4/4 | **4/4 verified, 0 mismatched** | ✅ |
| `prisma/dev.db` SHA-256 | `e9b4eac1…7fb02` | **identical** | ✅ |
| `prisma/dev.db` size | 4,517,888 B | **identical** | ✅ |

**No migration was created, modified, or applied in Phase 37.**

---

## 5. Storage acceptance

### 5.1 Decision status — **UNRESOLVED (carried from Phase 36)**

`PHASE_36_STORAGE_DECISION.md` remains unanswered. The organization has not chosen between Option A (persistent local volume) and Option B (a full S3-compatible adapter).

### 5.2 Both options — **BLOCKED**

| Requirement | Option A (persistent local) | Option B (S3 adapter) |
|---|---|---|
| Provider configured | **BLOCKED** — no staging root, no volume | **BLOCKED** — adapter unimplemented |
| Root exists and is writable | **NOT RUN** | n/a |
| Backed by a real persistent volume | **NOT RUN** — and **not provable from the process**; requires operator attestation | n/a |
| Upload/download survive a restart | **NOT RUN** | n/a |
| Tenant isolation | **NOT RUN** (local evidence: 50/50 in Phase 36, local only) | **NOT RUN** |
| Deletion / metadata / checksums | **NOT RUN** | **NOT RUN** |
| Volume snapshot mechanism documented | **NOT RUN** | n/a |
| Coordinated with database backups | **NOT RUN** | **NOT RUN** |
| Multi-instance limits documented | **NOT RUN** | n/a |

**`STORAGE_PROVIDER=s3` was not enabled and will not be.** Phase 36 rejects it at validation and at preflight, and the application refuses to start with it. Bypassing that validation was not attempted.

**Durability was not claimed.** A successful write proves a filesystem is writable; it does not prove persistence across restart, redeploy, or node loss. The gate therefore requires an explicit operator attestation (`STORAGE_DURABILITY_ATTESTED=yes`) rather than inferring durability from a write.

### 5.3 Consequence

File-workflow acceptance in staging **cannot be declared**. Even in a future PASS, database recovery and file recovery must be reported separately: a database dump does not make uploaded files recoverable.

---

## 6. Application acceptance

### 6.1 Against organizational staging — **BLOCKED / NOT RUN**

| Check | Result | Reason |
|---|---|---|
| `/health/live` available while PostgreSQL is unavailable | **NOT RUN** | no deployed staging app |
| `/health` returns unavailable when a dependency is down | **NOT RUN** | no deployed staging app |
| Readiness recovers without an application restart | **NOT RUN** | no deployed staging app |
| Health responses expose no secrets / stack traces / tenant data | **NOT RUN** | no deployed staging app |
| **Orchestrator** uses `/health/live` for liveness and `/health` for readiness | **NOT RUN** | no orchestrator configuration exists |
| Cross-tenant access denied | **NOT RUN** | no deployed staging app |
| Unauthorized roles cannot perform privileged operations | **NOT RUN** | no deployed staging app |
| Backup restricted to authorized administrators | **NOT RUN** | no deployed staging app |
| Login and core flows work on PostgreSQL | **NOT RUN** | no deployed staging app |
| No SQLite fallback | **NOT RUN** | no deployed staging app |
| Storage operations work with the selected provider | **NOT RUN** | no provider selected |
| Error responses sanitized | **NOT RUN** | no deployed staging app |
| Demo/fixture exposure protections enforced | **NOT RUN** | no deployed staging app |

No dependency was deliberately disrupted: Stage E forbids disrupting a shared environment without explicit authorization and a safe test window, and none was provided.

### 6.2 Repository-side verification — executed, green

| Check | Command | Exit | Result |
|---|---|---|---|
| Typecheck | `npm run typecheck` | **0** | clean |
| Aggregate regression | `npm test` | **0** | all chained suites pass |
| PostgreSQL TLS / URL translation | `npx tsx scripts/test-db-tls.ts` | **0** | **32 passed / 0 failed** |
| Server environment (incl. strict-TLS + S3 rejection) | `node --conditions=react-server --import tsx scripts/test-server-env.ts` | **0** | PASS |
| Storage regression | `npx tsx scripts/test-storage-regression-simple.mjs` | **0** | **21 passed / 0 failed** |
| Backup/recovery | `npx tsx scripts/test-backup-recovery.mjs` | **0** | **22 passed / 0 failed** |
| IDOR (unit) | `npx tsx scripts/test-idor-simple.mjs` | **0** | **15 passed / 0 failed** |
| Production build | `NODE_OPTIONS=--max-old-space-size=1400 npx next build` | **0** | success; `/health` and `/health/live` emitted as dynamic routes |

### 6.3 Phase 36 change consistency — verified present and wired (static)

Rather than trusting the Phase 36 report, each remediation was re-confirmed in the current tree:

| Check | Status |
|---|---|
| `server-env.ts` calls `auditPostgresTls` (PG-35-01) | ✅ present |
| `server-env.ts` rejects S3 at startup (PG-35-02) | ✅ present |
| `backup/database.ts` uses `resolveBackupConnectionUrl` (PG-35-03) | ✅ present |
| `backup/recovery.ts` uses `resolveRecoveryConnectionUrl` (PG-35-03) | ✅ present |
| `system-health.ts` uses `getStorageReadiness` (PG-35-04) | ✅ present |
| `/health` has the 503 `unavailable` path (PG-35-04) | ✅ present |
| `/health/live` returns `alive` (PG-35-04) | ✅ present |
| `check-env.mjs` enforces `sslaccept=strict` | ✅ present |
| `test-base.mjs` has the remote-target guard (PG-35-06) | ✅ present |
| `live/route.ts` imports **only** `next/server` (no DB/storage I/O) | ✅ verified |
| `package.json` has `test:db-tls`, `test:storage`, `test:backup`; aggregate includes `test:db-tls` | ✅ verified |

**Disclosure:** my first automated consistency scan flagged `live/route.ts` as importing "storage". That was a **false positive in my own check** — a naive substring match against the word "storage" inside the file's doc comment. Reading the file confirmed a single import (`NextResponse` from `next/server`). Recorded rather than quietly corrected.

---

## 7. Backup and restore

### 7.1 Against organizational staging — **BLOCKED / NOT RUN**

| Check | Result | Reason |
|---|---|---|
| Tooling URL authenticates the real staging server | **NOT RUN** | no staging endpoint/CA |
| Backup succeeds without weakening TLS | **NOT RUN** | no endpoint |
| Artifacts written to approved protected storage | **NOT RUN** | no approved storage |
| Restore into a separate disposable database | **NOT RUN** | no source, no approved target |
| Restore target verified different from source | **NOT RUN** | no target |
| Restored schema and critical data match the source | **NOT RUN** | no source |
| Tenant boundaries and FK integrity intact | **NOT RUN** | no source |
| Temporary resources cleaned up | **NOT RUN** | no drill performed |
| No secrets or tenant data exposed | **NOT RUN** | no drill performed |

No restore over a source database was attempted, and no recovery point exists.

### 7.2 Local evidence — **explicitly NOT staging**

Phase 36 exercised the backup path against a **local disposable** cluster: backup returned **HTTP 201 / `VERIFIED`** over strict TLS; the restore drill passed **20/20** into a **separate disposable database** (213 tables, 278 FKs, tenant partition preserved, target dropped afterwards). This is recorded as *local live integration* evidence for the code path and **is not** organizational staging acceptance.

### 7.3 RPO / RTO

**No RPO or RTO is claimed.** None was measured against an agreed recovery objective under representative conditions.

### 7.4 File recovery

**NOT RUN.** Database backup does not imply file backup. This remains an open acceptance gap tied to the unresolved storage decision (§5.1).

---

## 8. Test matrix

Every row carries its environment label and result type. Local and organizational results are never combined into a single pass.

| # | Command / action | Environment label | Result type | Exit / status | Result |
|---|---|---|---|---|---|
| 1 | `sha256sum prisma/dev.db` + `stat` | repository | static | 0 | `e9b4eac1…7fb02`, 4,517,888 B — unchanged |
| 2 | Provider inspection (schema + generated client) | repository | static | — | `sqlite` / `sqlite` |
| 3 | Migration inventory (SQLite + PG) | repository | static | — | 4 + lock / 5 + lock |
| 4 | `MANIFEST.sha256` verification | repository | static | — | 4/4 |
| 5 | Phase 36 artifact presence | repository | static | — | 11/11 present |
| 6 | Phase 36 change-consistency scan | repository | static | — | 11/11 wired |
| 7 | `npm run typecheck` | repository | static | **0** | clean |
| 8 | `npm test` | repository | unit | **0** | all suites pass |
| 9 | `npx tsx scripts/test-db-tls.ts` | repository | unit | **0** | 32 passed / 0 failed |
| 10 | `node --conditions=react-server --import tsx scripts/test-server-env.ts` | repository | unit | **0** | PASS |
| 11 | `npx tsx scripts/test-storage-regression-simple.mjs` | repository | unit | **0** | 21 / 0 |
| 12 | `npx tsx scripts/test-backup-recovery.mjs` | repository | unit | **0** | 22 / 0 |
| 13 | `npx tsx scripts/test-idor-simple.mjs` | repository | unit | **0** | 15 / 0 |
| 14 | `NODE_OPTIONS=… npx next build` | repository | static build | **0** | success |
| 15 | `npm run staging:ready` (actual environment) | repository | static gate | **2** | 0 ready / 7 blocked / 7 checked |
| 16 | Gate self-test — complete synthetic config | repository | unit (gate logic) | **0** | 18 ready / 0 blocked; 0 secret leaks, 0 hostname leaks |
| 17 | Gate self-test — production-like host | repository | unit (gate logic) | **3** | refused, no value printed |
| 18 | Gate self-test — `STORAGE_PROVIDER=s3` | repository | unit (gate logic) | 2 | `STO-1` BLOCKED |
| 19 | Gate self-test — recovery target = source | repository | unit (gate logic) | 2 | `REC-1` BLOCKED |
| 20 | Stage B — TLS authentication | organizational staging PostgreSQL | — | — | **NOT RUN — no environment** |
| 21 | Stage C — DB assessment / migrations | organizational staging PostgreSQL | — | — | **NOT RUN — no environment** |
| 22 | Stage D — storage acceptance | organizational storage | — | — | **NOT RUN — no provider/volume** |
| 23 | Stage E — application/security acceptance | organizational staging | — | — | **NOT RUN — no deployment target** |
| 24 | Stage F — backup/restore acceptance | organizational staging PostgreSQL | — | — | **NOT RUN — no environment** |
| 25 | Stage G — probe wiring in orchestrator | organizational staging | — | — | **NOT RUN — no orchestrator** |

**Skipped by design:** gate checks whose prerequisite is absent (endpoint shape, CA readability, tooling consistency, recovery-target separation). They are skipped, not silently passed — the gate reports 7 evaluated checks rather than 18 in the empty state.

---

## 9. Remaining blockers

| # | Blocker | Owner | Exact action required |
|---|---|---|---|
| **B1** | No organizational staging database | Organization / platform | Provision a dedicated non-production PostgreSQL instance and supply its endpoint through the approved mechanism. |
| **B2** | No authorization to use it | Staging database owner | Authorize Phase 37 against that specific database in writing, naming permitted operations and a time window; record a reference. |
| **B3** | No organizational CA certificate | Organization / PKI | Make the CA that signed the staging certificate readable by the application process; ensure the certificate SAN matches the endpoint. |
| **B4** | No least-privilege application role | Organization / DBA | Provide a non-superuser role with no CREATEDB, CREATEROLE, replication, or BYPASSRLS. |
| **B5** | No tooling connection | Organization / DBA | Provide a libpq-parseable URL (`sslmode=verify-full`, `sslrootcert=<CA>`, **no** `sslaccept`) for the same database. |
| **B6** | Storage decision unresolved | Organization | Choose Option A (persistent volume, single instance) or Option B (authorize a full S3 adapter as its own work item). |
| **B7** | No durable-volume proof / no file backup | Organization / ops | Name the volume, its mount path and snapshot schedule; coordinate file snapshots with database backups. |
| **B8** | No approved deployment target | Organization / ops | Supply the staging application HTTPS base URL, or approve running the app against staging from a controlled host. |
| **B9** | Probe wiring unverified in any orchestrator | Organization / ops | Point `livenessProbe` at `/health/live` and `readinessProbe` at `/health`; confirm in the real deployment. |
| **B10** | Timeout / connection-limit values unset | Organization / DBA | Measure the workload, then apply per-role values per `PHASE_36_DATABASE_TIMEOUTS.md` (no unverified defaults). |
| **B11** | No separate disposable restore target | Organization / platform | Provision one; restores must never target the staging database. |

None of B1–B11 is an application defect. All eleven are inputs or decisions the repository cannot supply.

---

## 10. Change inventory

### 10.1 Changed files (Phase 37)

| File | Change | Rationale |
|---|---|---|
| `scripts/db/staging-readiness.mjs` | **new** (229 lines) | Machine-checkable gate for the 18 required inputs. No network I/O, no DB connection, no storage write, no value printed. Exits 0 / 2 / 3. Turns a prose checklist into something the organization can actually run. |
| `package.json` | modified | Added `staging:ready` script pointing at the gate. |
| `PHASE_37_STAGING_HANDOFF.md` | **new** | Exact handoff: 8 required inputs + 3 stage prerequisites, each with owner, action, verification, and handling rules. |
| `PHASE_37_FINAL_REPORT.md` | **new** | This report. |

### 10.2 Not changed — deliberately

| Item | Status |
|---|---|
| Application source (`src/**`) | **unchanged** — no code was changed to produce a greener report |
| Prisma schema | **unchanged** (`sqlite`) |
| Migrations (SQLite 4, PostgreSQL 5) | **unchanged** |
| `MANIFEST.sha256` | unchanged, 4/4 verified |
| `.env` | unchanged, not opened for modification |
| `prisma/dev.db` | **byte-identical**, `e9b4eac119cc44941d7cdea88c1429945fce40dd1ee7c548759bcfbc68f7fb02`, 4,517,888 B |
| Local PostgreSQL cluster | **not started** in Phase 37; remains `down` |

### 10.3 Database state and integrity

- No database was created, migrated, reset, dropped, or written in Phase 37.
- No `prisma db push`, no `migrate reset`, no `--accept-data-loss`, no `DROP SCHEMA` was executed anywhere.
- `prisma/dev.db` hash and size are **identical** before and after.

### 10.4 Production

**Production was not accessed.** No production endpoint, credential, or command was referenced, resolved, or contacted at any point in this phase. No production data was read or written. No deployment occurred.

---

## 11. Next safest action

> **Satisfy B1, B2 and B3 — a dedicated non-production PostgreSQL endpoint, written authorization naming that database, and the CA certificate that actually signed its server certificate — then run `npm run staging:ready` and confirm it exits 0 before attempting Stage B.**

Rationale: these three inputs are the gate for *every* subsequent stage. B4 and B5 are usually issued by the same DBA in the same request. The storage decision (B6) and the deployment target (B8) can be resolved in parallel and do not block Stage B/C, which are database-only.

**Do not** satisfy the gate by pointing at a local cluster, enabling `STORAGE_PROVIDER=s3`, or relaxing TLS verification. Each of those produces a green result that means nothing — and the first of them is the exact substitution Phase 37 forbids.

**Phase 38 was not started.**

---

### Standing constraints honoured in this phase

No production access. No data-loss or destructive operation. No migration applied. No migration created to bypass a mismatch. No secret requested, received, printed, or stored. No credential placed in source, report, or transcript. No TLS verification weakened. No local cluster substituted for organizational staging, and no local result relabelled as staging. No S3 enablement. No durability claim inferred from a successful write. No application code changed to manufacture a green result. Unavailable evidence recorded as `NOT RUN` with its exact reason, never inferred from configuration. Unverified RPO/RTO not claimed. Development-server latency not presented as production performance. Phase 38 not started.
