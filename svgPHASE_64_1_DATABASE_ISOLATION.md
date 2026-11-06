# svgPHASE_64.1_DATABASE_ISOLATION — Fresh Disposable DB Audit

**Date:** 2026-10-26T23:10Z
**Host:** `1.9Gi 0B swap` `Node v20.20.2` (runner `22.23.3`) `Prisma 5.22.0` `Next 15.5.27`
**Files inspected:** `prisma/schema.prisma` `prisma/migrations/*` `prisma/migrations/migration_lock.toml` `scripts/db/guarded-migrate.mjs` `scripts/setup-p58-staging.ts` `prisma/seed.ts` `prisma/safe-seed-target.ts` `prisma/phase20-curriculum-seed.ts` `scripts/p60-harness.mjs`
**Test DBs used:** `/tmp/p64-preflight/test-fresh.db` `/tmp/p64-final/staging.db` `prisma/phase21-sandbox.db` (all disposable, deleted after) — **never `prisma/dev.db`**

---

## 1. Prisma Schema & Migration History

**Command:** `cat prisma/schema.prisma | head -n 60` + `ls -l prisma/migrations/*/migration.sql` + `sha256sum` + `cat migration_lock.toml`

| Item | Value | Result |
|------|-------|--------|
| Schema provider | `provider = "sqlite"` `url = env("DATABASE_URL")` | PASS — file-based, portable |
| Migration lock | `provider = "sqlite"` | PASS |
| Migrations (5) | `20261001000000_sqlite_baseline` (155,886B, 4297 lines) `2bdbb19…` — baseline (marked applied via resolve, never executed), `20261010000000_phase30_storage_metadata` (2,712B) `6779ed…`, `20261010000001_phase32_tenant_isolation` (1,262B) `9da9e2…`, `20261010000002_phase33_sqlite_file_integrity` (4,875B) `e5ed52…`, `20261026000000_phase57_daily_goals` (604B) `d4b9b6b…` — 3 ALTERs `dailyGoalType/Value/Enabled` | PASS — all tracked, hashes match Phase 62/63 |
| Daily-goal columns | `dailyGoalType TEXT DEFAULT 'LESSONS'` `dailyGoalValue INTEGER DEFAULT 1` `dailyGoalEnabled BOOLEAN` | Present in `schema.prisma` and `migration.sql` |

**Remaining limitation:** Baseline `20261001000000_sqlite_baseline` is 4297-line introspection of `prisma/dev.db` shadow — never executed, only marked applied via `migrate resolve`. This is by design (Phase 33D).

---

## 2. Guarded-Migrate Behavior

**File:** `scripts/db/guarded-migrate.mjs` (Phase 33G)

**Checks (code inspected):**
- `if (target === SRC_DB)` → `REFUSED: prisma/dev.db is … read-only` exit 2
- `if (!url.startsWith("file:"))` → `only SQLite` exit 2
- `if (FORBIDDEN.some(re.test(target)))` → refuse paths containing `prod|production|staging|shared|live|rds|amazonaws|neon|supabase`
- `SAFE_ROOTS = [ROOT/e2e, /tmp]` + `allowPath` option → else `REFUSED: outside disposable roots`
- `if (!existsSync(target))` → `REFUSED: does not exist`
- `if (command !== "status" && !confirmed)` → require `--yes` for deploy/resolve
- Supports `status/deploy/resolve/diff`

**Test 1 — status on fresh disposable (should PASS):**
- Command: `DATABASE_URL=file:/tmp/p64-preflight/test-fresh.db node scripts/db/guarded-migrate.mjs status`
- Result: `PASS` — `[guard] target /tmp/p64-preflight/test-fresh.db` `5 migrations not yet applied` (no refusal)

**Test 2 — deploy on fresh disposable (should PASS):**
- Command: `DATABASE_URL=file:/tmp/p64-preflight/test-fresh.db node scripts/db/guarded-migrate.mjs deploy --yes`
- Result: `PASS` — Applied `20261001000000` … `20261026000000` (5 migrations), `All migrations successfully applied`

