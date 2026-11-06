# Phase 28 — Database Migration Report

**Audit date:** 2026-10-07  
**Status:** BLOCKED — read-only SQLite source baseline completed; no database was changed and no PostgreSQL target was contacted.

## Current baseline

- Provider: SQLite in `prisma/schema.prisma`; Prisma and Prisma Client are 5.22.0. Package/application version: `0.1.0`; no Git revision is available in this workspace.
- Checked-in schema SHA-256: `559a211a8e79be6d0946a629c7e6cf52cdeb8c713298ce4e0d1590c942088431`; SQLite catalog/schema SHA-256: `edc4017d8b310c1675ac9c4e59a3c950dba7892cfb0fdbea42fc958663a3a25d`. No migration-ledger schema version exists.
- Schema: 213 models, 339 relation annotations, 287 explicit indexes, 33 single-field unique attributes, 69 composite unique constraints, and 5 composite primary keys. No `prisma/migrations/` directory or schema migration history exists.
- Authorized read-only source: `/home/user/prisma/dev.db` (4,517,888 bytes); 213 physical tables match all 213 Prisma model/table names; 3,716 total rows across 123 nonempty tables.
- Source checks: `PRAGMA integrity_check=ok`; `PRAGMA foreign_key_check` returned 0 violations; 314 unique indexes were checked with 0 duplicate non-null key groups; 9,057 null cells were counted across SQLite columns declared nullable. These are pre-migration source results only.
- Thirteen rows in `users` use the `@demo.example` email domain; no user values were printed. Other demo/test data counts are recorded per table in the Data Migration appendix; presence of demo-domain users means this source must not be copied to production without a data-owner policy.
- Source SHA-256: `e9b4eac119cc44941d7cdea88c1429945fce40dd1ee7c548759bcfbc68f7fb02`; SQLite schema SHA-256: `edc4017d8b310c1675ac9c4e59a3c950dba7892cfb0fdbea42fc958663a3a25d`.
- Existing files `prisma/dev.db.phase20.bak` (4,354,048 bytes) and `backups/phase20-local-dev-db-post-change-20261005.sqlite` (4,517,888 bytes) were not opened or modified; neither is verified as a restorable pre-migration backup.
- Migration history: none present; the schema header says Phase 1, which is not a migration ledger/version. The project has local development DB guards and sandbox-only `db:push`; no PostgreSQL `migrate deploy` configuration or migration directory exists.
- A scratch schema copy with provider changed to `postgresql` passed Prisma 5.22.0 `validate` against a synthetic placeholder. No PostgreSQL connection was attempted.

## SQLite-specific compatibility scan and classification

| Repository finding | Classification | Reason / required treatment |
|---|---|---|
| `datasource db { provider = "sqlite" }` in `prisma/schema.prisma` | **BLOCKER** | Must be changed only with an approved PostgreSQL staging migration plan; a provider flip alone does not move data. |
| SQLite development files (`prisma/dev.db` and named backups) | **BLOCKER** for migration until backup/target approval; backups **NOT VERIFIED** | `prisma/dev.db` was explicitly opened read-only and inventoried; named backups were not opened. A new verified pre-migration backup has not been created. |
| `file:` URL checks in `prisma/safe-seed-target.ts` and `scripts/db/guarded-dev-db.mjs` | **SAFE** for their current disposable SQLite-only dev/test purpose | Keep these guards fail-closed; do not repurpose them for PostgreSQL or production. Add a separate reviewed PostgreSQL migration command. |
| `PRAGMA table_info` in `scripts/testing/verify-phase12.ts` | **NEEDS CHANGE** for PostgreSQL migration QA | Historical verification script is SQLite-specific; replace with portable Prisma/catalog assertions for PG before relying on it. Not a runtime application query. |
| `sqlite_master` queries in `scripts/testing/verify-phase14.ts` and `verify-phase15.ts` | **NEEDS CHANGE** for PostgreSQL migration QA | Historical tests inspect SQLite catalogs and must be rewritten or excluded from the PG verification suite. |
| Runtime `SELECT 1` probes in health/readiness code | **SAFE** | Portable SQL; no vendor-specific function was found in those probes. |
| `src/lib/constants.ts` comment mentioning SQLite/PostgreSQL; production preflight explicitly rejects SQLite | **SAFE** for runtime, documentation should be updated after provider cutover | The production rejection is a useful guard; the schema header's “one-line switch” note is not sufficient migration guidance. |
| Search for `better-sqlite3`, `sqlite3`, `AUTOINCREMENT`, `datetime('now')`, `julianday`, `strftime`, and `json_extract` | **SAFE / no application hits found** | No such runtime dependency/function was found in the searched `src`, `prisma`, and `scripts` source. Historical script hits are listed above. |
| `prisma/migrations/` absent | **BLOCKER** | No repeatable versioned PostgreSQL migration system exists. |

