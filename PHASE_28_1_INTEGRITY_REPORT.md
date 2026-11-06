# Phase 28.1 — Integrity Report

**Audit date:** 2026-10-07  
**Source access:** read-only SQLite connection (`mode=ro`; `PRAGMA query_only=1`).

## Current source recheck

| Check | Result |
|---|---|
| Source opens read-only | PASS |
| SQLite runtime version | 3.46.1 |
| `PRAGMA integrity_check` | `ok` |
| Schema readable | PASS; `sqlite_master` catalog read |
| Physical tables | 213 |
| Prisma model/table name match | 213/213; no missing or extra table names |
| Total records | 3,716 across 123 nonempty tables |
| `PRAGMA foreign_key_check` | 0 violations |
| Views / triggers | 0 / 0 |
| Source SHA-256 | `e9b4eac119cc44941d7cdea88c1429945fce40dd1ee7c548759bcfbc68f7fb02` |
| SQLite schema SHA-256 | `edc4017d8b310c1675ac9c4e59a3c950dba7892cfb0fdbea42fc958663a3a25d` |

The source file SHA-256 matches the read-only Phase 28 baseline. No write statements, seed operations, schema changes, or source-side mutations were performed.

## Backup and restore integrity

No new backup exists, so backup readability, backup `integrity_check`, schema equality, row-count comparison, and restore-copy integrity are **NOT RUN**. Existing backup files were inventoried by file signature/hash only; they were not opened as SQLite databases and remain **UNVERIFIED**. Source integrity passing does not prove a usable backup.