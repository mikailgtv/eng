# PHASE 28.1R — Schema Compatibility

**Date:** 2026-10-07 (Asia/Tehran)

## Schema comparison

- Source SQLite schema and candidate PostgreSQL schema each describe 213 physical tables.
- Table-name sets and per-table column-name sets matched across all 213 tables. Some physical column orders differ; the import rehearsal mapped by names, not ordinal position.
- Prisma-generated PostgreSQL baseline deployed successfully: 213 tables, 277 foreign-key constraints, and 602 total PostgreSQL indexes (including primary-key indexes).
- Post-deployment Prisma schema diff reported no drift.

## Provider-specific conversions verified in the temporary rehearsal

- SQLite Boolean-affinity values were converted to PostgreSQL booleans: 1,748 non-null values.
- SQLite date/time values were stored as integer epoch milliseconds; 5,072 values were converted to UTC PostgreSQL timestamps at millisecond precision. A first transactional import attempt rejected the raw integer representation and rolled back; the corrected conversion then passed. This conversion is important and must be preserved in any future migration/import procedure.
- Five binary values were transferred from SQLite BLOB to PostgreSQL BYTEA.
- The temporary importer compared every source row against PostgreSQL after normalizing these provider-specific representations. All 3,716 rows matched semantically; all per-table counts matched; all 277 foreign-key checks had zero orphans.

## Conclusion and remaining validation

The baseline schema is deployable to the tested PostgreSQL 17.11 instance and the current source data set was compatible in a disposable rehearsal. This does not certify a different provider/version, production extensions, collation/locale, application-scale performance, concurrent-write behavior, backup/restore, or production cutover. The main schema remains SQLite pending an approved production cutover plan.
