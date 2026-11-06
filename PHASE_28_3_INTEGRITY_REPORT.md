# Phase 28.3 — Target Integrity Report

**Result:** PASS on `phase28_3_stage` and the restored backup database.

- Application tables: 213; rows: 3,716.
- Primary keys: 213 application PKs (214 catalog PKs including `_prisma_migrations`).
- Foreign keys: 277/277 validated; zero orphan rows; zero unvalidated FK constraints.
- Application indexes: 602; unique indexes checked: 315; duplicate groups: 0.
- Additional unique indexes: 102; expression unique indexes: 0.
- PostgreSQL sequences and enums: 0 each.
- Independent table-by-table source count and semantic fingerprint comparisons: zero mismatches.

Integrity was checked both before backup on the pristine staging target and after restore into a separate disposable database. See the FK and unique-index reports for specific checks.
