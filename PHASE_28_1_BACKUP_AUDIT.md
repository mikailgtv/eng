# Phase 28.1 — Backup Audit

**Audit date:** 2026-10-07 (UTC)  
**Scope:** source remains read-only; existing backups inventoried by metadata, file signature, and SHA-256 only. Existing backup databases were not opened or restored.

## Source database — read-only recheck

- Path: `/home/user/prisma/dev.db`
- Size: 4,517,888 bytes; mode `0644`
- SQLite file signature: SQLite 3.x; runtime library 3.46.1
- SHA-256: `e9b4eac119cc44941d7cdea88c1429945fce40dd1ee7c548759bcfbc68f7fb02` (matches the Phase 28 baseline)
- `PRAGMA integrity_check`: `ok`
- Tables: 213; total rows: 3,716; nonempty tables: 123; FK violations: 0
- SQLite views/triggers: 0 / 0
- Opened using SQLite `mode=ro`, with `PRAGMA query_only=1`; no source mutation.

## Existing backup inventory (not trusted)

| Filename | Absolute path | Size | Birth / modified (UTC) | Format | SHA-256 | Integrity/read/restore |
|---|---|---:|---|---|---|---|
| `dev.db.phase20.bak` | `/home/user/prisma/dev.db.phase20.bak` | 4,354,048 B | 2026-10-07 14:26:07 / 14:26:07 | SQLite 3.x; file signature reports SQLite 3.45.0 | `e606ba762734455f70c9b88d48e394b3d6c5c9aecf06e6bc88c08fa14d800e1f` | Not opened as DB; no integrity or restore test; unverified |
| `phase20-local-dev-db-post-change-20261005.sqlite` | `/home/user/backups/phase20-local-dev-db-post-change-20261005.sqlite` | 4,517,888 B | 2026-10-07 14:26:07 / 14:26:07 | SQLite 3.x; file signature reports SQLite 3.46.1 | `1b161f81e8cf7458dac9860ddfbd71dc99bf462ce5d7ad9538a7a91b20a1ec71` | Not opened as DB; no integrity or restore test; unverified |

The source and these backup files have different SHA-256 values; this alone does not determine whether their logical rows match. The two existing files are inside the repository tree and are not eligible destinations for the new backup under the user's policy. None was overwritten or modified.

## New backup status

No new backup was created. The only discovered backup directory is `/home/user/backups`, inside the repository root; `/tmp` is ephemeral scratch storage, not durable backup storage. No externally mounted persistent volume or configured object-storage destination is available. Per instruction, no destination was invented. See `PHASE_28_1_FINAL_REPORT.md` for the blocking requirement.