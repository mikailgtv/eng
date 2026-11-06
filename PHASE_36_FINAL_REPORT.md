# PHASE 36 — Final Report
## Critical staging blocker remediation, TLS enforcement, backup compatibility & health probes

**Date:** 2026-10-25
**Scope:** remediation of confirmed application-level defects (PG-35-01 … PG-35-07) that are fixable without organizational infrastructure, credentials, or cloud resources.
**Not in scope (explicitly):** any deployment, any production action, any cloud resource, Phase 37.

---

## 1. Final verdict

# `PHASE 36 PARTIAL / EXTERNAL DEPENDENCY PENDING`

**Every code-level defect in PG-35-01 … PG-35-07 is remediated and regression-tested.** The reasons this is PARTIAL rather than PASS are unchanged from Phase 35 and are *not* code defects:

| # | Why it is not a full PASS | Type |
|---|---|---|
| 1 | No organizational staging PostgreSQL (E4) was supplied, so no application/backup behaviour has been exercised against the real staging database. | external dependency |
| 2 | No organizational object storage (E5) was supplied, and the S3 adapter is a stub. `STORAGE_PROVIDER=s3` is now **rejected**, so file persistence in staging is unproven beyond a local volume. | external dependency + blocked decision |
| 3 | The storage decision (Option A persistent local volume vs Option B S3-compatible adapter) must be made by the organization; it cannot be made from the repository. | organizational decision |

**What this verdict does NOT mean:** it does not mean the fixes are unverified. Every fix was executed against a real PostgreSQL 17 cluster over **authenticated TLS** and produced live HTTP evidence (§4). It means the environment that matters for the acceptance criteria — organizational staging — does not exist yet, and per the standing rule, a local pass is never promoted to staging readiness.

**No production system was contacted, read, written, or migrated at any point.**

---

## 2. Closure matrix — PG-35-01 … PG-35-07

Legend — **Code**: fixed/unfixed. **Evidence**: `unit` = repository-only assertions, `live` = executed against a real service, `static` = source inspection.

### PG-35-01 — CRITICAL — PostgreSQL TLS is encrypted but unauthenticated
**Finding.** Prisma ignores `sslmode` entirely for certificate verification; its only verification knob is `sslaccept`. A configuration that *looks* like `sslmode=verify-full` connects happily to a server presenting a certificate signed by a **rogue CA**. Encryption without authentication = MITM accepted.

| | |
|---|---|
| **Code changed** | **New** `src/lib/db-tls.ts` (163 lines): `auditPostgresTls`, `describeTlsProblem`, `toLibpqConnectionUrl`, `sameTargetDatabase`, `isPostgresUrl`, `TlsProblem`. **Modified** `src/lib/server-env.ts` (production TLS audit loop), `scripts/production/check-env.mjs`, `scripts/db/pg-tls-check.mjs`, `.env.example`. |
| **Behaviour now** | Strict TLS = `sslaccept=strict` **and** `sslcert=<CA path>` **and** `sslmode ∈ {require, verify-ca, verify-full}`. Absent `sslmode` defaults to `prefer` and is **rejected**. Production/staging **fails closed** at startup via the instrumentation hook. Local SQLite development is unaffected (no PG TLS settings required). |
| **Anti-downgrade** | `toLibpqConnectionUrl()` never downgrades: a non-strict input throws rather than producing a weaker connection. Errors carry problem codes, never URLs, hosts, or passwords. |
| **Test evidence** | `unit` — `scripts/test-db-tls.ts` **32 passed / 0 failed**, covering accept/reject for missing strict mode, missing CA, invalid config, unsupported combos, and SQLite dev mode. `unit` — `scripts/test-server-env.ts` PASS: 7 TLS rejections, local accepted. `live` — `pg-tls-check.mjs` **11 passed / 0 failed**, including **`✓ server certificate is actually verified (rogue CA rejected) — connection refused as required`**. `live` — app connections negotiated TLSv1.3, `pg_stat_ssl.ssl = t`. |
| **Rogue-CA probe** | **Preserved and strengthened.** It now reads `PG_APP_DATABASE_URL` (the URL the application actually uses) and is documented in `_STAGING_RUNBOOK.md` §16 as a **required gate before staging approval**. |
| **Remaining risk** | Cannot be closed locally: whether the organization's staging CA/proxy presents a certificate chaining to a CA the app is configured to trust. That is a staging-environment fact. |
| **Status** | **CODE REMEDIATED / VERIFIED LOCALLY** — organizational certificate chain **NOT TESTED** |

