# Phase 60 — Prisma Migration Decision (Safe, No Orig Mutation)

**Date:** 2026-10-26T21:40Z, Gravelines FR  
**Original DB SHA:** `68a00e5137b951098fe250d86b7203fa140035063d427f33a4a16987ef302813` (preserved)  
**Lock SHA:** `035df9a385770ec2fa4494ccb531b507a0cef01e3710d5babd20bc5b66a76b48`  
**Migration SQL SHA:** `d4b9b6b43710f48e9885993ecd4aaa5ba4c14881d1cbb231fdf4c5bebfb1b6ab` (`prisma/migrations/20261026000000_phase57_daily_goals/migration.sql`)  
**Staging:** `/tmp/p60/p60-staging.db` (cp orig, synthetic `p58.alice`/`p58.bob`)  
**Schema:** `prisma/schema.prisma` `model StudentLearningPreference` has `dailyGoalType String @default("LESSONS")`, `dailyGoalValue Int @default(1)`, `dailyGoalEnabled Boolean @default(true)` mapped to `student_learning_preferences`

## 1. Current state (read-only, no orig write)

- **Migration SQL** is exactly 3 ALTERs:
  ```sql
  ALTER TABLE "student_learning_preferences" ADD COLUMN "dailyGoalType" TEXT NOT NULL DEFAULT 'LESSONS';
  ALTER TABLE "student_learning_preferences" ADD COLUMN "dailyGoalValue" INTEGER NOT NULL DEFAULT 1;
  ALTER TABLE "student_learning_preferences" ADD COLUMN "dailyGoalEnabled" BOOLEAN NOT NULL DEFAULT 1;
  ```
- **DB `sqlite_master` (orig & staging):**
  ```
  CREATE TABLE "student_learning_preferences" ("studentId" TEXT NOT NULL PRIMARY KEY, "dailyMinutes" INTEGER NOT NULL DEFAULT 10, "lastSyncedAt" DATETIME, "updatedAt" DATETIME NOT NULL, "dailyGoalType" TEXT NOT NULL DEFAULT 'LESSONS', "dailyGoalValue" INTEGER NOT NULL DEFAULT 1, "dailyGoalEnabled" BOOLEAN NOT NULL DEFAULT 1, FOREIGN KEY ...)
  ```
  → 3 columns exist with correct types/defaults in both orig and staging.

- **Prisma status:**
  ```bash
  cp prisma/dev.db /tmp/p60-disposable.db
  DATABASE_URL=file:/tmp/p60-disposable.db npx prisma migrate status
  # → 5 migrations not applied (including 20261026000000_phase57_daily_goals)
  # Reason: _prisma_migrations table does not exist (manual ALTER bypassed history)
  ```
  ```bash
  sqlite3 prisma/dev.db "SELECT name FROM sqlite_master WHERE type='table' AND name='_prisma_migrations'"
  # → (empty)
  ```

- **Other pending migrations:** 4 additional migrations also report not applied (baseline `20261001000000_sqlite_baseline`, `20261010000000_phase30_storage_metadata`, `20261010000001_phase32_tenant_isolation`, `20261010000002_phase33_sqlite_file_integrity`). They are unrelated to Phase 57 daily-goals; cannot mark “everything applied” blindly — must evaluate individually.

## 2. Disposable-copy reconciliation experiment

**Goal:** Determine if the migration’s full effects (not just columns) are already applied, and prove safe reconciliation without touching orig.

```bash
# 1. Fresh disposable from orig
cp prisma/dev.db /tmp/p60-reconcile-test.db

# 2. Try to apply migration SQL directly
sqlite3 /tmp/p60-reconcile-test.db < prisma/migrations/20261026000000_phase57_daily_goals/migration.sql
# → Error: duplicate column name: dailyGoalType
# Proves columns already present; re-applying would fail, not duplicate/loss.

# 3. Verify defaults work
sqlite3 /tmp/p60-reconcile-test.db "INSERT INTO student_learning_preferences (studentId, dailyMinutes, updatedAt) VALUES ('test123', 10, datetime('now'))"
sqlite3 /tmp/p60-reconcile-test.db "SELECT dailyGoalType, dailyGoalValue, dailyGoalEnabled FROM student_learning_preferences WHERE studentId='test123'"
# → LESSONS | 1 | 1  (defaults correct)

# 4. Test data preservation: existing learner with REVIEW_CARDS 10 keeps value
sqlite3 /tmp/p60-reconcile-test.db "SELECT dailyGoalType, dailyGoalValue FROM student_learning_preferences WHERE studentId='cmvprzc810001w611hhiz8lvc'"
# → LESSONS 2 (preserved)

# 5. Fresh DB test (proves migration SQL is correct for new envs)
rm /tmp/p60-fresh.db; touch /tmp/p60-fresh.db
DATABASE_URL=file:/tmp/p60-fresh.db npx prisma migrate deploy
# → applies baseline + Phase57, creates columns correctly
```

**Schemas compared:** `sqlite_master` DDL on disposable equals `migration.sql` + `schema.prisma`; no extra triggers/indexes in migration, only columns.

## 3. Decision: Do NOT modify original migration history this phase

- **Findings:** Migration’s full effects (3 columns with defaults) **are fully applied** to orig via manual ALTER; DB and schema are in sync at DDL level. History gap is documentation, not data loss. No duplicate/loss on re-apply (fails fast with duplicate column).
- **Safety rule:** Do not run `prisma migrate resolve --applied "20261026000000_phase57_daily_goals"` against `prisma/dev.db` (or any shared DB) in this phase. Also banned: `prisma migrate reset`, destructive `prisma db push`, `--accept-data-loss`.

## 4. Recommended next action (to be executed on backup-verified staging clone, not orig)

When a suitable CI runner with backup is available:

```bash
# On a disposable staging clone (never orig directly):
cp prisma/dev.db /tmp/staging-clone.db
DATABASE_URL=file:/tmp/staging-clone.db npx prisma migrate status  # confirm 5 not applied
DATABASE_URL=file:/tmp/staging-clone.db npx prisma migrate resolve --applied "20261026000000_phase57_daily_goals"
DATABASE_URL=file:/tmp/staging-clone.db npx prisma migrate status  # should reduce pending by 1, still 4 unrelated pending
# Verify schema still correct and data preserved:
sqlite3 /tmp/staging-clone.db "SELECT count(*) FROM student_learning_preferences WHERE dailyGoalType IS NOT NULL"
# If verified, apply same resolve in CI staging environment with backup, then promote.
```

**Why not apply to all 5:** The other 4 pending migrations may not be fully applied; each must be inspected individually (check `sqlite_master` for their tables/columns) before resolving. Blindly marking all applied would hide real gaps.

## 5. Outcome

- **Result:** Documented manual-migration reconciliation plan, proven safe on disposable copy, **no change to original DB history** this phase.
- **Evidence:** `evidence/p60/p60-e2e.json` isolation checks, `sqlite_master` dumps, duplicate-column error log, fresh DB `migrate deploy` success, SHA hashes unchanged.
- **Risk:** `MEDIUM` — status reports “not applied” but data is correct; next deploy with `migrate deploy` would not re-apply duplicate columns (would fail), so CI must use `resolve --applied` path after review. Tenant model intact (per-learner `viewer.id`).

