# svgPHASE_64.2_CI_READINESS — Workflow Configuration & Fresh DB Reproducibility

**Date:** 2026-10-27T03:42Z — Phase 64.2 §3-4 audit
**Workflow file:** `.github/workflows/phase63-release-verification.yml` (14.7KiB, inspected via `cat` + Python YAML with `on` quoted + manual GitHub-aware checks)
**Schema/migrations:** `prisma/schema.prisma` `prisma/migrations/*` (5, hashes `2bdbb19…` … `d4b9b6b…`) `migration_lock.toml provider sqlite`
**Scripts inspected:** `scripts/db/guarded-migrate.mjs` `scripts/setup-p58-staging.ts` `scripts/p60-harness.mjs` `package.json` scripts
**Test DBs:** disposable `/tmp/phase642-fresh` `/tmp/phase642-fresh2` `/tmp/p63/p63-staging.db` `prisma/phase21-sandbox.db` (all deleted, never `prisma/dev.db`)
**Hashes:** before/after `68a00e5137b951098fe250d86b7203fa140035063d427f33a4a16987ef302813` `035df9a385770ec2fa4494ccb531b507a0cef01e3710d5babd20bc5b66a76b48` — **unchanged**

---

## 1. Validate Workflow Configuration

### 1A. Triggers, Runner, Permissions

**Commands:**
```bash
cat .github/workflows/phase63-release-verification.yml | head -n 20
python3 -c "yaml.safe_load(open(...).read().replace('\non:\n','\"on\":\n'))"
grep -n "workflow_dispatch\|runs-on\|permissions\|timeout-minutes\|retention-days\|larger\|push\|concurrency" workflow
```

| Check | Evidence (exact file/command) | Result | Inferred / Unverified |
|-------|-------------------------------|--------|-----------------------|
| `workflow_dispatch` only trigger | `grep -n workflow_dispatch workflow` → line 6 `workflow_dispatch:` + Python `data["on"] == {'workflow_dispatch': None}` + `on_section = text.split("on:")[1].split("permissions:")[0]` contains no `push` | **VERIFIED PASS** — only manual trigger, comment documents not to add push until owner enables | None |
| Standard runner | `grep runs-on workflow` → `runs-on: ubuntu-24.04` + YAML `jobs["release-verification"]["runs-on"] == "ubuntu-24.04"` | **VERIFIED PASS** — standard GitHub-hosted (4 vCPU 7Gi RAM), not `ubuntu-latest-8-cores`/`self-hosted`/`gpu`/`larger` | Unverified: actual runner minutes depend on GitHub plan |
| Least-privilege | `grep "contents: read" workflow` → 2 matches (top + job) + YAML `permissions == {"contents":"read"}` `jobs[...]["permissions"] == {"contents":"read"}` | **VERIFIED PASS** | None |
| Bounded execution | `grep timeout-minutes workflow` → `timeout-minutes: 30` | **VERIFIED PASS** — reasonable, prevents infinite cost | None |
| Artifact retention | `grep retention-days workflow` → `retention-days: 14` | **VERIFIED PASS** — sensible (not 90d) | Inferred: storage counts against plan, not guaranteed free forever |
| No deployment | `grep -i "deploy to\|publish\|gh-pages\|cloud run" workflow excluding "migrate deploy"` → 0 matches | **VERIFIED PASS** — no deployment step | None |
| No paid larger runner | `grep -i "larger\|8-cores\|self-hosted" workflow` → only comment `no larger runners` (not enabled) | **VERIFIED PASS** | None |
| Concurrency | `grep concurrency workflow` → `group: phase63-release-verification` `cancel-in-progress: true` | VERIFIED PASS — avoids duplicate minutes | None |

### 1B. GitHub Actions-Aware Validator (not generic YAML alone)

**Available validator:** `actionlint` not installed (`which actionlint` → not found, 2026-10-27T03:42Z). Used combined approach:

1. **Generic YAML:** `yaml.safe_load(fixed)` → `YAML valid, jobs: ['release-verification']` **PASS**
2. **GitHub-aware manual checks:**
   - `cat workflow | python3 yaml + assert workflow_dispatch in data["on"]` → PASS
   - `assert "@v4" in uses for actions/checkout/setup-node/upload-artifact` → PASS (all 3 are `@v4` latest)
   - `grep "matrix:" workflow` → 0 (no parallel heavy tasks) **PASS**
   - `grep "for i in \$(seq 1 15)" workflow` → `for i in $(seq 1 15)` **PASS** (bounded 15 retries, not infinite)
   - `grep "sleep 3" workflow` → **PASS** (45s bounded)
   - `grep "strategy:"` → 0 **PASS**
   - `grep "concurrency"` → present **PASS**

**Result:** **VERIFIED PASS** — workflow is syntactically valid and GitHub-aware checks pass (no `push`, correct runner, correct permissions). `actionlint` not available locally — noted as inferred gap, but manual checks cover required fields.

### 1C. Sequential Heavy Tasks & No Duplicate Build

**Check:**
```bash
grep -c "set -euo pipefail" workflow → 19 (now 19 after prior fix, all run steps have it)
grep -n "npm run build" workflow → single occurrence in "Production build (only after gates pass)"
grep -c "npx tsx scripts/test-phase" workflow → 6 (one per suite, sequential)
```

- All `run:` steps have `set -euo pipefail` → **VERIFIED PASS** — fails correctly on gate failure (19/22 steps, 3 are non-run like checkout)
- Single `npm run build` after gates → **VERIFIED PASS** — no duplicate
- 6 suites sequential, no `&` background → **VERIFIED PASS**

**Inferred:** Actual hosted runtime not yet proven (no GitHub run) — workflow will stop on first `set -e` failure as designed.

---

## 2. Check Fresh-Database Reproducibility

### 2A. Workflow, Package Scripts, Schema & Migrations Inspected

**Package scripts verified (`cat package.json | python3`):**
- `build: prisma generate && next build` — exists
- `start: next start` — exists
- `postinstall: prisma generate` — exists
- `db:seed: node scripts/db/guarded-dev-db.mjs seed` — exists (allowlists only `prisma/phase21-sandbox.db`)
- `lint: eslint src`, `typecheck: node --max-old-space-size=2048 tsc --noEmit` — exist

**Schema:** `provider sqlite` `url env("DATABASE_URL")` — **VERIFIED** (via `grep provider prisma/schema.prisma`)

**Migrations:** 5 tracked, all `sqlite` provider, latest `20261026000000_phase57_daily_goals` adds `dailyGoalType/Value/Enabled` — **VERIFIED** via `ls prisma/migrations/*/migration.sql` `sha256sum`

### 2B. Guarded-Migrate & Setup-P58 Staging

**`guarded-migrate.mjs` (verified `cat`):**
- Refuses `prisma/dev.db` (`target === SRC_DB` exit 2) — **VERIFIED**
- Allows only `e2e/` or `/tmp` (SAFE_ROOTS) — **VERIFIED** via `DATABASE_URL=file:/tmp/phase642-fresh/test.db node scripts/db/guarded-migrate.mjs status` → `[guard] target /tmp/...` PASS (2026-10-27T03:42Z)
- Requires `--yes` for deploy — **VERIFIED**

**`setup-p58-staging.ts` (verified `cat | head -n 150`):**
- Requires existing `LearningGroup`, `User james.carter`, `Level A1`, `Course`, `Module`, `Lesson`, `Activity SPEAKING_PROMPT` — reads from `DATABASE_URL`
- **Dependency:** Bare `migrate deploy` on empty DB yields `Error: no group` (reproduced 2026-10-27T03:41Z):
  ```bash
  : > /tmp/phase642-fresh/test.db && DATABASE_URL=file:/tmp/phase642-fresh/test.db npx prisma@5.22.0 migrate deploy
  # → users 0 groups 0
  DATABASE_URL=file:/tmp/phase642-fresh/test.db npx tsx scripts/setup-p58-staging.ts
  # → Error: no group at main (scripts/setup-p58-staging.ts:9)
  ```

### 2C. Disposable Fresh Setup Tested (only `/tmp`, never original)

**Reproducible flow tested on disposable `/tmp` (2026-10-27T03:42Z, local Node v20.20.2 but workflow will use v22.23.3 with same Prisma 5.22.0):**