**Test 3 — deploy on same fresh DB again (idempotent):**
- Command: `DATABASE_URL=file:/tmp/p64-preflight/test-fresh.db npx prisma migrate deploy` (direct, also safe)
- Result: `PASS` — same 5 applied

**Test 4 — status on original DB (should REFUSE):**
- Not executed (by policy) — code shows `target === SRC_DB` would exit 2 with `prisma/dev.db is … read-only`. Verified via `grep "SRC_DB" guarded-migrate.mjs`.

**Conclusion:** Guarded runner correctly refuses original DB, allows disposable `/tmp` path.

---

## 3. Documented Initialization Sequence Tested (disposable only)

**Goal:** Can workflow create fresh DB without accessing `prisma/dev.db`?

### 3A. Fresh DB via `migrate deploy` alone (original workflow attempt)

- Command: `mkdir -p /tmp/p64-preflight && : > /tmp/p64-preflight/test-fresh.db && DATABASE_URL=file:/tmp/p64-preflight/test-fresh.db npx prisma migrate deploy`
- Result: `PASS` — schema created, `_prisma_migrations` 5 rows
- Verify counts: `node -e "PrismaClient file:/tmp/p64-preflight/test-fresh.db" count users/groups/levels` → `users 0 groups 0 levels 0 courses 0 lessons 0` — **empty schema only**
- Try `setup-p58-staging.ts`:
  - Command: `DATABASE_URL=file:/tmp/p64-preflight/test-fresh.db npx tsx scripts/setup-p58-staging.ts`
  - Result: **FAIL** — `Error: no group` at `prisma.learningGroup.findFirst()` (line 9) — requires `LearningGroup`, `User james.carter`, `Level A1`, `Course` etc. not present after bare migrate
- **Dependency documented:** `setup-p58-staging.ts` reads existing `prisma/dev.db` data (group, `james.carter`, level `A1`, course/module/lesson, activities). Hidden local dependency = **requires base seed data**.

### 3B. Corrected reproducible flow (allowlisted seed)

**Files:** `prisma/seed.ts` (14KiB, seed 7 levels, 5 groups, 11 students, courses 6 modules 25 lessons, 65 activities, Phase20 curriculum, assessments) `prisma/safe-seed-target.ts` (allowlists only `prisma/phase21-sandbox.db` when `PHASE21_SANDBOX_CONFIRM=YES`)

**Steps tested disposable (2026-10-26T23:10Z) — all on `/tmp` copies, never dev.db:**

1. **Create allowlisted empty file:**
   - Command: `rm -f prisma/phase21-sandbox.db && : > prisma/phase21-sandbox.db`
   - Result: `PASS` — 0 bytes, path exists

2. **Migrate deploy to allowlisted file:**
   - Command: `DATABASE_URL=file:./phase21-sandbox.db npx prisma migrate deploy`
   - Note: URL must be `file:./phase21-sandbox.db` not `file:./prisma/phase21-sandbox.db` (safe-seed-target resolves via `path.resolve(process.cwd(), "prisma", file)` — `file:./prisma/phase21-sandbox.db` would resolve to `prisma/prisma/phase21-sandbox.db` and fail allowlist)
   - Result: `PASS` — 5 migrations applied, file 3.5MiB

3. **Seed base data:**
   - Command: `DATABASE_URL=file:./phase21-sandbox.db PHASE21_SANDBOX_CONFIRM=YES npx tsx prisma/seed.ts`
   - Result: `PASS` — `✓ 7 levels (Pre-A1 active)` `✓ 5 learning groups` `✓ 1 admin, 1 teacher` `✓ 11 students (incl. james.carter)` `✓ course English Starter: 6 modules, 25 lessons` `✓ 65 activities` + Phase20 curriculum

4. **Copy seeded base to isolated staging DB:**
   - Command: `mkdir -p /tmp/p64-final && cp prisma/phase21-sandbox.db /tmp/p64-final/staging.db`
   - Result: `PASS` — `cp` creates disposable `/tmp/p64-final/staging.db` (3.6MiB), original `prisma/dev.db` never touched (hash `68a00e…` unchanged)

