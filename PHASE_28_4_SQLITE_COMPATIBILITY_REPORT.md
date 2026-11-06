# Phase 28.4 — SQLite Compatibility Report

**Static scan:** no SQLite-specific SQL tokens were found in `src/` runtime code (no `PRAGMA`, `sqlite_master`, `strftime`, `INSERT OR`, `last_insert_rowid`, or SQLite JSON/date functions). The two raw Prisma probes are static `SELECT 1` and PostgreSQL-compatible.

## Prisma configuration

- `prisma/schema.prisma` is the primary SQLite schema and is still the default for plain Prisma CLI commands.
- `prisma/schema.postgresql.prisma` is a PostgreSQL schema; versioned baseline exists at `prisma/migrations/20261007183000_postgresql_baseline/migration.sql`.
- Package `build` and `postinstall` invoke plain `prisma generate`, without an explicit PostgreSQL schema. The current generated client cannot be inspected because `node_modules` is absent. Phase 28.3 generated a client from the PostgreSQL schema and performed successful local PostgreSQL app smoke tests, but that does not prove the current deployment build selects it.
- Package lock pins Prisma and `@prisma/client` to 5.22.0. Current shell Node is 20.20.2; the earlier Phase 28.3 app smoke used Node 22.23.3. Current generated-client/runtime compatibility is NOT VERIFIED.
- Date handling uses JavaScript `Date`/Prisma `DateTime`; JSON-shaped data is stored in text columns by the schema. PostgreSQL boolean/timestamp behavior was validated during Phase 28.3 content fingerprints, not in a current live service.

**Blocker:** explicit PostgreSQL generate/build/deploy selection and a live staging smoke are required before asserting the deployed runtime uses PostgreSQL. No `prisma db push` was run in Phase 28.4 and no destructive schema command was used.