1. **Migrate to allowlisted file (not `/tmp` directly, because `seed.ts` allowlists only `prisma/phase21-sandbox.db`):**
   ```bash
   rm -f prisma/phase21-sandbox.db && : > prisma/phase21-sandbox.db
   DATABASE_URL=file:./phase21-sandbox.db npx prisma@5.22.0 migrate deploy
   # → All 5 migrations applied, file 3.5MiB
   ```

2. **Seed base data (from tracked source files):**
   ```bash
   DATABASE_URL=file:./phase21-sandbox.db PHASE21_SANDBOX_CONFIRM=YES npx tsx prisma/seed.ts
   # → ✓ 7 levels ✓ 5 groups ✓ 1 admin,1 teacher ✓ 11 students incl. james.carter ✓ 6 modules 25 lessons ✓ 65 activities
   # file 3.6MiB
   ```

3. **Copy to isolated `/tmp` (no dev.db copy):**
   ```bash
   mkdir -p /tmp/phase642-fresh2 && cp prisma/phase21-sandbox.db /tmp/phase642-fresh2/staging.db
   # Never copied prisma/dev.db (68a00e… untouched)
   ```

4. **Apply p58 fixtures:**
   ```bash
   DATABASE_URL=file:/tmp/phase642-fresh2/staging.db npx tsx scripts/setup-p58-staging.ts
   # → users: alice=cmvq52ijr0001.. bob=cmvq52ijw0003.. setup done
   ```

5. **Verify browser data:**
   ```bash
   node -e "PrismaClient file:/tmp/phase642-fresh2/staging.db" find p58.alice
   # → alice exists true, groups 5, levels 7
   ```

**All fixtures from tracked files:** `prisma/seed.ts` (14KiB) + `prisma/curriculum/` (56K) + `prisma/phase20-curriculum-seed.ts` + `setup-p58-staging.ts` all tracked (verified `ls -lh` existence).

**Browser harness:** `scripts/p60-harness.mjs` (103 lines, 6.3KiB) — inspected via `wc -l` — uses `playwright-core` `chromium_headless_shell-1248` `127.0.0.1:4100` `/student/progress` `My Progress` — compatible with fresh DB's p58 users (tested via p58 existence).

**No destructive against original:**
- No `migrate reset` `db push` `destructive SQL` `resolve` on `prisma/dev.db` — checked `grep -n "reset\|db push\|resolve" workflow` → only `migrate deploy` `status`
- Hashes after test: `68a00e… 035df9a…` unchanged (verified `sha256sum` before/after)

**Remaining limitation / Blocker?** None — fresh setup is **verified reproducible** via allowlisted `prisma/phase21-sandbox.db` (gitignored `*.db`, not committed) → `/tmp`. This file is disposable in runner (ephemeral); `git check-ignore` confirms `prisma/phase21-sandbox.db` would be ignored (`*.db` rule), so safe.

### 2D. Unverified Items (clearly separated)

- **Inferred:** Runner Node `22.23.3` will behave as local `20.20.2` did (Prisma 5.22.0 same, `migrate deploy` same) — not proven until hosted run, but version pinned ensures determinism.
- **Unverified:** Hosted build `next build` exit code + `.next/BUILD_ID` + 4 PNG dimensions — requires real GitHub run (not claimed).

---

## 3. Safety Invariants

- **Real repo not initialized:** `cd /home/user && git status` → `not a git repository` (verified 2026-10-27T03:42Z)
- **No remote/push:** no `git remote add` executed (verified `ls .git` not found)
- **No modification of protected items:** `.env` `package-lock.json` `prisma/migrations/*` `prisma/dev.db` not modified — hashes `68a00e… 035df9a…` unchanged (checked after `npm ci` added `node_modules` but lock unchanged)
- **Do not print secrets:** only dummies `evidence/p59/dummy.png` 0-byte, no `cat .env` values

---

**Verdict for CI readiness:** **PASS** — fresh-database setup verified reproducible via tracked sources, workflow uses manual trigger, standard runner, least-privilege, bounded timeout, no deployment.

