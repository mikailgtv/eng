# Phase 28 — PostgreSQL QA Report

**Audit date:** 2026-10-07

## Completed QA evidence

- Prisma 5.22.0 successfully validated a scratch copy of the schema with `provider = "postgresql"` and a synthetic, non-routable placeholder URL. This was schema parsing/validation only; it did not contact a PostgreSQL server.
- With explicit read-only authorization, the SQLite source inventory passed `integrity_check`, matched all 213 Prisma tables to physical tables, found zero SQLite FK violations and zero duplicate unique-key groups, and generated per-table row/key/full-row digest baselines. Source baseline: 3,716 rows; 123 nonempty tables. This is pre-migration SQLite evidence, not PostgreSQL QA.
- Static source/schema review covered datasource/provider, migration directory presence, identifiers, relations, referential actions, nullability/defaults/timestamps, explicit indexes/unique keys, seed guards, raw SQL markers, transaction call sites, and Prisma Client lifecycle.
- Repository search found no runtime `PRAGMA`, `sqlite_master`, `AUTOINCREMENT`, SQLite date functions, `json_extract`, `better-sqlite3`, or `sqlite3` dependency. `PRAGMA table_info` and `sqlite_master` occur only in historical scripts under `scripts/testing/`; runtime health/readiness probes use portable `SELECT 1`.
- PostgreSQL schema-level validation passed; the checked-in datasource remains SQLite.

## Not passed / not run

No real PostgreSQL database, `prisma migrate deploy`, data copy, backup, restore, integrity comparison, production build against PostgreSQL, or PostgreSQL-backed login/student/teacher/assessment/admin workflow was run. There is no target or migration history. All database-specific acceptance tests are therefore **BLOCKED / NOT VERIFIED**, not passed.

## Required QA after access approval

Run a clean staging migration and data import; validate source/target counts, key sets, null/unique/FK/orphan checks, and critical IDs; restore the backup; execute the full student/teacher/assessment/admin test matrix and required critical end-to-end LMS flow on PostgreSQL; test concurrent submissions/awards/certificates; capture performance plans/baselines; and verify application, migration, and backup roles and TLS. Keep all findings, including mismatches, without silent deletion.