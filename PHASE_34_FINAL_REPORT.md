# Phase 34 — PostgreSQL Staging Provisioning, Migration Compatibility & Integration Validation

**Status: `PHASE 34 PARTIAL / POSTGRESQL CONFIGURATION PENDING`**

**Date:** 2026-10-25
**Scope:** establish a safe, reproducible PostgreSQL staging path — or a precise blocker report.
**Production touched:** no. **`prisma/dev.db` modified:** no (hash identical before and after).
**Phase 35 started:** no.

---

## 0. Why the status is PARTIAL and not READY

Everything that can be proven without an organizational staging account **is proven, on real
PostgreSQL 17.11** — not on SQLite, not on a mock, not by static inspection:

| Proof | Result | Where |
|---|---|---|
| Full migration history applies to an empty PostgreSQL database | **5/5 migrations, exit 0** | §6 |
| Schema drift between migrations and `schema.prisma` | **"No difference detected"** | §6 |
| Structural parity (tables, columns, FKs, indexes, constraints) | **40/40 checks** | §6 |
| Application runs against PostgreSQL | **live suite 50/50** | §7 |
| Tenant isolation / IDOR enforcement on PostgreSQL | **50/50, 0 failures** | §8 |
| Backup and isolated restore of the PostgreSQL database | **20/20 checks** | §9 |
| Same suite on SQLite (provider-parity control) | **50/50** | §8 |

The status is **not** READY because the database that all of the above ran against is a
**local disposable cluster on the build machine** — created for this phase, on loopback, with
TLS disabled — and **not** an organizational staging database:

- No organizational staging host, role, or credential was provided, and this phase is forbidden
  from inventing them. None were invented.
- **TLS was never exercised** (`sslmode=disable`, loopback only). TLS correctness is untested.
- No PostgreSQL version other than the local 17.11 was tested. Cross-major-version compatibility
  is unmeasured.
- Object storage (S3) was never exercised on PostgreSQL; only local filesystem storage was.
- **RPO/RTO are not measured.** One restore was timed; a single local drill is not an RPO/RTO.

Those are configuration and provisioning gaps, not code gaps. The runbook in
`_STAGING_RUNBOOK.md` turns the remaining work into a short, mechanical operator task.

---

## 1. Executive summary

Phase 34 resolved the "two uncontrolled sources of truth" problem by making exactly **one**
hand-edited schema and **two** generated/verified migration trees:

- `prisma/schema.prisma` — the only hand-edited schema. Provider remains `sqlite`.
- `prisma/postgresql/schema.prisma` — **generated** from it; differs by exactly one line
  (the `provider`), enforced by a `--check` drift gate.
- `prisma/migrations/` — SQLite history, **untouched** by this phase.
- `prisma/migrations.postgresql/` — archived PostgreSQL history + `MANIFEST.sha256`, **untouched**.
- `prisma/postgresql/migrations/` — the PostgreSQL workspace actually deployed: 3 archived
  migrations copied verbatim + 2 new parity migrations.

Two real PostgreSQL-parity defects were found and fixed additively. Neither was visible from
SQLite, and the first was not visible from static inspection alone — it surfaced by diffing the
migrated archive against the generated DDL, and the second only surfaced by running
`prisma migrate diff` **against real PostgreSQL**.

| ID | Severity | Defect | Found by | Fix |
|---|---|---|---|---|
| PG-34-01 | **HIGH** | `content_media."organizationId"` had **no foreign key** anywhere in the PostgreSQL history | DDL diff of archive vs generated schema | `20261010000003_phase34_content_media_fk` |
| PG-34-02 | **MEDIUM** | `updatedAt` carried an undeclared DB default `CURRENT_TIMESTAMP` on both file tables | `prisma migrate diff` on real PG 17.11 | `20261010000004_phase34_drop_updatedat_default` |

Both migrations are **additive and PostgreSQL-workspace only**. No archived file was modified
(`MANIFEST.sha256` verifies 4/4 after every operation), and the SQLite history was not touched.

---

## 2. What was actually executed (vs. inferred)

Every result below came from a command that ran to completion. Nothing is inferred from
configuration or from how the code looks.

- A local **PostgreSQL 17.11** (Debian package, free, no cloud, no cost) was installed under the
  user's explicit authorization, with a dedicated database `lms_staging_disposable` and a
  **non-superuser** application role (`NOSUPERUSER NOCREATEDB NOCREATEROLE`, verified).