## Seed/demo isolation audit

`prisma/seed.ts`, Phase 20 curriculum seed, and QA fixture seed call `assertDisposableSandboxTarget()` before their writes. The guard rejects deployment contexts and accepts only the explicitly confirmed `prisma/phase21-sandbox.db`; `db:push`, seed, reset, and fixture scripts are guarded similarly. Demo fixtures exist in source; the read-only inventory found 13 users with `@demo.example` addresses. Other per-table counts are in the data appendix; exact fixture identity was not exposed. No separate production seed plan was found. Keep demo/student fixtures sandbox-only; define production schema/reference-data seeds separately and never allow demo mode to bypass deployment guards.

## What was not done

No new backup was created, no PostgreSQL target was inspected or contacted, and no migration SQL, datasource switch, schema migration, data import, or application write was performed. No `prisma db push` was run in this phase. The authorized SQLite source baseline was strictly read-only; existing backups were not opened or modified.

## Blockers

### 1. Verified pre-migration backup and destination
- **ROOT CAUSE:** The user explicitly selected “defer backup”; existing backup files have not been validated/restored. No new copy of sensitive LMS data was created.
- **IMPACT:** There is no verified restore point before data export/import. Migration must not start.
- **REQUIRED FIX:** Confirm a durable, access-controlled destination outside source/public paths. Then create a new backup without overwriting existing files, record its hash, run integrity checks, and restore it to a separate disposable location.
- **EVIDENCE:** Read-only source inventory and source hash are documented; existing backups remain unverified and untouched.
- **NEXT ACTION:** Specify the backup destination and retention/access requirements; only then create and verify the backup.

### 2. Real PostgreSQL staging target and access
- **ROOT CAUSE:** The user explicitly selected “no target for now.” No reachable PostgreSQL service, host topology, or secret-provisioning target is available in this workspace; local `psql`, `postgres`, `initdb`, Docker, and Podman executables were not present. `.env` values were not inspected; its variable-name-only inventory showed `DATABASE_URL`, `NEXT_PUBLIC_DEMO_HINTS`, and `SESSION_SECRET`.
- **IMPACT:** Cannot create/validate a real target, establish TLS/network/least-privilege posture, or run the import and required LMS workflows on PostgreSQL.
- **REQUIRED FIX:** Provision an approved disposable staging PostgreSQL service and expose its credentials through a secure secret mechanism in the execution environment; do not paste credentials into chat. Confirm whether a temporary local sandbox server is acceptable only for technical rehearsal (it would not qualify as a production target). Define separate runtime/migration roles where supported.
- **EVIDENCE:** No PostgreSQL connection was made; only provider-level Prisma validation against a synthetic placeholder passed. No PostgreSQL/container binaries were available locally.
- **NEXT ACTION:** Provide staging service identity/access through secure environment provisioning, or explicitly authorize an isolated local PostgreSQL installation for rehearsal while accepting that production readiness will remain blocked.

### 3. Migration history and baseline strategy
- **ROOT CAUSE:** `prisma/migrations/` is absent and checked-in datasource is SQLite.
- **IMPACT:** No repeatable PostgreSQL schema deploy can currently be executed; existing data cannot safely be represented by a provider switch alone.
- **REQUIRED FIX:** Generate and review a PostgreSQL initial migration from the audited schema, choose a baseline/resolve procedure for the empty or existing target, preserve CUID/string IDs and all FK behavior, and keep SQLite-to-PostgreSQL data transfer separate from Prisma schema migration.
- **EVIDENCE:** Directory absence; PostgreSQL scratch schema validation passed but no migration directory/SQL was created.
- **NEXT ACTION:** After source and target approval, generate a migration plan and migration SQL in staging, review destructive operations, then deploy only to a confirmed empty/disposable target.

### 4. Production safety, seed, and connection policy
- **ROOT CAUSE:** Hosting target is unverified; no PostgreSQL SSL/network/RBAC policy, pooled/direct URL split, migration role, backup role, or restore test is documented. Existing demo seeds are sandbox-oriented.
- **IMPACT:** Cannot claim production-ready connectivity, safe seeding, recoverability, or connection capacity.
- **REQUIRED FIX:** Document host/service topology, TLS, firewall/allowlist, application least-privilege role, separate migration/backup roles where supported, pool limits/timeouts based on hosting, and a tested demo-free production seed path.
- **EVIDENCE:** `src/lib/prisma.ts` uses a dev-global PrismaClient singleton and a per-process production singleton; no explicit pool tuning or `DIRECT_URL` split was found. Only a Netlify demo config exists; actual target unknown.
- **NEXT ACTION:** Confirm actual hosting/service and provide staging constraints. Validate restore, seed rejection in production, and connection limits there.

No destructive SQL or migration was generated/applied. The detailed model and SQLite review are in the Schema Audit and companion reports.