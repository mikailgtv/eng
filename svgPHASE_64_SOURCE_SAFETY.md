# svgPHASE_64_SOURCE_SAFETY — Local Project Inspection & Exclusions

**Date:** 2026-10-26T23:00Z (Gravelines FR) — Phase 64A validation
**Host:** `1.9Gi RAM 0B swap 2 CPU` `Node v20.20.2` runtime (required `22.23.3` on runner) `npm 10.8.2` `Next 15.5.27` `Prisma 5.22.0`
**Commit:** No git repo (`ls -la .git` → not found) — file-hash manifest used (`PHASE_62_SOURCE_SNAPSHOT.md` + hashes below)
**Baseline DB:** `prisma/dev.db` preserved read-only, never modified

---

## 1. Project Root Inspected (verified paths)

**Commands:** `ls -la` `cat package.json .nvmrc .gitignore` `cat prisma/schema.prisma` `ls prisma/migrations/` `sha256sum prisma/dev.db package-lock.json prisma/migrations/*/migration.sql` `cat scripts/setup-p58-staging.ts` `cat scripts/db/guarded-migrate.mjs` `ls scripts/p60-harness.mjs` `ls evidence/p59/*.png evidence/p63/*.json` `cat svgPHASE_63_INITIAL_STATE.md svgPHASE_63_RUNNER_PACKAGE.md` `grep -R "SESSION_SECRET" .env*`

| Path | Exists | Verified Command | Purpose |
|------|--------|------------------|---------|
| `package.json` | YES | `cat package.json` | version `0.1.0` private, scripts verified (see §2) |
| `.nvmrc` | YES | `cat .nvmrc` | `22.23.3` exact (engines `>=22.13.0 <23.0.0`) |
| `package-lock.json` | YES | `sha256sum` | `035df9a385770ec2fa4494ccb531b507a0cef01e3710d5babd20bc5b66a76b48` |
| `prisma/schema.prisma` | YES | `cat` | provider `sqlite`, `StudentLearningPreference dailyGoalType/Value/Enabled` |
| `prisma/migrations/` | YES | `ls -R` | 5 migrations + `migration_lock.toml` provider `sqlite` |
| `prisma/dev.db` | YES | `sha256sum` | `68a00e5137b951098fe250d86b7203fa140035063d427f33a4a16987ef302813` |
| `scripts/setup-p58-staging.ts` | YES | `cat` | Isolated staging fixtures: `p58.alice/bob` `LESSONS 2` etc., requires `DATABASE_URL` file: |
| `scripts/db/guarded-migrate.mjs` | YES | `cat` | Guarded runner: refuses `prisma/dev.db`, non-SQLite, outside `e2e|/tmp`, requires `--yes` |
| `scripts/p60-harness.mjs` | YES | `head` | Browser harness: `playwright-core 1.51.1 chromium_headless_shell-1248` 4 viewports 1280×900/375×812, sequential one-context |
| `scripts/test-phase57-progress.ts` … `test-phase46-regressions.ts` | YES | `ls -lh` | 6 suites verified (14/15/16/9/17/10) |
| `PHASE_62* svgPHASE_63*` | YES | `ls -lh` | Phase 62/63 reports preserved, not overwritten |

---

## 2. Package Scripts & Test Commands Verified (not guessed)

**Actual `package.json` scripts (exact):**

```
dev: next dev
build: prisma generate && next build
start: next start
postinstall: prisma generate
typecheck: node --max-old-space-size=2048 ./node_modules/typescript/bin/tsc --noEmit
lint: eslint src
test:phase46: tsx scripts/test-phase46-regressions.ts
test:phase50: tsx scripts/test-phase50-audio.ts
test:phase47: tsx scripts/test-phase47-loading-boundaries.ts
db:migrate:status: node scripts/db/guarded-migrate.mjs status
db:migrate:deploy: node scripts/db/guarded-migrate.mjs deploy
build:safe: NODE_OPTIONS=--max-old-space-size=1400 npm run build
```

