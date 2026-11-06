# Phase 28.3 — Failure Recovery and Repeatability

**Result:** PASS — injected failure was isolated, the table transaction rolled back, and the resumable import completed deterministically.

- On disposable `phase28_3_repeat`, a deterministic synthetic fault was injected at importer boundary **80**.
- Import stopped as designed; the per-table PostgreSQL transaction rolled back. The progress log contained 79 completed tables; no partial progress entry was recorded for the failing boundary.
- The failure output identified recovery at the table boundary and did not emit row values or connection details.
- Resume verified already-completed tables before skipping them, refused mismatched progress, and completed the remaining work.
- Final repeat-import counts and source/target semantic fingerprints matched for all 213 tables before application tests.

The staging target was not used for fault injection. The later app fixtures are confined to the repeat database.

## Repeatability

- Primary staging import progress: **213/213** tables, all marked imported.
- Repeat attempt: synthetic failure after 79 completed tables at boundary 80.
- Resume: **79** previously completed tables were re-fingerprinted and safely skipped; **134** were imported; total **213/213**.
- Before application smoke tests, repeat target counts: **3,716**; source count/fingerprint mismatch: **0**.
- Staging target counts: **3,716**; source count/fingerprint mismatch: **0**.

The repeat database was intentionally modified later by synthetic auth, workflow, and transaction tests and is no longer a pristine import comparison target. The primary `phase28_3_stage` remained pristine and is the database used for final source comparison and backup.
