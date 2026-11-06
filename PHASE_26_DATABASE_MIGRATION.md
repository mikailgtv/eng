# Phase 26 — Database Migration Plan

**Status: BLOCKED — no production database or reviewed migration chain. No DB operation was performed.**

## Current database facts
- Prisma schema uses `provider = "sqlite"` and `DATABASE_URL` in `prisma/schema.prisma`.
- `package.json` has `db:push` routed through a guarded disposable-sandbox script; `db:reset` is disabled.
- No `prisma/migrations/` directory/history was found. Schema comments/README text suggesting PostgreSQL is a one-line change are not a tested migration.
- The existing `prisma/dev.db` is protected due earlier Phase 20 writes; the available local snapshot is post-change only. Do not use it as a clean source, staging DB, or production migration rehearsal target.

## Safe migration strategy before any production database
1. Select and provision distinct managed Staging and Production PostgreSQL databases. Confirm separate credentials, networks, backup policy and owner access. Staging must not reach production.
2. Decide whether production starts empty or imports explicitly approved data. Do not assume local/demo data is production data.
3. Pin the intended Prisma/PostgreSQL versions. Create a new migration baseline from an explicitly approved schema on an empty disposable PostgreSQL DB, inspect SQL and constraints, and version it in source control. Do not generate/apply from the protected local DB.
4. Validate SQLite/PostgreSQL differences: JSON-as-String fields, string status registries, foreign keys/onDelete, uniqueness/null semantics, case-sensitive search, index definitions, transactions, IDs, timestamps/timezones, raw queries, migration locks and connection pooling.
5. For approved data transfer, use a separate export/import tool with explicit table mapping, identity preservation, PII controls, duplicate/orphan handling, checksums/counts and owner sign-off. Demo/test accounts and Phase 20 fixtures must be excluded unless explicitly approved for staging only.
6. On a disposable copy: capture a backup; apply the exact forward migration; run `PRAGMA`-equivalent/Postgres integrity checks, FK/orphan/unique checks and authenticated smoke; rehearse app rollback against the new schema and the documented data recovery route.
7. Promote the same migration digest to Staging; restore-test backup there; approve schema compatibility and application version. Production migration requires an actual pre-migration backup, recorded approval, maintenance/traffic policy, and immediate readiness/smoke checks.
8. Prefer expand → backfill → switch → contract migrations. Never drop/rename columns or change semantics until all deployed app versions are compatible and rollback is no longer needed.

## Go/no-go gates
- No versioned, reviewed migrations → **no go**.
- No successful isolated restore immediately before a destructive/irreversible change → **no go**.
- No exact DB-provider test and connection-pool limits → **no go**.
- Any schema/data reset, demo seed or unreviewed `db push` against shared/prod → prohibited.

No migration has been generated, applied, or tested against PostgreSQL in this phase.