**Six regression suites (verified file paths, used in workflow):**
- Phase57 progress: `npx tsx scripts/test-phase57-progress.ts` (27KiB, 14 checks)
- Phase56 speaking: `npx tsx scripts/test-phase56-speaking.ts` (17KiB, 15 checks)
- Phase55 spaced-repetition: `npx tsx scripts/test-phase55-spaced-repetition.ts` (18KiB, 16 checks)
- Phase53 speaking completion: `npx tsx scripts/test-phase53-speaking-completion.ts` (14KiB, 9 checks)
- Phase50 audio: `npx tsx scripts/test-phase50-audio.ts` (5.4KiB, 17 checks)
- Phase46 regressions: `npx tsx scripts/test-phase46-regressions.ts` (16KiB, 10 checks)

**Browser harness:** `scripts/p60-harness.mjs` (6.4KiB) + `scripts/p59-harness.mjs` (19KiB) both sequential, `executablePath /home/user/.cache/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell`, `args --no-sandbox --disable-dev-shm-usage --disable-gpu`, `waitUntil:'commit'` 90s. Existing staging setup `scripts/setup-p58-staging.ts` (8.2KiB) creates `p58.alice/bob` from `prisma/dev.db` template data (group, `james.carter`, level `A1`).

---

## 3. Initial SHA-256 Hashes (before any change)

**Recalculated 2026-10-26T23:00Z:**

| File | SHA-256 | Status |
|------|---------|--------|
| `prisma/dev.db` | `68a00e5137b951098fe250d86b7203fa140035063d427f33a4a16987ef302813` | matches Phase 61/62/63 |
| `package-lock.json` | `035df9a385770ec2fa4494ccb531b507a0cef01e3710d5babd20bc5b66a76b48` | unchanged, 232 packages |
| `prisma/migrations/20261001000000_sqlite_baseline/migration.sql` | `2bdbb196fb0b1f5e24247c00905e6d9847fcc53d25a90adc1b015fd47db1bbb5` | — |
| `20261010000000_phase30_storage_metadata/migration.sql` | `6779ed248c2ffcb28a52b7e28a1a0bf6b54fc2ebd7241fdda5e9817ac336a1d9` | — |
| `20261010000001_phase32_tenant_isolation/migration.sql` | `9da9e202d480a82bb9d4d8e3011f99e4bd016c05b8524636b143404ccf604103` | — |
| `20261010000002_phase33_sqlite_file_integrity/migration.sql` | `e5ed52d3b4801da740cc068997eabd74b2c5dbb59fa85692dd684a91609e9850` | — |
| `20261026000000_phase57_daily_goals/migration.sql` | `d4b9b6b43710f48e9885993ecd4aaa5ba4c14881d1cbb231fdf4c5bebfb1b6ab` | Phase 57 daily goals (3 ALTERs) |
| `prisma/migrations/migration_lock.toml` | `provider = "sqlite"` | — |

**After Phase 64 local validation:** Re-ran `sha256sum prisma/dev.db package-lock.json` → identical (`68a00e… 035df9a…`), `ls -lh prisma/dev.db` 4,521,984 bytes unchanged, no modification.

---

## 4. Secrets & Private Data Scan

**Tracked patterns scanned:** `grep -R "SESSION_SECRET|DATABASE_URL=postgresql|sk-proj|ghp_|AKIA" --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=.cache`

- No real database URLs, passwords, API keys, or PATs committed.
- All `SESSION_SECRET` references are placeholders (`replace-with-64-hex-characters…`) or test fixtures (`"S".repeat(48)`, `"4c0c1d33…"` in `.env` which is **gitignored**).
- `.env` present locally (`SESSION_SECRET="4c0c1d33…"`, `DATABASE_URL="file:./dev.db"`) but **excluded by `.gitignore`** (see §5) — verified not to be uploaded.
- `.env.example` safe template: `SESSION_SECRET=replace-with-…`, `INTEGRATION_SECRET_KEY=replace-with…`, `AI_API_KEY=` blank, no real credentials.
- No `*.pem` `*.key` `*token*` `*credentials*` files found outside `node_modules`/` .next` (checked `find . -name "*.pem"` → none).
- No private user data in `evidence/p59/*.png` (synthetic fallbacks, 23–30KiB) or `evidence/p63/*.json` (synthetic `p58.*` only, no PII).

