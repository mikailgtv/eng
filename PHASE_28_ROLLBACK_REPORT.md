# Phase 28 — Rollback Report

**Audit date:** 2026-10-07

## Status

No PostgreSQL migration or data import was executed, so no migration-specific rollback was exercised. The SQLite source and existing backups remain untouched. Backup validity is not verified.

## Required rollback design before staging/production migration

- **Application rollback:** deploy the previous known-good application artifact while preserving the PostgreSQL schema/data compatibility window. Do not point an old SQLite-only release at PostgreSQL without a compatible build.
- **Schema rollback:** prefer forward-fix for additive migrations. For destructive/irreversible changes, require an explicit plan and verified restore point; do not assume Prisma can reverse data transformations.
- **Data rollback:** keep the source SQLite snapshot immutable until acceptance, cutover, and rollback window close. If post-cutover writes occur, a simple source restore loses new writes; define write freeze/dual-write/reconciliation policy first.
- **Backup restore:** restore the verified PostgreSQL pre-import snapshot or reconstruct the disposable target; rehearse timing and integrity on staging before production.
- **Protection:** inspect generated SQL for `DROP TABLE`, `DROP COLUMN`, destructive casts, data truncation, or default rewrites. Any such operation requires a separate explanation, backup, approval, and forward/restore plan.

## Evidence/limitations

There is no `prisma/migrations/` directory, generated migration, PostgreSQL snapshot, verified SQLite backup, restore rehearsal, or cutover plan. The rollback strategy above is a required design, not evidence that rollback has been tested.