### PG-35-02 — HIGH — Readiness reported healthy while S3 was an unimplemented stub
**Finding.** `src/lib/storage/s3.ts` is a 105-line stub; all 8 operations throw. It nonetheless passed preflight, and `/health` reported `File storage: NOT_CONFIGURED` unconditionally. The app could report full readiness with a storage provider that could never store a byte.

| | |
|---|---|
| **Code changed** | `src/lib/storage/index.ts` (`validateStorageEnv()` throws on S3; **new** `getStorageReadiness()` → `READY` / `UNSUPPORTED` / `MISCONFIGURED`), `src/lib/system-health.ts` (storage component derived from real state; aggregate readiness requires DB **and** storage), `src/lib/server-env.ts` (S3 rejected at startup), `scripts/production/check-env.mjs` (s3/memory/unknown rejected), `.env.example`. |
| **Behaviour now** | `STORAGE_PROVIDER=s3` → **fails closed at boot** with `S3 storage is not implemented in this release; use STORAGE_PROVIDER=local with a persistent volume`. `/health` returns **503** whenever storage is not genuinely usable. Readiness detail contains no paths, bucket names, or credentials. The misleading per-variable `STORAGE_S3_*` "missing" list was removed — implying that supplying those variables would help was itself misleading. |
| **Test evidence** | `unit` — storage regression **21 passed / 0 failed**, including new `env: s3 rejected even with a complete config` and `env: s3 rejection does not echo credentials`. `live` — booting with `STORAGE_PROVIDER=s3` and a complete synthetic S3 config aborted startup with the message above; a 0-match scan for credential patterns in that output. `live` — `local` provider: uploads/downloads worked (4 objects), cross-tenant denial verified. |
| **Remaining risk** | Local disk durability and multi-instance behaviour are **not** solved by this fix — see §3. |
| **Status** | **CODE REMEDIATED / VERIFIED LOCALLY** — storage backend selection **BLOCKED on decision** |

### PG-35-03 — HIGH — Backup was impossible over authenticated TLS
**Finding.** `pg_dump` is a libpq tool and rejects Prisma-only parameters: `invalid URI query parameter: "sslaccept"` → the backup endpoint returned **HTTP 500** on any correctly-secured database. A second instance of the same defect existed in `recovery.ts`. Additionally, libpq's `sslcert` means *client certificate*, not CA — the CA is `sslrootcert`.

| | |
|---|---|
| **Code changed** | **New** `src/lib/backup/connection.ts`: `resolveBackupConnectionUrl()`, `resolveRecoveryConnectionUrl()`, `sanitizeToolError()`. **Modified** `src/lib/backup/database.ts` and `src/lib/backup/recovery.ts` (both `pg_dump` and `pg_restore` call sites), `src/lib/server-env.ts` (`BACKUP_TOOLING_DATABASE_URL`, optional, postgres-protocol validated), `.env.example`. |
| **Behaviour now** | Prisma config and libpq config are separate. If `BACKUP_TOOLING_DATABASE_URL` is set it is used **only if** `sameTargetDatabase()` proves it targets the same database as `DATABASE_URL` — otherwise refused, so a backup can never silently dump the wrong database. If unset, a libpq-safe URL is derived and **never downgraded**. Tool errors are sanitized to `postgresql://<redacted>`, ≤200 chars. Backup files go only to the approved protected directory; temp files are cleaned on success **and** failure. Restore requires `BACKUP_RECOVERY_DATABASE_URL` and refuses the active database. The authorization boundary is unchanged (admin only). |
| **Test evidence** | `unit` — `test-backup-recovery.mjs` **22 passed / 0 failed**; the db-tls suite covers the URL translation. `live` — **`POST /api/admin/backups/database` → HTTP 201, status `VERIFIED`, 3,059,351 bytes, 771 ms** over strict TLS (this same call returned 500 in Phase 35). `live` — learner/teacher → **403**; no connection string in any response. `live` — `pg-backup-drill.mjs` **20 passed / 0 failed**: restore into a **separate disposable database**, 213 tables, 278 FKs, tenant partition preserved, no orphaned/NULL-tenant rows, **restore target dropped after the drill**. |
| **Remaining risk** | The TLS backup path has been proven against a **local** authenticated-TLS cluster, not the organization's staging database. Backup **coverage** (object storage) remains out of scope — DB backup ≠ file backup. |
| **Status** | **CODE REMEDIATED / VERIFIED LOCALLY** — organizational staging backup **NOT RUN** |