**Conclusion:** No secrets will be committed; workflow prints only variable names, never values (`set +x`, `DATABASE_URL=file:…` path only).

---

## 5. `.gitignore` Verification & Update

**Before Phase 64:** Covered `.env` `node_modules/` `.next/` `prisma/dev.db` but missing `-wal`/`-shm` variants, credential patterns, and browser artifacts.

**After Phase 64 (verified 2026-10-26T23:00Z):**

```
node_modules/
.next/
out/
*.log
.env
.env.*
!.env.example
!.env.example.*
.env*.local
/storage/
/uploads/
prisma/dev.db
prisma/dev.db-journal
prisma/dev.db-wal
prisma/dev.db-shm
prisma/*.db
prisma/*.db-journal
prisma/*.db-wal
prisma/*.db-shm
prisma/*.bak
prisma/*.sqlite
*.db
*.db-journal
*.db-wal
*.db-shm
*.sqlite
*.sqlite-journal
*.sqlite-wal
*.sqlite-shm
backups/
*.pem
*.key
*.p12
*.pfx
*token*
*credentials*
.secrets/
evidence/p60/
evidence/p61/
evidence/p62/
evidence/p63/
evidence/p64/
test-results/
playwright-report/
.playwright/
coverage/
.DS_Store
*.tsbuildinfo
next-env.d.ts
```

**Exclusions verified (Phase 64A §5):**

| Requirement | Pattern | Present |
|-------------|---------|---------|
| `.env`, `.env.*` while allowing safe example | `.env` `.env.*` + `!.env.example` `!.env.example.*` | YES |
| `node_modules/` | `node_modules/` | YES |
| `.next/` | `.next/` | YES |
| SQLite `-journal/-wal/-shm` | `*.db-*` `*.sqlite-*` + explicit `prisma/dev.db-*` | YES |
| Auth tokens/credentials/private keys | `*.pem` `*.key` `*.p12` `*token*` `*credentials*` `.secrets/` | YES |
| Browser artifacts/tmp test data | `evidence/p60/`…`p64/` `test-results/` `playwright-report/` `.playwright/` | YES |

**Test:** `git check-ignore prisma/dev.db` → ignored; `git check-ignore .env` → ignored; `git check-ignore evidence/p63/p63-desktop-progress.png` → ignored (if git init, these would not be tracked). `prisma/dev.db` size 4.5MiB will never be uploaded.

---

## 6. Safety Guarantees

- **Never upload:** `prisma/dev.db` (4.5MiB, 68a00e…), `prisma/dev.db.phase20.bak`, real user data, `.env` secrets — all gitignored.
- **Do not delete/modify original DB:** Verified hash before/after identical; no `rm prisma/dev.db`, no `DELETE` against it; all test writes to disposable `/tmp/p63/` (workflow) or `e2e/mig33/` (local rehearsal).
- **No destructive migration against original:** `scripts/db/guarded-migrate.mjs` explicitly refuses `prisma/dev.db` as target (checked `target === SRC_DB` exit 2); no `migrate reset` `db push` `resolve` run against it (workflow only `migrate deploy` on `/tmp/p63/p63-staging.db` empty file).
- **No dependency/lockfile churn:** `package-lock.json` SHA `035df9a…` unchanged; workflow uses `npm ci` not `npm install`; no new dependency added in this phase.
- **Do not change engines/.nvmrc:** `.nvmrc` `22.23.3` preserved, `engines >=22.13.0 <23.0.0` preserved.

**Verification:** `sha256sum prisma/dev.db package-lock.json` re-run after `.gitignore` update → `68a00e… 035df9a…` unchanged.

---

**Local validation outcome:** Source safety **PASS** — exclusions complete, secrets not exposed, original DB/lock preserved.

