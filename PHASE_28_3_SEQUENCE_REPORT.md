# Phase 28.3 — Sequence Validation

**Result:** PASS — no target sequences require adjustment.

- PostgreSQL sequences: **0** in both the pristine staging and restored databases.
- Application scalar schema includes no Prisma autoincrement fields; source/target IDs were imported explicitly and preserved.
- Application primary keys: **213**; the IDs are not backed by PostgreSQL serial/identity sequences.

With no sequence objects or sequence-backed columns, sequence advancement/`setval` work is not applicable. IDs and relationships were validated by the per-table fingerprints and foreign-key checks.