- Credentials live **outside the repository** in a mode-600 file under `/tmp` and were never
  printed, logged, or committed. A scan of the workspace for the credential value returned
  **no hits** outside `node_modules`; the one npm debug log that echoed the URL had it redacted
  by npm to `***` and was deleted anyway.
- The app was run as a real Next.js dev server (`next dev -p 4035`) against PostgreSQL and
  exercised over **real HTTP** — the IDOR suite is not a unit test and does not import the app.

---

## 3. 34A — Repository and environment re-verification

| Check | Expected | Actual | Evidence | Status |
|---|---|---|---|---|
| Source schema provider | `sqlite` | `sqlite` | `prisma/schema.prisma:18` | PASS |
| Source schema models | 213 | 213 | 4,312 line file | PASS |
| `prisma/dev.db` hash | `e9b4eac1…7fb02` | identical before **and** after | `sha256sum prisma/dev.db` | PASS |
| `prisma/dev.db` size | 4,517,888 B | 4,517,888 B | `stat` | PASS |
| `prisma/dev.db` migrated by this phase | never | never | guarded commands refuse it (exit 2) | PASS |
| SQLite migration history | 4 entries, lock `sqlite` | unchanged | `ls prisma/migrations/` | PASS |
| Archived PG history | 4/4 manifest OK before & after | 4/4 OK | `sha256sum -c MANIFEST.sha256` | PASS |
| Archived PG history modified | never | never | manifest re-verified after every op | PASS |
| PostgreSQL binaries present | available | 17.11 client + server | `psql --version` | PASS |
| Anything already on 5432/5433 | nothing | nothing | socket scan | PASS |
| Pre-existing PG env vars | none | none | environment probe (names only) | PASS |
| Container runtime available | n/a | none | probe | NOT RUN (not needed; native package used) |
| `npm run typecheck` | clean | exit 0 | `tsc --noEmit` | PASS |
| `npm run build` | succeeds | exit 0 | see note below | PASS |
| `npm test` | pass | pass | project test chain | PASS |
| Storage unit tests | pass | 20 passed / 0 failed | `e2e/storage` suite | PASS |
| Backup unit tests | pass | 22 passed / 0 failed | backup suite | PASS |
| IDOR simple checks | pass | 15 passed / 0 failed | `idor-simple` | PASS |
| Migration rehearsal (SQLite) | pass | 22 passed / 0 failed | `scripts/db/rehearse-migration.mjs` | PASS |
| Migrated-DB verification (SQLite) | pass | 38 passed / 0 failed | `scripts/db/verify-db.mjs` | PASS |
| `prisma/dev.db` P2022 drift | known Phase 33 B3 | 2 FAIL (expected) | `p2022-check.mjs` | NOT RUN (deliberate — see `_BLOCKERS.md` B3) |
| Organizational staging credentials | supplied by owner | none supplied | — | BLOCKED (not invented) |
| TLS to a real PostgreSQL server | verified | never exercised | `sslmode=disable` | NOT RUN |
| S3 object storage on PostgreSQL | verified | never exercised | local FS only | NOT RUN |

**Build note.** `npm run build` first died with a JavaScript heap OOM (SIGABRT at ~925 MB) on this
1.98 GB / 2-core machine with no swap. It succeeded (exit 0) after stopping PostgreSQL and raising
the heap: `NODE_OPTIONS=--max-old-space-size=1400 npm run build`. `npm run typecheck` is clean when
run **standalone**; it gets OOM-killed ("Killed") if run concurrently with the build. This is a
machine-resource constraint, not a code defect — but it is a real constraint for CI sizing.

---

## 4. 34B — One source of truth, two migration trees

**The rule.** `prisma/schema.prisma` is the only file a human edits. The PostgreSQL schema is
generated from it by `scripts/db/generate-postgres-schema.mjs`, which refuses to write if the
delta is anything other than the single `provider` line. `prisma/postgresql/schema.prisma` is
4,317 lines vs. the source 4,312 lines (the difference is comments plus the provider line; the
delta check compares normalized schema bodies and reports **exactly one changed line**).

**Why a separate workspace rather than a provider switch.** Switching `prisma/schema.prisma` to
`postgresql` in place would change which `migrations/` directory the tooling reads and would
break the SQLite path that Phase 33 established. The workspace keeps both paths live and keeps
the committed provider at `sqlite`, so a switch is a deliberate, reviewable act — never silent.

