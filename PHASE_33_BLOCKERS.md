# PHASE 33 — Blockers

**Date:** 2026-10-25

**P3019 and P2022 are resolved for the SQLite development provider.** They are listed here as closed, with the residual items below.

---

## Closed in this phase

### ~~B1 — P3019 (provider mismatch)~~ — RESOLVED

Root cause: one migrations directory per schema + `migration_lock.toml = postgresql` + a PostgreSQL-only baseline (uses `BYTEA` and `ADD CONSTRAINT`; proven to fail on SQLite with `near "CONSTRAINT": syntax error`).
Resolution: PostgreSQL history preserved verbatim in `prisma/migrations.postgresql/` (hashes in `MANIFEST.sha256`, verified 4/4), fresh introspected SQLite history at `prisma/migrations/`.
Evidence: `migrate status` → "Database schema is up to date!"; `migrate dev` → "Already in sync".

### ~~B2 — P2022 (18 missing columns)~~ — RESOLVED **on a migrated database**

All 18 columns present, indexes and the tenant foreign key created, zero drift, `integrity_check` ok, 0 foreign-key violations.

---

## Open

### B3 — HIGH — The running development database is still un-migrated (by design)

`prisma/dev.db` is protected by the phase rules and was **not** modified, so the application still raises P2022 against it:

```
npm run db:p2022     # defaults to prisma/dev.db
  FAIL  contentMedia.findFirst: P2022 The column main.content_media.originalName does not exist
```

This is not a code defect: the exact supported repair exists and is proven. An operator must apply it once, deliberately:

```bash
cp prisma/dev.db e2e/mig33/dev-migrated.db
DATABASE_URL="file:$PWD/e2e/mig33/dev-migrated.db" node scripts/db/guarded-migrate.mjs resolve --applied 20261001000000_sqlite_baseline --yes
DATABASE_URL="file:$PWD/e2e/mig33/dev-migrated.db" node scripts/db/guarded-migrate.mjs deploy --yes
node scripts/db/verify-db.mjs prisma/dev.db e2e/mig33/dev-migrated.db    # expect 38/38
```
…then repoint `DATABASE_URL` at the migrated file once verified. Do **not** run a migration directly against `prisma/dev.db` — the guard will refuse it.

### B4 — HIGH — PostgreSQL is not configured; every PG claim is NOT VERIFIED

- No server, no connection string, no TLS configuration.
- The PostgreSQL DDL has **never executed** against a real PostgreSQL server; only its syntax class and file integrity were inspected.
- `prisma migrate deploy` against PG, PG constraints/indexes, PG backup and PG restore drills: all **NOT TESTED**.
- No paid service was provisioned.

### B5 — MEDIUM — `next build` not executed end-to-end

`npm run typecheck` is clean, but a full 213-model production build was not run in this environment.

### B6 — MEDIUM — Storage provider still local-only (carried from Phase 32)

Tenant boundaries were validated against the local adapter. S3 signed URLs, bucket ACLs, SSE and object listing remain **NOT TESTED**; local disk is not durable production storage.

### B7 — MEDIUM — Carried operational gaps (Phase 32, unchanged)

No CSP/HSTS; rate limiting is process-local; no scheduler and no alert channel for backups; backup encryption key and destination are unset.

### B8 — LOW — Multi-tenant unique constraints still global

`Level.code`, `LearningGroup.name`, `LearningGroup.code`, `Course.code` remain globally unique, so two tenants cannot reuse a natural code. Documented in the schema-drift report; not changed here because rewriting unique indexes on populated tables is a separate, riskier migration.

### B9 — LOW — Orphaned test file excluded from typecheck

`src/lib/storage/__tests__/storage.test.ts` imports `vitest`, which is not a dependency. Excluded in `tsconfig.json` rather than deleted (Phase 32 decision, unchanged).