### PG-35-04 — MEDIUM — Liveness and readiness conflated
**Finding.** A single `/health` endpoint served both purposes and hardcoded storage as `NOT_CONFIGURED`. Pointing a liveness probe at it would restart a healthy process whenever the database hiccuped.

| | |
|---|---|
| **Code changed** | **New** `src/app/health/live/route.ts` (no I/O at all). **Rewritten** `src/app/health/route.ts` (readiness, 200/503). `src/lib/system-health.ts` (real storage state). |
| **Behaviour now** | `/health/live` → **200 `{"status":"alive"}`** always, zero DB/storage dependency; use for liveness/restart policy. `/health` → **200 `{"status":"healthy"}` / 503 `{"status":"unavailable"}`**, requires DB **and** storage healthy; use for traffic readiness. Both send `Cache-Control: no-store` and `X-Content-Type-Options: nosniff`. Neither body exposes connection strings, addresses, credentials, stack traces, or tenant data. No silent fallbacks. |
| **Test evidence** | `live` — baseline `live=200 ready=200`; with PostgreSQL **stopped**: `live=200`, `ready=503`, body `{"status":"unavailable"}`; after restart: `live=200 ready=200` **with no application restart**. `static` — `live/route.ts` contains no database or storage import. |
| **Remaining risk** | Probe wiring in the actual orchestrator is a staging/deployment concern. |
| **Status** | **CODE REMEDIATED / VERIFIED LOCALLY** |

### PG-35-05 — LOW — No server-side runaway-query guard
**Finding.** `statement_timeout = 0` and `idle_in_transaction_session_timeout = 0` on the observed cluster.

| | |
|---|---|
| **Code changed** | **None applied, by design.** New `PHASE_36_DATABASE_TIMEOUTS.md`; `_STAGING_RUNBOOK.md` §17. |
| **Rationale** | Choosing these values is an operational decision driven by the organization's workload. Applying an unverified `statement_timeout` can abort legitimate long-running reports **and migrations mid-flight**; the same is true of the idle-in-transaction setting. Inventing a number would create an outage, not fix a defect. |
| **Test evidence** | `live` — values were **read** from the cluster (`statement_timeout=0`, `idle_in_transaction_session_timeout=0`, `idle_session_timeout=0`, `max_connections=100`, role `rolconnlimit` unlimited). **No value was written**; the cluster was then destroyed. |
| **Documented for decision** | Scope per-role rather than cluster-wide; exempt the migration/tooling role; set the app timeout above the measured slowest good request; verify with `SHOW`, not by reading a config file; keep connection-pool sizing as a separate decision. |
| **Status** | **DOCUMENTED — no configuration applied, no defaults added** (as required) |

### PG-35-06 — LOW — Harness base-URL ambiguity (`E2E_BASE` vs `BASE`)
**Finding.** Different harnesses read different variables; some fell back to a default localhost target silently.

| | |
|---|---|
| **Code changed** | **New** `scripts/lib/test-base.mjs` — `resolveTestBase()`. **Modified** `scripts/test-idor-live.mjs`, `scripts/db/pg-backup-drill.mjs`. |
| **Behaviour now** | One documented convention (`E2E_BASE`, legacy `BASE` still accepted with a warning), **exit 2** when absent — never a silent default, never an implicit local server. Refuses non-loopback targets unless `E2E_ALLOW_REMOTE=yes`. Refuses production-like hostnames outright. |
| **Test evidence** | `unit` — 6 guard scenarios executed: no target → exit 2; loopback accepted; production-like hostname blocked; remote blocked; legacy `BASE` honoured; conflicting variables warn and `E2E_BASE` wins. `node --check` clean on both patched harnesses. |
| **Status** | **CODE REMEDIATED / VERIFIED** |

### PG-35-07 — INFO — Test commands not reproducible
**Finding.** Some suites were run ad hoc; commands, exit codes, and totals were not recorded, and `vitest` was referenced although it is not installed.

| | |
|---|---|
| **Code changed** | `package.json` — added `test:db-tls`, `test:storage`, `test:backup`; the aggregate `test` chain now includes `test:db-tls`. |
| **Behaviour now** | Every suite is reachable by a documented command using existing tooling (`tsx`/`node`). No claim of vitest coverage anywhere. Exact commands, exit codes and totals are recorded in §4. |
| **Status** | **REMEDIATED** |

---

## 3. Storage decision note