**Never fabricated.** No row was inserted into `_prisma_migrations` by hand; every row in that
table was written by `prisma migrate deploy`. The workspace's `migration_lock.toml` is
`provider = "postgresql"`, but the SQLite lock file is untouched and a check asserts the
PostgreSQL lock does not leak into the SQLite directory.

---

## 5. 34C — Environment discovery (names only, no values)

Variables the Phase 34 tooling reads. **Values are never printed**; the connection URL is redacted
in every log path.

| Variable | Purpose | Sensitivity |
|---|---|---|
| `PG_STAGING_DATABASE_URL` | the one staging target for all `pg-*.mjs` scripts | **secret** (contains password) |
| `PG_STAGING_DISPOSABLE` | must equal `yes` for destructive-capable operations | not secret |
| `PG_STAGING_LABEL` | human label printed in evidence lines | not secret |
| `PG_STAGING_OWNER_ROLE` | optional override for the restore-drill DB owner | not secret |
| `SEED_TARGET_URL` | seed fixtures into a non-SQLite database | **secret** in practice |
| `SEED_TARGET_DB` | seed fixtures into an already-migrated SQLite copy | not secret |
| `DATABASE_URL` | the app's runtime target | **secret** |
| `STORAGE_LOCAL_ROOT` | filesystem storage root for the app | not secret |
| `E2E_BASE` / `BASE` | base URL for the HTTP suites (different names, by design) | not secret |
| `E2E_ADMIN`, `E2E_PASSWORD` | fixture credentials for the HTTP suites | **secret** |

**Finding (MEDIUM, tooling):** the two HTTP harnesses read the base URL from **different**
variables — `scripts/test-idor-live.mjs` uses `E2E_BASE`, `scripts/db/pg-backup-drill.mjs` uses
`BASE`. This cost one wasted run during this phase. Documented in the runbook; not changed, to
avoid invalidating prior evidence.

---

## 6. 34D — Migration compatibility and rehearsal (real PostgreSQL 17.11)

Run against a **from-empty** database (`DROP SCHEMA public CASCADE; CREATE SCHEMA public;`) to
prove the whole history works, not just the tail:

```
node scripts/db/pg-migrate.mjs deploy --yes      → all migrations applied, exit 0
node scripts/db/pg-migrate.mjs diff              → No difference detected.
node scripts/db/pg-verify-structure.mjs          → 40 passed, 0 failed
```

- **879-statement archived baseline executes unmodified** on PostgreSQL 17.11.
- `_prisma_migrations`: 5 rows, **all finished, none rolled back**, `applied_steps_count = 1` each.
- Structure: **213 application tables**, **2,002 application columns** (2,010 including Prisma's own
  8-column `_prisma_migrations`), **278 foreign keys**, **102 non-PK unique indexes**,
  **0 invalid constraints**, **every table has a primary key**.
- The 18 columns introduced by the Phase 30 storage migration verify with **exact** PostgreSQL
  types (`text`, `integer`, `timestamp without time zone`), not just "a column exists".
- `content_media.updatedAt` has **no** database default (defect PG-34-02 closed).
- `content_media_organizationId_fkey` exists, targets `organizations`, `ON DELETE SET NULL`
  (defect PG-34-01 closed).
- `migrate status` is idempotent and reports "up to date" on repeat runs.

Full construct-by-construct classification is in `_MIGRATION_COMPATIBILITY.md`.

**Type facts** (from the 5,290-line generated DDL): 1,321 `TEXT`, 404 `TIMESTAMP(3)`,
165 `INTEGER`, 92 `BOOLEAN`, 18 `DOUBLE PRECISION`, 2 `BYTEA` (only `pdfBytes` on certificates —
the one place where file bytes in the database are architecturally required). **Zero** `SERIAL`,
**zero** `GENERATED … AS IDENTITY`, **zero** extensions (`pgcrypto`, `uuid-ossp`, `citext`,
`hstore`), **zero** `JSONB`, **zero** numeric/decimal columns. IDs are `TEXT` (CUID), so there is
no sequence state to migrate and no hidden coupling to an identity generator.

**Note on a false alarm:** grepping the DDL for `SERIAL`/`IDENTITY` returns hits — all of them are
identifiers (`pointBiserial`, `identityEnabled`, `external_identity_links`). There are no sequence
or identity columns.