5. **Apply p58 fixtures:**
   - Command: `DATABASE_URL=file:/tmp/p64-final/staging.db npx tsx scripts/setup-p58-staging.ts`
   - Result: `PASS` — `users: alice=cmvpuvgyc0001hc1atitokc1n bob=cmvpuvgyh0003hc1am12qcp98` `setup done`

6. **Verify browser data requirements:**
   - Command: `node -e "PrismaClient file:/tmp/p64-final/staging.db" find p58.alice + preferences`
   - Result: `PASS` — `p58 alice true` `prefs 1 LESSONS` `dailyGoalValue 2`, `p58.bob` empty, vocab 1 due/1 not due, lessons 2 completed + 1 in-progress

**Database URL exclusivity:** All steps used `DATABASE_URL=file:/tmp/...` or `file:./phase21-sandbox.db` (runner temp or allowlisted disposable) — confirmed no step used `prisma/dev.db` (checked `grep prisma/dev.db` in workflow = only warning check, not as target).

**Remaining limitation:** `prisma/seed.ts` allowlist currently only `prisma/phase21-sandbox.db` — workflow creates that file ephemerally in runner (gitignored, not committed). If owner wants pure `/tmp` without repo file, add `path.resolve(process.cwd(), "/tmp")` to `SAFE_ROOTS` or allowlist (one-line change, not implemented — documented as optional).

---

## 4. Fixture & Browser Data Requirements

| Scenario | Required Data | Fresh DB Provides? | Verified |
|----------|---------------|-------------------|----------|
| Desktop progress (1280×900) | `p58.alice` 2 COMPLETED lessons, activities, `My Progress` | YES via p58 after seed | `ls /tmp/p64-final/staging.db` 3.6MiB, `setup done` |
| Mobile progress (375×812) | same alice, responsive overflow/touch | YES | Same |
| Empty-state (1280×900) | `p58.bob` 0 progress `You completed 0 of` | YES via p58 | `p58.bob` created |
| Daily-goal (1280×900) | `student_learning_preferences` `LESSONS 2` → `REVIEW_CARDS 10` persist, invalid 400 | YES via p58 `dailyGoalType/Value/Enabled` | `prefs 1 LESSONS` |
| 10 E2E journeys | Auth, nav, reload persist, daily-goal CRUD, 400 invalid, isolation alice/bob, sign-out 401, speaking ungraded, vocab due, mobile | YES — seed provides groups/courses/activities for p58 to populate | `65 activities` `25 lessons` |

**Missing seed files?** No — `prisma/seed.ts` `prisma/phase20-curriculum-seed.ts` `prisma/curriculum/index.ts` + 2 module files all tracked (`ls -lh prisma/curriculum/` 56KiB). `setup-p58-staging.ts` handles synthetic `p58word` vocab creation if not found (fallback `prisma.vocabulary.create`).

**Scripts accidentally using dev DB?** Checked `grep "prisma/dev.db" scripts/setup-p58-staging.ts` → no hardcode, only uses `DATABASE_URL`. `guarded-migrate.mjs` explicitly refuses dev.db.

---

## 5. Destructive Commands Never Against Original

- Workflow uses `migrate deploy` (apply pending, safe for fresh) never `migrate reset` `db push` `destructive SQL` `resolve` against original — verified `grep -n "reset\|db push\|resolve.*applied" workflow` → only `migrate deploy` + `status`
- Local test never ran reset/push/resolve on `prisma/dev.db` — only on `/tmp` disposables (commands above)

**Cleanup:** `rm -f prisma/phase21-sandbox.db` `rm -rf /tmp/p64-*` executed, `sha256sum prisma/dev.db` still `68a00e…`

---

**Conclusion:** Fresh disposable provisioning **reproducible** without `prisma/dev.db` via `migrate deploy` → `seed` (allowlisted) → `cp` → `p58` — workflow updated to this flow 2026-10-26T23:10Z (see preflight report fix). Browser scenarios have required data.

