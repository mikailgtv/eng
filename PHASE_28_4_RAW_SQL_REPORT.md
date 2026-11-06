# Phase 28.4 — Raw SQL Report

## Prisma raw calls in runtime source

Two runtime call sites were found:

| Location | Purpose | SQL form | Risk/compatibility |
|---|---|---|---|
| `src/lib/system-health.ts` | Database health probe | Tagged-template `SELECT 1` | Static/read-only; PostgreSQL-compatible; no user input. |
| `src/app/ready/route.ts` | Readiness probe | Tagged-template `SELECT 1` | Static/read-only; PostgreSQL-compatible; no user input. |

No `$queryRawUnsafe`, `$executeRawUnsafe`, dynamic raw SQL, or raw DML call was found under `src/`.

The offline Phase 28.3 importer in `scripts/db/phase28_3_sqlite_to_postgres.py` constructs psql/COPY statements for migration-only staging use, quotes SQL identifiers/literals, and suppresses database diagnostics. It is not called by application routes and was not run in Phase 28.4. Review it as a privileged operational tool before reuse.

No SQL call was executed in this phase. The current database is unavailable; raw SQL runtime behavior is therefore NOT VERIFIED beyond static review.