---

## 7. 34E — Runtime integration (real HTTP, real PostgreSQL)

The app was started with `DATABASE_URL` pointed at the disposable staging database and exercised
over HTTP by the full live suite.

```
DATABASE_URL=<staging> STORAGE_LOCAL_ROOT=$PWD/e2e/storage npx next dev -p 4035
E2E_BASE=http://127.0.0.1:4035 node scripts/test-idor-live.mjs
→ Results: 50 passed, 0 failed
```

Database-side proof that the app really wrote to PostgreSQL (not to a SQLite file):

| Table | Rows | Meaning |
|---|---:|---|
| `users` | 11 | fixtures + suite-created users |
| `organizations` | 2 | E2E Alpha Academy, E2E Bravo Institute |
| `content_media` | 2 | one per tenant |
| `message_attachments` | 2 | one per tenant |
| `user_sessions` | 8–12 | grows as the suite logs in (point-in-time) |
| `audit_logs` | 3 | includes `CROSS_TENANT_ACCESS` with actor and target org ids |

Tenant partitioning was confirmed in SQL: media is **1 / 1** across the two tenants, and
**0** rows have a `NULL` `organizationId`. A cross-tenant *write* attempt (a user posting with a
spoofed organization header) landed in the **actor's** organization (`E2E_ALPHA`), which is the
correct behaviour.

**Fail-closed targeting.** The seed refuses to fall back to `prisma/dev.db`: with
`SEED_TARGET_URL` it performs **no copy and no DDL**, asserts the schema exists, and fails if it
does not. The guarded migrate script refuses `prisma/dev.db` (exit 2), a PostgreSQL URL for the
SQLite tooling (exit 2), and any production-like target (exit 1).

---

## 8. 34F — Security suite on PostgreSQL (not BLOCKED, because a real server existed)

| Case group | Count | Result on PostgreSQL | Result on SQLite (control) |
|---|---:|---|---|
| `L*` — authorized workflows must still work | 16 | 16 pass | 16 pass |
| `D*` — cross-tenant and privilege denials | 34 | 34 pass | 34 pass |
| **Total** | **50** | **50 passed, 0 failed** | **50 passed, 0 failed** |

Artifacts: `e2e/pg34/live-results-postgresql.json` (base `:4035`, PostgreSQL) and
`e2e/pg34/live-results-sqlite-parity.json` (base `:4036`, SQLite).

No test was weakened, skipped, or made conditional to reach these numbers. The `D*` denials are
genuine `403`/`404` responses observed on the wire, and the app's structured logs record the
denials with actor and target identifiers.

**Two failures during this phase were harness bugs, not application regressions — and both were
diagnosed rather than papered over:**

1. **Stale fixture pointer (12 failures).** The suite reads `e2e/fixtures.json`, which is
   *written by the seed*. A prior SQLite run had overwritten it, so the suite looked up
   SQLite-era IDs against PostgreSQL and got `404 User not found`. Proof it was not an app defect:
   the app authenticated real PostgreSQL users (actor IDs from the PG row set) and every
   *expected* denial still returned the expected denial. Fixed properly by rebuilding the staging
   database from empty, re-deploying migrations, and re-seeding so fixtures and data agree.
2. **Missing `STORAGE_LOCAL_ROOT` (2 failures).** `getStorageRoot()` defaults to `<cwd>/storage`,
   but the fixtures live in `e2e/storage`, so own-tenant downloads 404'd. This is a **harness
   configuration gap**, not an authorization failure — the log event was `DOWNLOAD_AUTH_FAILURE`
   on a record whose bytes were not reachable at the configured root. Fixed by setting
   `STORAGE_LOCAL_ROOT` in the start command (now mandatory in the runbook).

Both are recorded rather than hidden, because "50/50" is only meaningful together with the
configuration that produced it.

---

## 9. 34G — Backup and restore readiness (20/20, no RPO/RTO claimed)

```
BASE=http://127.0.0.1:4035 node scripts/db/pg-backup-drill.mjs
→ 20 passed, 0 failed
```

- The app's own backup path produced a real `pg_dump` custom-format archive:
  **576,948 bytes**, status `VERIFIED`, app round-trip 360 ms.