Full analysis: **`PHASE_36_STORAGE_DECISION.md`**. **Dependency: BLOCKED. No provider chosen, no bucket created, no credentials requested, no external infrastructure touched.**

| | **Option A — persistent local volume** | **Option B — complete S3-compatible adapter** |
|---|---|---|
| Code required | **None** — already implemented and tested live | Replace the 105-line stub with a real implementation of **all 8 operations** |
| Config/secrets | `STORAGE_LOCAL_ROOT` + provider=local. No secrets | Endpoint, region, bucket, key id, secret; must come from a secret manager |
| Upload/download | Verified live (4 objects, cross-tenant denial proven) | Not implemented today |
| Backup/restore | **Not covered by the DB dump** — the volume needs its own snapshot schedule, coordinated with DB backups | Delegated to infrastructure that already does it |
| Multi-instance | **Breaks** — needs a shared filesystem; reintroduces a single point of failure | Native |
| Tenant isolation | Filesystem path isolation, verified | Key prefixes are **not** authorization; signing must be gated on app-level checks |
| Effort to ship | Zero engineering; needs a durable volume | Real engineering + an authorized disposable test bucket |
| Verdict | Only path the current architecture supports **without new code**; correct for a single instance with a durable volume | Only path that survives multi-instance; **not** a configuration change |

The organization must choose one. What is **not** acceptable — and is now technically impossible — is enabling `s3` to "unblock" staging: there is no implementation behind it, and startup refuses it.

---

## 4. Test results

Every row states its **environment label** and **result type**. Results from different environments are never combined into one aggregate pass.

### 4.1 Environment labels

| Label | Meaning | Present? |
|---|---|---|
| E1 | SQLite disposable copy | yes |
| E2 | local PostgreSQL, no TLS | not used in Phase 36 |
| **E3** | **local PostgreSQL 17 with authenticated TLS** | **yes** |
| E4 | organizational staging PostgreSQL | **ABSENT** |
| E5 | organizational object storage | **ABSENT** |

### 4.2 Repository environment (E1/repository — unit & static)

| # | Command | Exit | Result | Type |
|---|---|---|---|---|
| 1 | `npm run typecheck` | **0** | clean | static |
| 2 | `node --conditions=react-server --import tsx scripts/test-server-env.ts` | **0** | PASS — 7 TLS rejections, S3 rejected (prod+dev), local accepted, SQLite prod rejected, short secret rejected, no secret echoed | unit |
| 3 | `npx tsx scripts/test-db-tls.ts` | **0** | **32 passed / 0 failed / 0 skipped** | unit |
| 4 | `npx tsx scripts/test-storage-regression-simple.mjs` | **0** | **21 passed / 0 failed** | unit |
| 5 | `npx tsx scripts/test-backup-recovery.mjs` | **0** | **22 passed / 0 failed** | unit |
| 6 | `npx tsx scripts/test-idor-simple.mjs` | **0** | **15 passed / 0 failed** | unit |
| 7 | `node scripts/test-production-env.mjs` | **0** | PASS — incl. new strict-TLS and S3-rejection assertions | unit |
| 8 | **`npm test`** (aggregate) | **0** | all chained suites pass | unit |
| 9 | `node --check` on 5 patched/added harnesses | **0** | clean | static |

### 4.3 Local PostgreSQL 17 with authenticated TLS (E3 — live integration)

Cluster: disposable PostgreSQL 17.11, `ssl=on`, throwaway PKI (SAN `DNS:localhost`), application role non-superuser, no CREATEDB/CREATEROLE/replication/RLS-bypass.

| # | Command | Exit | Result | Type |
|---|---|---|---|---|
| 10 | `node scripts/db/pg-tls-check.mjs` | **0** | **11 passed / 0 failed**, incl. rogue-CA rejection; TLSv1.3 | live |
| 11 | `node scripts/db/pg-migrate.mjs deploy --yes` **onto an emptied schema** | **0** | **5/5** migrations applied from scratch | live |
| 12 | `npx prisma migrate diff --from-schema-datamodel … --to-url …` | 0 | *"This is an empty migration."* — **no drift** | live |
| 13 | `node scripts/db/pg-verify-structure.mjs` | **0** | **40 passed / 0 failed** | live |
| 14 | `NODE_OPTIONS=--max-old-space-size=1400 npx next build` | **0** | production build ok; `/health` and `/health/live` both emitted as dynamic routes | static build |
| 15 | `E2E_BASE=http://127.0.0.1:4035 node scripts/test-idor-live.mjs` | **0** | **50 passed / 0 failed** | live |
| 16 | `E2E_BASE=http://127.0.0.1:4035 node scripts/db/pg-backup-drill.mjs` | **0** | **20 passed / 0 failed** — restore into separate disposable DB, 213 tables, tenant partition preserved, target dropped after | live |
| 17 | `POST /api/admin/backups/database` (admin) | — | **HTTP 201**, `VERIFIED`, 3,059,351 B, 771 ms | live |
| 18 | `POST /api/admin/backups/database` (teacher / learner) | — | **HTTP 403 / 403** | live |
| 19 | `GET /health/live` with DB **up / down / restored** | — | **200 / 200 / 200** | live |
| 20 | `GET /health` with DB **up / down / restored** | — | **200 / 503 / 200** (no app restart) | live |
| 21 | Boot with `STORAGE_PROVIDER=s3` (complete synthetic config) | non-zero | **startup aborted** — "S3 storage is not implemented…"; 0 credential matches in output | live |

