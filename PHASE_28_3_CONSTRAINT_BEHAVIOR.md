# Phase 28.3 — Constraint Behavior Probes

**Result:** PASS for synthetic invalid-write probes on `phase28_3_repeat`.

| Probe | Expected behavior | Observed |
|---|---|---|
| Duplicate unique value | Reject | Rejected (`P2002`) |
| Nonexistent FK reference | Reject | Rejected (`P2003`) |
| NULL in required column | Reject | PostgreSQL rejected |
| Forced transaction exception | Roll back | Row absent after rollback |
| Unicode CRUD | Exact round-trip | Exact match |
| Net residue in probe table | None | 0 rows |

These were deliberate negative tests. They did not target `phase28_3_stage` or the SQLite source.