- `pg_restore` into a **throwaway** database (`lms_staging_restore_drill`) completed in
  **669 ms** with no error.
- Stable tables restore **exactly** (`users` 11, `organizations` 2, `content_media` 2,
  `message_attachments` 2, `courses` 2, `lessons` 2).
- Volatile tables (`user_sessions`, `audit_logs`) are compared **point-in-time**: the drill itself
  logs in while running, so equality would be a false expectation. They are asserted to fall
  within the pre/post-dump bounds.
- The restored database has **213 tables**, the `content_media` tenant FK, tenant data still
  partitioned, **no orphaned `content_media` rows**, and **no `NULL`-tenant media**.
- The restore database is **dropped** afterwards; the source database is never the restore target
  (asserted).
- **Authorization was verified negatively too:** learner and teacher accounts get `403` on backup
  creation.

**Honest limitation.** One local restore of a 577 KB database says nothing about recovery
objectives for a real dataset. **No RPO and no RTO are claimed.** A restore drill on
representative volume, on real hardware, with the actual backup schedule, is required before any
recovery objective is stated. Backup coverage is also *not* implied by a database backup: object
storage and the configuration/secrets inventory are outside this drill.

---

## 10. 34H — Safe scripts and the guard matrix

Every DB-changing script takes an explicit target, rejects production-like targets, never prints
credentials, defaults to dry-run, and exits non-zero on failure.

| Script | Purpose | Guards |
|---|---|---|
| `generate-postgres-schema.mjs` | generate the PG schema from the single source | `--check` fails on any delta other than the provider line |
| `build-postgres-workspace.mjs` | assemble the PG migration workspace | `--verify` re-hashes the archive; asserts the SQLite lock is not leaked |
| `pg-preflight.mjs` | prove the target is disposable before anything changes | no URL → exit 2; prod-like host → exit 1; unconfirmed disposable → exit 2; `file:` URL → exit 1 |
| `pg-migrate.mjs` | `status` / `deploy` / `diff` / `resolve` | `deploy` requires `--yes`; exit 2 otherwise |
| `pg-verify-structure.mjs` | 21 assertion sites → 40 executed checks | read-only; refuses to run without a target |
| `pg-backup-drill.mjs` | backup + isolated restore drill | refuses non-disposable targets; requires the app up; asserts restore ≠ source; drops the restore DB |

Guard probes were **executed**, not assumed:

| Probe | Expected | Actual |
|---|---|---|
| `pg-preflight` with no URL | exit 2 | exit 2 |
| `pg-preflight` with a production-like host | exit 1 UNSAFE | exit 1 |
| `pg-preflight` with `PG_STAGING_DISPOSABLE` unset | exit 2 | exit 2 |
| `pg-preflight` with a `file:` SQLite URL | exit 1 | exit 1 |
| `pg-migrate deploy` without `--yes` | exit 2 | exit 2 |

**Known quirk:** `prisma migrate status` exits `1` when migrations are *pending*. The wrapper
treats that as "pending", not as a command failure. Documented so no future run "fixes" it back
into a false alarm.

---

## 11. Findings

| ID | Severity | Finding | Status |
|---|---|---|---|
| PG-34-01 | **HIGH** | Missing `content_media` → `organizations` FK in the entire PostgreSQL history; a PG database built from the archive does not match the schema and loses referential integrity for tenant-owned media | Fixed additively, verified present at runtime |
| PG-34-02 | **MEDIUM** | Undeclared `CURRENT_TIMESTAMP` default on `updatedAt` for `content_media` and `message_attachments`; permanent drift and endless no-op migrations | Fixed additively, verified absent |
| PG-34-03 | **MEDIUM** | Two HTTP harnesses read the base URL from different variables (`E2E_BASE` vs `BASE`) | Documented in runbook |
| PG-34-04 | **MEDIUM** | The app silently defaults `STORAGE_LOCAL_ROOT` to `<cwd>/storage`; a staging app started without it looks like an authorization failure (404) on downloads | Runbook now makes it mandatory; **recommend a startup assertion in a later phase** |
| PG-34-05 | **LOW** | `pg-backup-drill.mjs` hard-coded the restore-database owner role | Fixed — derives the owner from the staging URL, overridable via `PG_STAGING_OWNER_ROLE`; drill re-run 20/20 |
| PG-34-06 | **LOW** | Build OOMs on a 1.98 GB box with default heap and no swap | Documented; `NODE_OPTIONS=--max-old-space-size=1400` required |
| — | INFO | No PostgreSQL-only features (enums, `Json`, `Decimal`, `BigInt`, arrays, extensions) exist in the schema, so there is no remaining provider-specific divergence to reconcile | Verified by classification |
| — | INFO | IDs are `TEXT` CUIDs, so no sequence/identity state exists to migrate | Verified |