Live artifact: `e2e/pg34/live-results-postgresql-tls-p36.json` (50/50 with environment metadata).

### 4.4 NOT RUN — and why

| Item | Reason |
|---|---|
| Any test against **organizational staging PostgreSQL (E4)** | environment does not exist / not supplied |
| Any test against **organizational object storage (E5)** | not supplied; adapter is a stub and now refused |
| Live authenticated-TLS backup against **staging** | requires E4 — the local TLS backup **was** executed (row 17) and must not be read as staging evidence |
| Restore drill into **staging** | requires E4 |
| `statement_timeout` values | deliberately not applied (PG-35-05) |
| Production-mode `next start` against the loopback database | **correctly refused** by the intentional production guard that rejects `localhost`/`127.0.0.1` and non-HTTPS `PUBLIC_APP_URL`. Recorded as a **positive control**, not a failure; weakening it to make a local test pass was expressly forbidden. All runtime evidence above therefore comes from `next dev` against the local TLS cluster, labelled as such. |

### 4.5 Honest notes on harness behaviour during this phase

- Two suites initially reported failures that were **harness configuration**, not product defects: `STORAGE_LOCAL_ROOT` was unset (making own-tenant downloads 404 — documented as the PG-34-04 footgun in the runbook), and `e2e/fixtures.json` held fixture IDs from a different database. Both were root-caused; neither was converted to a pass by weakening an assertion.
- One `/health/live` **500** was observed once on a cold `next dev` compile (`__webpack_modules__[moduleId] is not a function`) and did not recur across 11 subsequent requests or in the production build. Recorded rather than hidden.
- The `env: s3 requires vars` assertion **passed for the wrong reason** after PG-35-02 (it removed the variables, so it threw for missing config, not for being unimplemented). It was rewritten into two assertions that check the real invariant — S3 is rejected even with a complete config, and the rejection does not echo credentials. Count 20 → 21.

---

## 5. Change inventory

### 5.1 Files

**New (7)**
| File | Purpose |
|---|---|
| `src/lib/db-tls.ts` (163 L) | TLS audit, problem descriptions, libpq translation, same-target check |
| `src/lib/backup/connection.ts` (63 L) | backup/recovery URL resolution + error sanitizer |
| `src/app/health/live/route.ts` | liveness endpoint, zero I/O |
| `scripts/lib/test-base.mjs` (84 L) | `resolveTestBase()` convention + guards |
| `scripts/test-db-tls.ts` (233 L) | 32 TLS/URL translation assertions |
| `PHASE_36_STORAGE_DECISION.md` (84 L) | storage decision gate |
| `PHASE_36_DATABASE_TIMEOUTS.md` (89 L) | PG-35-05 guidance, no values applied |

**Modified (15)**
`src/lib/server-env.ts` · `src/lib/storage/index.ts` · `src/lib/system-health.ts` · `src/app/health/route.ts` · `src/lib/backup/database.ts` · `src/lib/backup/recovery.ts` · `.env.example` · `scripts/test-server-env.ts` · `scripts/production/check-env.mjs` · `scripts/test-idor-live.mjs` · `scripts/db/pg-backup-drill.mjs` · `scripts/db/pg-tls-check.mjs` · `scripts/test-production-env.mjs` · `scripts/test-storage-regression-simple.mjs` · `package.json` · `_STAGING_RUNBOOK.md`

**Artifacts**
`e2e/pg34/live-results-postgresql-tls-p36.json` · `e2e/live-results.json` · `e2e/fixtures.json`

### 5.2 Migrations and schema

