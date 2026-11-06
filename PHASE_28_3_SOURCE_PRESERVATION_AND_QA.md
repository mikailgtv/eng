# Phase 28.3 — Source Preservation and QA Checklist

**Result:** PASS — SQLite source content preserved.

## Source-preservation evidence

- Source opened read-only; no write-capable SQLite connection was used.
- Current source SHA-256: `e9b4eac119cc44941d7cdea88c1429945fce40dd1ee7c548759bcfbc68f7fb02`; identical to the Phase 28.1R baseline.
- Source size: **4,517,888 bytes**; SQLite integrity `ok`; 213 tables / 3,716 rows; zero FK violations.
- The existing backup copy SHA-256 is `1b161f81e8cf7458dac9860ddfbd71dc99bf462ce5d7ad9538a7a91b20a1ec71`, different at file-byte level as expected for an SQLite Online Backup copy. A fresh logical verification matched schema, table inventory, every table count, and every canonical row-content fingerprint.
- PostgreSQL import, app tests, failure injection, and restore all targeted disposable PostgreSQL databases; nothing was restored over the SQLite source.

## QA checklist

| Acceptance area | Result |
|---|---|
| Pre-migration backup gate | PASS; logical source/backup verification |
| Source read-only and hash preservation | PASS |
| Staging import complete | PASS; 213 tables / 3,716 rows |
| Independent counts and fingerprints | PASS; zero mismatches |
| FKs and unique indexes | PASS; zero orphan/duplicate groups |
| JSON-like text scan | PASS; 1,264/1,264 valid; zero per-column mismatches |
| Login, roles, dashboards | PASS for listed smoke paths; see app/auth reports |
| Workflow authorization and manual run | PASS for tested API paths; repeat target only |
| Transactions / negative constraints | PASS; no probe residue |
| Failure recovery / repeatability | PASS |
| PostgreSQL backup/restore | PASS; local technical restore |
| Development cold-route performance | QUALIFICATION: teacher attendance took 144.3 s to return 200 after a 120 s client timeout |
| Production cutover / persistent backup infrastructure | Not performed; explicitly out of scope |

All known exceptions are disclosed in the performance and application reports. No Production changes, secret disclosure, or silent row loss occurred.
