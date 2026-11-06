# Phase 28.3 — Schema Mapping

**Status:** PASS  
**Mapping basis:** existing `prisma/schema.postgresql.prisma` plus the controlled importer; no schema reset or `prisma db push` was used.

## Structural result

- Source application tables: **213**; target application tables: **213**.
- Prisma scalar fields: **1,984**; PostgreSQL application columns: **1,984**.
- Table and column name sets match for all application tables.
- Source declared types and target types map as follows:

| SQLite declared type | Fields | PostgreSQL target type | Fields |
|---|---:|---|---:|
| TEXT | 1307 | text | 1307 |
| DATETIME | 402 | timestamp without time zone | 402 |
| INTEGER | 163 | integer | 163 |
| BOOLEAN | 92 | boolean | 92 |
| REAL | 18 | double precision | 18 |
| BLOB | 2 | bytea | 2 |

The mapping is driven by the Prisma PostgreSQL schema (not SQLite affinity alone), which disambiguates integer/boolean and date/time fields. The importer reported 5,072 epoch-millisecond-to-timestamp conversions, 1,748 boolean conversions, 5 blob-to-`bytea` conversions, and 0 JSON text transformations in its resumable run. The same source/target semantic fingerprint algorithm verified every column value without loss, including NULL/empty/zero/false distinctions.

## Keys and SQL objects

- 213 application primary keys and 277 foreign keys; all FKs are validated after import.
- 315 unique indexes checked (213 PK indexes + 102 additional unique indexes).
- No sequence-backed IDs or PostgreSQL enum types; identifiers are preserved explicitly.
- SQLite JSON-like values remain text by schema design; target JSON-specific checks are reported separately.

## Conclusion

Schema and scalar-column mapping is complete and count-aligned. See the manifest for per-table source/target fingerprints.