| Item | Before | After |
|---|---|---|
| `prisma/schema.prisma` provider | `sqlite` | **`sqlite` (unchanged)** |
| SQLite migrations | 4 + `sqlite` lock | **4 + `sqlite` lock (unchanged)** |
| `prisma/postgresql/migrations` | 5 + `postgresql` lock | **5 + `postgresql` lock (unchanged)** |
| New migrations added | — | **none** |
| `prisma/migrations.postgresql/MANIFEST.sha256` | 4/4 verified | **4/4 verified (unchanged)** |
| Datamodel changed | — | **no** |

### 5.3 Database and workspace state

| Item | Before Phase 36 | After Phase 36 |
|---|---|---|
| `prisma/dev.db` SHA-256 | `e9b4eac119cc44941d7cdea88c1429945fce40dd1ee7c548759bcfbc68f7fb02` | **identical** |
| `prisma/dev.db` size | 4,517,888 B | **identical** |
| Generated Prisma client | `sqlite` | **`sqlite`** (regenerated PG-side only for tests, then restored) |
| `.env` | unchanged | unchanged — parked during one experiment, **restored and hash-verified** (`6da80015…33cb`) |
| Disposable PostgreSQL cluster | local, TLS | **stopped; throwaway PKI deleted** |
| Temporary files | — | `/tmp/pg36tls`, scratch scripts, msmtp-style logs removed |

**Secret scan: 0 real credential matches** across all 21 changed source/config files and all 5 deliverables written in this phase. Four matches were pre-existing synthetic placeholders (`user:pass@` in `.env.example`, `phase36:synthetic-password`, `phase27:synthetic-only`, `const PW = "synthetic-password"`). No connection string, password, CA content, or key appears in any report, log, or response.

---

## 6. Remaining blockers

| # | Blocker | Severity | Owner | What unblocks it |
|---|---|---|---|---|
| B1 | **No organizational staging PostgreSQL (E4).** TLS behaviour, migrations, backup and restore have only ever been proven against a loopback cluster. | CRITICAL for staging approval | Organization | Provide a disposable staging database + its CA certificate path. Then run `_STAGING_RUNBOOK.md` §16 including the rogue-CA probe. |
| B2 | **No object storage decision (E5).** Option A vs Option B unresolved; `s3` is refused by design. | HIGH | Organization | Make the decision recorded in `PHASE_36_STORAGE_DECISION.md` §4. |
| B3 | **File backups are not covered by the database backup.** A DB dump alone is not a complete backup. | HIGH | Organization / ops | Choose a file-snapshot mechanism coordinated with DB backups (Option A) or rely on object storage versioning (Option B). |
| B4 | **Timeout/connection-limit values unset** (`statement_timeout=0`, `idle_in_transaction_session_timeout=0`). | LOW | DBA | Measure the workload, then apply per-role values per `PHASE_36_DATABASE_TIMEOUTS.md`. |
| B5 | **Probe wiring in the real orchestrator** is unverified; only the endpoints are proven. | LOW | Ops | Point `livenessProbe` at `/health/live` and `readinessProbe` at `/health`; confirm on the real deployment. |
| B6 | **Production-mode startup against a loopback DB is refused** by an intentional guard. Not a defect, but it means local production-parity runs require a non-loopback host with a matching certificate SAN and HTTPS app URL. | INFO | — | Use real staging (B1) rather than weakening the guard. |

---

## 7. One safest next action

> **Obtain a disposable organizational staging PostgreSQL database together with the CA certificate path that its certificate chains to, then run `_STAGING_RUNBOOK.md` §16 — including the required rogue-CA probe — before approving staging.**

Rationale: this single step converts every "verified locally" row in the closure matrix into staging evidence, and it is the only step that can turn this report into a PASS. It requires no code change, no new dependency, and no production access. The storage decision (§3) can proceed in parallel but does not block it: staging can run on `STORAGE_PROVIDER=local` with a durable volume while the decision is pending.

---

### Standing constraints honoured

No production system was touched. `prisma/dev.db` is byte-identical. No `db push`, no `migrate reset`, no `--accept-data-loss`, no destructive migration. No credential, URL, password, key, or certificate content appears in this report, in any log, or in any repository file. Every destructive or state-changing test ran against a disposable database or an isolated temp directory, and the restore drill's target was dropped afterwards. Mocks were used only for unit tests and are labelled as such; every claim of working behaviour rests on live execution. Unavailable evidence is recorded as **NOT RUN with its reason**, never inferred from configuration. Phase 37 was not started.
