# Phase 28.1 — Backup Manifest

**Manifest status:** BACKUP NOT CREATED — secure durable destination unavailable and no path was authorized.

| Field | Value |
|---|---|
| Backup ID | NOT CREATED |
| Environment | Local development source; not asserted to be production |
| Source database | SQLite, `/home/user/prisma/dev.db` |
| Source path | `/home/user/prisma/dev.db` |
| Source size | 4,517,888 bytes |
| Source SHA-256 | `e9b4eac119cc44941d7cdea88c1429945fce40dd1ee7c548759bcfbc68f7fb02` |
| Source SQLite library version | 3.46.1 |
| Source baseline | 213 tables; 3,716 rows; 123 nonempty tables; `integrity_check=ok`; 0 FK violations |
| Backup path | NOT AVAILABLE — no eligible durable external destination |
| Backup timestamp / size / SHA-256 | NOT CREATED / NOT AVAILABLE / NOT AVAILABLE |
| Prisma schema version | No migration history; no `prisma/migrations/` directory |
| Integrity result | Source: PASS (`ok`); new backup: NOT RUN |
| Restore result | NOT RUN — no new backup exists |
| Operator/automation | Arena.ai Agent Mode; no human operator identity asserted |
| RPO / RTO | NOT DEFINED |

Existing backups are separately inventoried in `PHASE_28_1_BACKUP_AUDIT.md`; neither is promoted to verified status by this manifest. A new manifest must be produced only after an approved destination is provided and a backup/restore cycle succeeds.