# Phase 28.3 — Transaction Validation

**Result:** PASS on disposable `phase28_3_repeat`; no test rows left behind.

- Unicode CRUD round-trip (English, Persian, Arabic, emoji): **PASS**.
- Synthetic transaction rollback after a forced exception: **PASS**, created row absent after rollback.
- Duplicate unique value inside a transaction: rejected by Prisma (`P2002`); transaction left no row.
- Invalid foreign-key insert: rejected (`P2003`).
- Explicit NULL into a required field: rejected by PostgreSQL.
- Before/after row count for the probe table: identical; residue: **0**.

Application login/workflow tests were run later against the same disposable repeat database; the clean staging database was not used for these probes.
