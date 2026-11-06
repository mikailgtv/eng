# PHASE 28.1R — PostgreSQL Staging

**Date:** 2026-10-07 (Asia/Tehran)  
**Target:** Disposable PostgreSQL 17.11 cluster on loopback only; no production endpoint was used.

## Staging setup and schema deployment

- Temporary cluster data lived under `/tmp/phase28_1r`; listener was restricted to `127.0.0.1:55432`.
- Created a separate rehearsal database and temporary local role. No production credentials or provider URL were used.
- Applied the versioned baseline using `prisma migrate deploy` (not `db push`).
- Prisma reported the migration applied and `migrate status` reported the schema up to date.
- PostgreSQL contained 213 application tables, 602 indexes including primary-key indexes, and 277 foreign-key constraints.
- `prisma migrate diff` from the staged database to the candidate schema found no schema drift.

## Authorized data rehearsal after verified backup

Only after the temporary backup and restore had passed, imported the source rows to this disposable local database using a temporary importer. It mapped fields by column name rather than physical column order and converted SQLite boolean, binary, and millisecond-epoch date values to PostgreSQL types.

- Tables imported: 213.
- Rows: 3,716 across 123 nonempty tables.
- Per-table row counts: all equal to the source.
- Per-table semantic row-content comparison: all 213 tables matched after provider-specific type normalization.
- Foreign-key validation: all 277 constraints checked; zero orphan rows.
- An initial transactional importer run correctly stopped when it encountered SQLite epoch-millisecond values where PostgreSQL expected timestamps; the failed transaction rolled back. The importer was corrected to convert those values to UTC millisecond-precision timestamps, then the complete rehearsal passed.
- Temporary Prisma create/update/read/delete transaction: passed and cleaned up; no probe row remained.
- The temporary staging database and importer files were deleted after testing. No production data import occurred.

## Limitations

This is a local migration/data rehearsal, not a production target, persistent staging service, security-hardening check, or approval to cut over. The temporary cluster used local trust authentication and no TLS, acceptable only for the loopback-bound disposable sandbox test. Production hosting, database endpoint, authentication/TLS policy, monitoring, backup, and restore destination remain to be supplied and reviewed.
