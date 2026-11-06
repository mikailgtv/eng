# Phase 28.1 — Schema Comparison

**Result:** Source schema is readable and matches the checked-in Prisma model/table naming; source-to-backup/restored-copy comparison is **NOT RUN** because no new backup or restore copy exists.

## Source schema snapshot

- Physical tables: 213; Prisma model/table names expected: 213; missing: 0; extra: 0.
- Views: 0; triggers: 0.
- SQLite catalog/schema SHA-256: `edc4017d8b310c1675ac9c4e59a3c950dba7892cfb0fdbea42fc958663a3a25d`.
- Current Prisma schema file SHA-256: `559a211a8e79be6d0946a629c7e6cf52cdeb8c713298ce4e0d1590c942088431`.
- `prisma/dev.db` SHA-256: `e9b4eac119cc44941d7cdea88c1429945fce40dd1ee7c548759bcfbc68f7fb02`.

Source catalog access was read-only. The 213 tables, columns, indexes, foreign-key definitions, and constraints remain in the source. No view/trigger objects were present.

| Comparison category | Source | New backup | Restored copy |
|---|---|---|---|
| Table names / count | 213 | NOT AVAILABLE | NOT AVAILABLE |
| Column names/types/nullability | Readable; source-only | NOT COMPARED | NOT COMPARED |
| Primary keys / indexes / FKs | Readable; source-only | NOT COMPARED | NOT COMPARED |
| Triggers / views | 0 / 0 | NOT COMPARED | NOT COMPARED |
| Schema digest | Recorded above | NOT AVAILABLE | NOT AVAILABLE |

The catalog digest must be recomputed with the same canonicalization after a newly authorized backup and restore exist. Existing backups were not opened and are not used as comparison targets.