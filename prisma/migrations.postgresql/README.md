# PostgreSQL migration history (preserved, not applied)

These migrations were authored for a PostgreSQL deployment in Phase 28/30/32.
They are **NOT** applied to the SQLite development database and Prisma never reads this directory.

Why moved: Prisma supports one migrations directory per schema; the live
`prisma/migrations` directory must serve the SQLite provider used by the app.
Nothing was edited — `MANIFEST.sha256` records each file hash. Verify with:

    cd prisma/migrations.postgresql && sha256sum -c MANIFEST.sha256

Restore for a PostgreSQL run with `node scripts/db/restore-postgresql-migrations.mjs`.

Contents:
- 20261007183000_postgresql_baseline/migration.sql
- 20261010000000_phase30_storage_metadata/migration.sql
- 20261010000001_phase32_tenant_isolation/migration.sql
- migration_lock.toml
