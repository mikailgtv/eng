# PHASE 33 — Migration & Rollback Runbook

**Audience:** whoever changes the schema next.
**Golden rule:** `prisma/dev.db` is the preserved source. Every operation below targets a *copy*.

---

## 1. Safe-by-default commands

| Command | What it does | Safe? |
|---|---|---|
| `npm run db:migrate:status` | shows pending/applied migrations for the target | ✅ read-only |
| `npm run db:verify` | compares source vs migrated copy (38 checks) | ✅ read-only |
| `npm run db:rehearse` | full rehearsal on a fresh disposable copy | ✅ writes only `e2e/mig33/` |
| `npm run db:p2022` | probes the two file tables | ✅ read-only |
| `node scripts/db/guarded-migrate.mjs deploy --yes` | applies migrations to an **allowed** target | ⚠️ writes the target; refuses `dev.db`, non-SQLite, prod-looking paths |
| `prisma migrate dev` | creates/apply migrations in development | ⚠️ can prompt to reset if drift exists — always run `db:verify` first |
| `prisma migrate reset` | **drops everything** | 🚫 forbidden in this repository |
| `prisma db push` | rewrites schema without history | 🚫 forbidden (project rule) |

## 2. Create a verified copy

```bash
SRC=prisma/dev.db
DST=e2e/mig33/work-$(date +%Y%m%d-%H%M%S).db
sha256sum $SRC                      # record it
cp $SRC $DST
sha256sum $DST                      # MUST equal the line above
```
Both hashes must match before anything else happens. `scripts/db/rehearse-migration.mjs` performs this automatically and aborts on mismatch.

## 3. Inspect pending migrations

```bash
DATABASE_URL="file:$PWD/e2e/mig33/work.db" node scripts/db/guarded-migrate.mjs status
```
Expect: `N migrations found` plus a "not yet applied" list. The guard refuses the source DB and anything that looks like production.

## 4. Apply to the disposable copy

```bash
# only for a database that predates the migration history (see §8)
DATABASE_URL="file:$PWD/e2e/mig33/work.db" node scripts/db/guarded-migrate.mjs resolve --applied 20261001000000_sqlite_baseline --yes
# apply the rest for real
DATABASE_URL="file:$PWD/e2e/mig33/work.db" node scripts/db/guarded-migrate.mjs deploy --yes
```

## 5. Verify schema and data

```bash
node scripts/db/verify-db.mjs prisma/dev.db e2e/mig33/work.db      # 38 checks
node scripts/db/p2022-check.mjs e2e/mig33/work.db                  # file tables readable
DATABASE_URL="file:$PWD/e2e/mig33/work.db" npx prisma migrate diff \
  --from-url "file:$PWD/e2e/mig33/work.db" --to-schema-datamodel prisma/schema.prisma --exit-code   # 0 = no drift
```
A migration is **not** "successful" because it exited 0 — it is successful when these checks pass and row counts match.

## 6. Test the application after migration

```bash
SEED_TARGET_DB=$PWD/e2e/mig33/work.db npx tsx e2e/seed.ts      # synthetic tenants only
DATABASE_URL="file:$PWD/e2e/mig33/work.db" STORAGE_LOCAL_ROOT=$PWD/e2e/storage \
  npx next dev -p 4033 -H 0.0.0.0
E2E_BASE=http://127.0.0.1:4033 node scripts/test-idor-live.mjs  # expect 50/50
```
Never seed real learner data into a synthetic environment.

## 7. Recovering from a failed migration

SQLite cannot roll back DDL automatically, and Prisma does not reverse a partially applied migration. Use this order:

1. **Stop.** Do not re-run `deploy` on the same file — it may half-apply again.
2. Read `_prisma_migrations`: `SELECT migration_name, finished_at, logs FROM _prisma_migrations;`
3. Inspect the actual schema of the failed target (§5 commands) to see what did apply.
4. **Discard the copy and start from a fresh copy of the source.** This is the reliable recovery and the reason every operation runs on a copy.
5. If the failure happened on a database you must keep, restore the verified backup into an isolated target and verify it there before anything else (§9).

Never "fix" a failed state with `migrate reset` or by hand-editing `_prisma_migrations`.

## 8. Baselining an existing database (what was done here)

A database created before the migration history existed has no `_prisma_migrations` table. To adopt it:

1. Generate a baseline that **describes the database as it is**:
   `npx prisma migrate diff --from-empty --to-url "file:$COPY" --script > migration.sql`
2. Put it in the earliest migration slot so later migrations sort after it.
3. Register it on that database only: `prisma migrate resolve --applied <baseline>`.
4. Then `deploy` the real migrations.

This is not fabricated history: the baseline is introspected from the database itself, and every *change* is still executed by the migration engine.

## 9. Restoring a verified backup into an isolated target

1. Confirm the backup's checksum and manifest (Phase 31 tooling; 22 tests).
2. Restore into a path under a recovery root — never over the live file.
3. Validate the *target* argument (the Phase 31 code refuses prod/staging-like paths).
4. Open it read-only and run §5 verification before pointing anything at it.
5. Only then run the application against it.

A backup that has never been restored and verified is not a backup.

## 10. Preserving evidence before cleanup

Before deleting any `e2e/mig33/*.db`:
- `sha256sum` every artifact and save the list,
- keep `e2e/live-results.json`,
- keep the rehearsal/verify console output,
- keep the `_prisma_migrations` dump: `SELECT * FROM _prisma_migrations;`

## 11. PostgreSQL path

- The PostgreSQL history lives in `prisma/migrations.postgresql/` and is never read by Prisma.
- Restore it with `node scripts/db/restore-postgresql-migrations.mjs --dry-run` (review) then `--force`; it moves the SQLite history aside instead of deleting it and re-verifies every hash.
- **That DDL has never been executed against a real PostgreSQL server.** Treat it as unverified until a staging instance exists.
- Never mix the two histories in one `prisma/migrations` directory.