---

## 12. What is NOT proven (read this before planning the cutover)

1. **No organizational staging database exists yet.** The validated target was a local,
   disposable cluster on loopback. It is not the staging service the phase asks for.
2. **TLS is untested.** `sslmode=disable` on loopback. Certificate validation, hostname
   verification, and any proxy/terminator behaviour are unverified.
3. **Cross-version compatibility is unmeasured.** Only PostgreSQL 17.11 was used. Behaviour on
   13/14/15/16 is unknown.
4. **Managed-service behaviour is unmeasured** (connection limits, statement timeouts, failover,
   logical replication, read replicas).
5. **S3 object storage on PostgreSQL is unverified.** Only local filesystem storage was exercised.
   Backup coverage for object storage is not established.
6. **RPO/RTO are unmeasured** — one 577 KB local restore is not a recovery objective.
7. **`prisma/dev.db` is still un-migrated** (Phase 33 blocker B3). Two `P2022` failures remain on
   it. This is deliberate — that file is read-only by rule — and it is **not** a PostgreSQL
   finding.
8. **No load, concurrency, or performance testing** was performed on PostgreSQL.
9. **No data migration from the real SQLite dataset to PostgreSQL** was performed. Only synthetic
   fixtures were used. A real-data rehearsal is a separate, larger piece of work.

---

## 13. Changed files

**New — PostgreSQL schema and migration workspace**

| File | Lines | Note |
|---|---:|---|
| `prisma/postgresql/schema.prisma` | 4,317 | GENERATED from the source; 1-line delta, `--check` enforced |
| `prisma/postgresql/migrations/migration_lock.toml` | 1 | `provider = "postgresql"` |
| `prisma/postgresql/migrations/20261007183000_postgresql_baseline/` | — | copied verbatim from the archive |
| `prisma/postgresql/migrations/20261010000000_phase30_storage_metadata/` | — | copied verbatim |
| `prisma/postgresql/migrations/20261010000001_phase32_tenant_isolation/` | — | copied verbatim |
| `prisma/postgresql/migrations/20261010000003_phase34_content_media_fk/migration.sql` | 25 | **new** — fixes PG-34-01 |
| `prisma/postgresql/migrations/20261010000004_phase34_drop_updatedat_default/migration.sql` | 13 | **new** — fixes PG-34-02 |

**New — scripts**

| File | Lines | Purpose |
|---|---:|---|
| `scripts/db/generate-postgres-schema.mjs` | 79 | generate + `--check` drift gate |
| `scripts/db/build-postgres-workspace.mjs` | 164 | build + `--verify` the PG migration workspace |
| `scripts/db/pg-preflight.mjs` | 130 | prove the target is disposable |
| `scripts/db/pg-migrate.mjs` | 81 | `status` / `deploy` / `diff` / `resolve` |
| `scripts/db/pg-verify-structure.mjs` | 110 | 40 structural checks |
| `scripts/db/pg-backup-drill.mjs` | ~170 | backup + isolated restore drill |

**Modified**

| File | Change | Risk |
|---|---|---|
| `e2e/seed.ts` | added `SEED_TARGET_URL` support; skips all SQLite DDL on PostgreSQL | additive; SQLite path unchanged and re-verified |

**Modified after evidence was captured** (re-validated by a full drill re-run)

| File | Change |
|---|---|
| `scripts/db/pg-backup-drill.mjs` | restore DB owner derived from the staging URL (PG-34-05); drill re-run → 20/20 |

**Generated evidence / test artifacts**

| Path | Content |
|---|---|
| `e2e/pg34/generated-postgres.sql` | authoritative PG DDL, 5,290 lines, 213 tables |
| `e2e/pg34/live-results-postgresql.json` | 50/50 on PostgreSQL |
| `e2e/pg34/live-results-sqlite-parity.json` | 50/50 on SQLite |
| `e2e/pg34/fixtures-postgresql.json` | fixture IDs used for the PostgreSQL run |
| `e2e/mig33/p34-runtime.db` | rebuilt from `rehearsal-clean.db`, seeded — scratch artifact |

