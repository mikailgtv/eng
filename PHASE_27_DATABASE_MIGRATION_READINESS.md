# Phase 27 — Database Migration Readiness

**Date:** 2026-10-07

## Current state

- Prisma provider remains **SQLite**; there is no `prisma/migrations/` directory.
- Schema audit counts: **213 models**, 0 enums, 339 relations, 287 indexes, 102 unique constraints, 190 explicit Cascade and 70 other explicit `onDelete` rules. No Prisma `Json` fields or `@db.*` native types were identified.
- `npm run db:validate` passed.
- The user-approved, previously absent test DB `/tmp/phase27-isolated-20261007-a7f1.sqlite` was initialized with `prisma db push --skip-generate`; it contains 213 application tables. It was used only for build/smoke checks. No production/local persistent database was written.

## Readiness assessment

**Ready to begin a separately approved Phase 28 PostgreSQL migration plan; no migration has been executed or generated here.** Schema validation and isolated SQLite synchronization are not substitutes for PostgreSQL compatibility, data migration, or production backup/rollback validation.

## Phase 28 prerequisites (deferred)

1. Approve a PostgreSQL target, environment, maintenance window, and data-protection plan separately.
2. Establish a versioned migration baseline and review the entire schema diff; do not use `db push` as the production migration mechanism.
3. Review SQLite/PostgreSQL behavior differences, relation deletion semantics, indexes/uniqueness, defaults, text collation/case sensitivity, and all raw SQL.
4. Design and test data transfer and reconciliation, including row counts, uniqueness, nullability, constraints, sequence/identity behavior, and application-level invariants.
5. Take and verify backups, rehearse restore and rollback, define downtime/dual-write policy if needed, and test on a sanitized staging copy before any production operation.
6. Run application regression and performance tests against PostgreSQL, then seek explicit migration execution approval.

No PostgreSQL service was contacted, no migration files were created, and no production or user database operation was performed in Phase 27.