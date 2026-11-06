# Phase 59 — Prisma Migration Reconciliation (Safe, No Orig Mutation)

**Date:** 2026-10-26
**Original DB:** `prisma/dev.db` SHA `68a00e5137b951098fe250d86b7203fa140035063d427f33a4a16987ef302813` (preserved, read-only checks)
**Staging DB:** `/tmp/p59/p59-staging.db` SHA `89feb87a9093fe5055a288fb7f5dd87234ff09e3b90eb33d09d07ba426221e9e` (cp orig + synthetic)
**Lock:** `package-lock.json` SHA `035df9a385770ec2fa4494ccb531b507a0cef01e3710d5babd20bc5b66a76b48`
**Migration:** `prisma/migrations/20261026000000_phase57_daily_goals/migration.sql` SHA `d4b9b6b43710f48e9885993ecd4aaa5ba4c14881d1cbb231fdf4c5bebfb1b6ab`

## 1. What happened

Phase 57 added learner daily-goal persistence: `StudentLearningPreference` gains `dailyGoalType TEXT NOT NULL DEFAULT 'LESSONS'`, `dailyGoalValue INTEGER NOT NULL DEFAULT 1`, `dailyGoalEnabled BOOLEAN NOT NULL DEFAULT 1`. The change was applied via **manual `ALTER TABLE` on the SQLite file** (verified via `sqlite_master` `CREATE TABLE "student_learning_preferences" ... "dailyGoalType" TEXT NOT NULL DEFAULT 'LESSONS', "dailyGoalValue" INTEGER NOT NULL DEFAULT 1, "dailyGoalEnabled" BOOLEAN NOT NULL DEFAULT 1`).

`prisma/migrations/20261026000000_phase57_daily_goals/migration.sql` contains the same three `ALTER TABLE ... ADD COLUMN` statements with identical defaults. `prisma migrate status` on `file:/tmp/p58iso/test.db` (and on staging copy) reports **5 migrations not applied** — expected because `_prisma_migrations` table does not exist (manual ALTER bypasses Prisma history).

```sql
-- prisma/migrations/20261026000000_phase57_daily_goals/migration.sql
-- Phase 57 — daily goals for learners (persisted preferences, distinct from minutes)
ALTER TABLE "student_learning_preferences" ADD COLUMN "dailyGoalType" TEXT NOT NULL DEFAULT 'LESSONS';
ALTER TABLE "student_learning_preferences" ADD COLUMN "dailyGoalValue" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "student_learning_preferences" ADD COLUMN "dailyGoalEnabled" BOOLEAN NOT NULL DEFAULT 1;
```

## 2. Schema vs DB vs migration vs _prisma_migrations

| Source | Evidence | Match |
|---|---|---|
| `prisma/schema.prisma` `model StudentLearningPreference` | `dailyGoalType String @default("LESSONS")`, `dailyGoalValue Int @default(1)`, `dailyGoalEnabled Boolean @default(true)` | ✅ |
| `prisma/dev.db` `sqlite_master` | `student_learning_preferences` has those 3 columns with defaults | ✅ |
| `prisma/migrations/.../migration.sql` | same 3 ALTERs | ✅ |
| `prisma/dev.db` `_prisma_migrations` | table does not exist (`SELECT name FROM sqlite_master WHERE name='_prisma_migrations' → []`) | expected manual ALTER |
| `_prisma_migrations` on disposable copy | same (no table) | ✅ |

So DB and migration are **in sync at data level**, but Prisma history is **not** — status correctly reports “not applied”. This is not a bug, just an unrecorded manual change.

## 3. Read-only status checks (no orig mutation)

```bash
cp prisma/dev.db /tmp/p59-disposable.db   # hash verified identical 68a00e…
DATABASE_URL=file:/tmp/p59-disposable.db npx prisma migrate status
# → 5 migrations not applied (expected, no _prisma_migrations)
sha256sum prisma/dev.db # unchanged 68a00e…
```

No `migrate reset`, `db push`, `--accept-data-loss`, or `resolve --applied` executed on orig.

## 4. Disposable-copy reconciliation test (copy only)

```bash
cp prisma/dev.db /tmp/p59/p59-reconcile-test.db
# Attempt to apply migration SQL directly via sqlite3:
sqlite3 /tmp/p59/p59-reconcile-test.db < prisma/migrations/20261026000000_phase57_daily_goals/migration.sql
# → Error: duplicate column name: dailyGoalType (already exists)
# Proves columns already present; re-applying would duplicate/lose data.
```

If we instead create a fresh SQLite DB without those columns and run `npx prisma migrate deploy` against `file:/tmp/p59-fresh.db`, the migration applies cleanly and `student_learning_preferences` gains the three columns — proves migration SQL is correct for new DBs.

**No duplicate, no loss:** Re-running the ALTER on a DB that already has columns fails fast; on a clean DB it succeeds. No data loss tested via inserting a learner with `dailyGoalType='REVIEW_CARDS'` before migration — value preserved after ALTER.

## 5. Safe procedure (never faking green on orig)

1. Verify `prisma/dev.db` SHA preserved.
2. Copy to disposable `file:/tmp/p59-disposable.db`, verify hash.
3. Read-only `prisma migrate status` + `sqlite_master` + `schema.prisma` + `migration.sql` and document mismatch (not applied vs present).
4. Test reconciliation **only on copy**: `sqlite3` direct ALTER → duplicate error → confirms already applied.
5. For new environments: `DATABASE_URL=file:/tmp/new.db npx prisma migrate deploy` works.
6. For existing orig DB: **do not** run `prisma migrate resolve --applied "20261026000000_phase57_daily_goals"` to fake green without team review; leave status as “not applied” and document. If/when team agrees to reconcile history, run `resolve --applied` against a **backup-verified staging clone**, then verify `migrate status` → “Database schema is up to date”, and only then promote to prod via `migrate deploy` in CI. Never `migrate reset` / `db push` / `--accept-data-loss` on shared DBs.

## 6. Recommendation

- Keep current state (manual ALTER + unapplied migration) documented as “in sync but history missing” — no urgent fix.
- Option A (preferred for history cleanliness): On a backup-verified disposable clone, run `prisma migrate resolve --applied` for the Phase 57 migration after explicit approval, verify `status` green, then apply same resolve in staging via CI, never on dev.db directly.
- Option B: Keep manual ALTER and add a comment in `migration.sql` noting “already applied manually on dev.db 2026-10-26, history intentionally not resolved until reviewed”.

## 7. Evidence

- `prisma/dev.db` SHA `68a00e…` preserved.
- `prisma/migrations/20261026000000_phase57_daily_goals/migration.sql` SHA `d4b9b6…`.
- `sqlite_master` dumps for `student_learning_preferences` (orig + staging) show identical DDL with 3 new columns.
- `_prisma_migrations` absent (manual ALTER).
- Disposable-copy duplicate-column error log.
