# PHASE 32 — Database & Migration Report

**Date:** 2026-10-25
**Active application database: SQLite** (`prisma/dev.db`, 4,517,888 bytes). PostgreSQL is **not** configured anywhere in this repo.

## 1. Actual configuration

| Item | State |
|---|---|
| `prisma/schema.prisma` datasource | `provider = "sqlite"` |
| `prisma/migrations/migration_lock.toml` | `provider = "postgresql"` ← **mismatch** |
| `.env` `DATABASE_URL` | points at local SQLite (value not printed) |
| Migration history | 3 directories: `20261007183000_postgresql_baseline`, `20261010000000_phase30_storage_metadata`, `20261010000001_phase32_tenant_isolation` |
| Applied migrations recorded in DB | none — no `_prisma_migrations` table in `prisma/dev.db` |
| Source DB integrity | `sha256 e9b4eac119cc44941d7cdea88c1429945fce40dd1ee7c548759bcfbc68f7fb02` — **unchanged**, verified before and after this phase |

## 2. Blocker: the migration workflow does not run (P3019)

```
$ npx prisma migrate status
Datasource "db": SQLite database "dev.db" at "file:./dev.db"
Error: P3019
The datasource provider `sqlite` specified in your schema does not match the one
specified in the migration_lock.toml, `postgresql`.
```

Consequences, stated plainly:

- `prisma migrate dev` / `migrate deploy` / `migrate status` **cannot be used in this repository at all**, for SQLite or PG.
- There is no record of any migration ever being applied to the development database.
- **`prisma db push` was not used and must not be used** (project rule).
- No migration history exists to roll back to.

This is not repairable by editing data; the repository owner must decide the target provider and rebuild the migration baseline. It was **not** silently changed, because rewriting `migration_lock.toml` or the `postgresql_baseline` directory would destroy the intended PG path and any deployment that has already applied it.

## 3. Schema drift — real DB vs `schema.prisma`

A scalar-field comparison of all **213 models** against `prisma/dev.db`:

```
models: 213 | models with drift: 2
  MessageAttachment (message_attachments): originalName, checksum, storageProvider,
      storageBucket, accessLevel, processingStatus, version, updatedAt
  ContentMedia (content_media): originalName, checksum, storageProvider, storageBucket,
      accessLevel, processingStatus, version, replacedById, organizationId, updatedAt
```

Exactly the two file tables from Phase 30 + Phase 32. Everything else is in sync.

**Runtime impact (reproduced, not inferred):**

```
$ node e2e/probe3.mjs
CODE: P2022
MSG: Invalid `prisma.contentMedia.findFirst()` invocation: The column
     `main.content_media.originalName` does not exist in the current database.
```

So against the real database, **every content-media and message-attachment read/write fails**. `count()` still works (it does not select columns), which is why earlier smoke checks looked healthy. The previous Phase 30 claim that file handling was verified did not hold against the actual database.

**Not fixed here on purpose:** the source DB is declared read-only, and no migration can be applied until §2 is resolved. This is a release blocker recorded in `PHASE_32_BLOCKERS.md`.

## 4. Migration SQL — tested verbatim on a disposable database

Both files were executed **byte-for-byte** (no rewriting) against a throwaway copy of the dev DB:

```
cp prisma/dev.db e2e/migration-test.db
sqlite3 < 20261010000000_phase30_storage_metadata/migration.sql
sqlite3 < 20261010000001_phase32_tenant_isolation/migration.sql
```

| Check | Result |
|---|---|
| phase30 migration | **APPLIED OK** |
| phase32 migration | **APPLIED OK** |
| `content_media` columns (10) | ALL PRESENT |
| `message_attachments` columns (8) | ALL PRESENT |
| indexes | `content_media_checksum_idx`, `message_attachments_checksum_idx`, `content_media_organizationId_idx` |
| destructive statements (`DROP`/`DELETE`/`TRUNCATE`) | none |

The SQL is portable: `ALTER TABLE … ADD COLUMN`, one correlated `UPDATE`, `CREATE INDEX` — valid in SQLite and PostgreSQL. **PostgreSQL execution itself is NOT TESTED** (no instance).

## 5. Backfill rule verified on synthetic rows

The Phase 32 backfill must only fill records whose ownership is reliably known, and must never guess a tenant. Tested on `e2e/migration-test.db` with two inserted rows and the migration's exact `UPDATE` statement:

| Row | Uploader | Before | After | Expected |
|---|---|---|---|---|
| reliable | user with `organizationId` | NULL | org id | **filled** |
| ambiguous | user with `organizationId = NULL` | NULL | **NULL** | **left NULL** |

Result: **PASS.** Ambiguous rows stay NULL and are now denied at read time when more than one organization exists, rather than defaulting to any tenant.

## 6. Rollback

Because the two migrations only add nullable columns, defaults and indexes, rollback is additive-safe:

```sql
-- phase32
DROP INDEX IF EXISTS "content_media_organizationId_idx";
-- SQLite < 3.35 requires a table rebuild to drop a column; PostgreSQL:
ALTER TABLE "content_media" DROP COLUMN "organizationId";

-- phase30
DROP INDEX IF EXISTS "content_media_checksum_idx";
DROP INDEX IF EXISTS "message_attachments_checksum_idx";
-- PostgreSQL: drop the 9 added columns on content_media and 8 on message_attachments
```

Rollback loses only derived metadata (checksums, access levels, tenant tag) — no learner, lesson, exam, attendance or audit rows are touched, and no user file is deleted.

## 7. What a correct operator sequence looks like (not executed)

1. Decide the target provider; make `schema.prisma` and `migration_lock.toml` agree.
2. Rebuild a single baseline for that provider, then `prisma migrate resolve --applied` for an existing deployment.
3. Provision PostgreSQL staging, set `DATABASE_URL`, run `prisma migrate deploy`.
4. Apply the two file migrations **before** deploying the code that reads those columns (otherwise P2022).
5. Re-run `scripts/test-idor-live.mjs` with `E2E_BASE` pointed at staging.

None of steps 1–5 were performed: they change deployment state and require an environment that does not exist.