**Deliberately NOT changed:** `prisma/schema.prisma` (provider stays `sqlite`), `prisma/dev.db`,
`prisma/migrations/**`, `prisma/migrations.postgresql/**`, any application source file, any
security/RBAC/isolation test. No feature work was done.

**Final workspace state:** Prisma Client regenerated for **sqlite**, PostgreSQL cluster
**stopped**, no listeners, `prisma/dev.db` hash unchanged, archive manifest 4/4 OK.

---

## 14. Operator checklist for the real staging environment

Do these in order. Full commands are in `_STAGING_RUNBOOK.md`.

- [ ] A staging PostgreSQL exists, is **not** production, and is **not** shared with production.
- [ ] A dedicated **non-superuser** role exists for the app (`NOSUPERUSER NOCREATEDB NOCREATEROLE`).
- [ ] TLS is enabled (`sslmode=verify-full` or your organization's equivalent) and the CA is trusted.
- [ ] The connection URL is stored in the secret manager — **never** in the repo, a report, or chat.
- [ ] `PG_STAGING_DATABASE_URL`, `PG_STAGING_DISPOSABLE=yes`, and `PG_STAGING_LABEL` are exported.
- [ ] `node scripts/db/pg-preflight.mjs` → `STATUS: READY`. **Stop if it is not.**
- [ ] `node scripts/db/pg-migrate.mjs deploy --yes` → exit 0.
- [ ] `node scripts/db/pg-migrate.mjs diff` → "No difference detected".
- [ ] `node scripts/db/pg-verify-structure.mjs` → 40/40.
- [ ] The app starts with an **explicit** `DATABASE_URL` **and** `STORAGE_LOCAL_ROOT` (or S3 config).
- [ ] The app's backup destination points at staging storage, never production buckets.
- [ ] `node scripts/test-idor-live.mjs` with `E2E_BASE` → 50/50.
- [ ] `node scripts/db/pg-backup-drill.mjs` with `BASE` → 20/20.
- [ ] A restore drill has been run on **representative volume** before any RPO/RTO is promised.
- [ ] You have confirmed in writing that this phase did **not** touch production.

---

## 15. The single safest next action

> **Provision one real staging PostgreSQL — non-production, non-shared, TLS enabled, non-superuser
> application role — then run the five commands in §14 unchanged against it.**

Nothing about the migration history, the workspace, or the scripts needs to change. The five
commands are already validated end-to-end on real PostgreSQL 17.11, so the remaining risk is
concentrated entirely in the *environment*: TLS, role privileges, connection limits, and storage
configuration. Running the identical commands on the real target converts every "NOT RUN" item in
§3 into a measured result — and it is reversible, because it touches nothing that holds
production data.

---

## 16. Reproduction (the exact commands used)

```bash
# 0. credentials live outside the repo
. /tmp/pg34.env            # exports PG_STAGING_DATABASE_URL, PG_STAGING_DISPOSABLE, PG_STAGING_LABEL

# 1. prove the target is disposable before changing anything
node scripts/db/pg-preflight.mjs                 # STATUS: READY, else stop

# 2. schema hygiene: one source of truth
node scripts/db/generate-postgres-schema.mjs --check
node scripts/db/build-postgres-workspace.mjs --verify

# 3. migrate and prove no drift
node scripts/db/pg-migrate.mjs deploy --yes
node scripts/db/pg-migrate.mjs diff              # "No difference detected"
node scripts/db/pg-verify-structure.mjs          # 40 passed, 0 failed

# 4. fixtures + app on PostgreSQL
SEED_TARGET_URL="$PG_STAGING_DATABASE_URL" npx tsx e2e/seed.ts
DATABASE_URL="$PG_STAGING_DATABASE_URL" STORAGE_LOCAL_ROOT="$PWD/e2e/storage" npx next dev -p 4035

# 5. security + backup on PostgreSQL
E2E_BASE=http://127.0.0.1:4035 node scripts/test-idor-live.mjs     # 50 passed, 0 failed
BASE=http://127.0.0.1:4035 node scripts/db/pg-backup-drill.mjs     # 20 passed, 0 failed

# 6. return to the default provider
npx prisma generate                              # back to sqlite
sudo pg_ctlcluster 17 main stop
```
