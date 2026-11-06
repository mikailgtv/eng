# svgPHASE_64_RELEASE_WORKFLOW — Ordered Gates, Isolated DB, Production Browser (Hosted Runner Spec)

**Date:** 2026-10-26T23:00Z
**Runner:** GitHub-hosted `ubuntu-24.04` (standard, no larger runners, no paid services)
**Node:** `22.23.3` exact (`.nvmrc` + `engines >=22.13.0 <23.0.0`)
**Workflow:** `.github/workflows/phase63-release-verification.yml` (manual `workflow_dispatch` only)
**Local validation:** YAML valid, triggers/permissions/timeout verified, hashes unchanged

---

## Phase B: Workflow Prepared

**File:** `.github/workflows/phase63-release-verification.yml` (15KiB, 22 steps, YAML valid)

**Key properties verified locally (2026-10-26T23:00Z):**

| Requirement | Value | Verified |
|-------------|-------|----------|
| Trigger | `workflow_dispatch` only (no push/PR auto) | YES (`grep workflow_dispatch` found, no push trigger) |
| Runner | `ubuntu-24.04` standard | YES |
| Node | `22.23.3` exact via `actions/setup-node@v4` | YES (`node-version: '22.23.3'`) |
| Install | `npm ci` reproducible (not `npm install`) | YES (`npm ci --loglevel=error`, lock unchanged 035df9a…) |
| Prisma | `5.22.0` via existing lockfile | YES (`npx prisma --version` + `prisma generate`) |
| Permissions | Least-privilege `contents: read` (top + job) | YES (2 occurrences) |
| Timeout | `timeout-minutes: 30` reasonable | YES |
| Concurrency | `cancel-in-progress: true` avoids wasted minutes | YES |
| No deploy | No `deploy`, `publish`, `gh-pages`, `cloud` steps | YES |
| No secrets | No `AWS_ACCESS_KEY`, `PAT`, `ghp_`, no credential envs | YES (scanned) |
| Private repo | Workflow assumes private (docs say create private) | YES |
| No auto push | No `git push`, `commit`, `actions-js/push` | YES |
| No larger runners | `ubuntu-24.04` only, comment “no larger runners” | YES |

---

## Phase C: Ordered Code Gates (sequential, fail-fast)

**Run on hosted runner in this exact order — stop on unexpected failure:**

| Gate | Verified Command (from package.json/scripts) | Exit 0 Required | Logs Preserved |
|------|----------------------------------------------|-----------------|----------------|
| Node + disk verify | `node --version` (must `v22.23.3`) + `df -h` `free -h` `sha256sum package-lock.json` | YES | `run.log` |
| Install | `npm ci --loglevel=error` (lock `035df9a…` 232 pkgs) | YES | — |
| Prisma generate | `npx prisma generate` → `Generated Prisma Client v5.22.0` | YES | — |
| Lint | `npm run lint` → `eslint src` `0 errors 168 warnings` | YES | `evidence/p63/harness.log` |
| Typecheck | `npm run typecheck` → `node --max-old-space-size=2048 tsc --noEmit` `0 errors` | YES | — |
| Phase57 | `npx tsx scripts/test-phase57-progress.ts` 14/14 | YES | — |
| Phase56 | `npx tsx scripts/test-phase56-speaking.ts` 15/15 | YES | — |
| Phase55 | `npx tsx scripts/test-phase55-spaced-repetition.ts` 16/16 | YES | — |
| Phase53 | `npx tsx scripts/test-phase53-speaking-completion.ts` 9/9 | YES | — |
| Phase50 | `npx tsx scripts/test-phase50-audio.ts` 17/17 | YES | — |
| Phase46 | `npx tsx scripts/test-phase46-regressions.ts` 10/10 | YES | — |

**All 6 suites paths verified:** `ls -lh scripts/test-phase57-progress.ts` etc. exist (27KiB/17KiB/18KiB/14KiB/5.4KiB/16KiB). Do not rely on historical PASS — each run must report actual exit codes.

---

## Phase D: Isolated Database & Production Build

**Staging DB setup (verified existing workflow):**

1. **How existing staging works:** `scripts/setup-p58-staging.ts` creates synthetic `p58.alice/bob` from existing `prisma/dev.db` data (requires `LearningGroup`, `User james.carter`, `Level A1`, `Course`/`Module`/`Lesson` already present). `scripts/db/guarded-migrate.mjs` refuses `prisma/dev.db` as target, only allows `e2e/` or `/tmp` with `--yes`, refuses `reset`/`push`/destructive.

2. **Fresh DB limitation:** `npx prisma migrate deploy` on empty file creates schema only (no seed data). `setup-p58-staging.ts` would then fail (`no group`/`no template user`). Base seed `prisma/seed.ts` is allowlisted only to `prisma/phase21-sandbox.db` with `PHASE21_SANDBOX_CONFIRM=YES`, not `/tmp`.

3. **Workflow strategy (safe for fresh DB):**
   ```bash
   mkdir -p /tmp/p63 && : > /tmp/p63/p63-staging.db
   DATABASE_URL=file:/tmp/p63/p63-staging.db npx prisma migrate deploy
   # Option A (if base data needed): seed via allowlisted path then copy
   # : > prisma/phase21-sandbox.db
   # DATABASE_URL=file:./prisma/phase21-sandbox.db PHASE21_SANDBOX_CONFIRM=YES npx tsx prisma/seed.ts
   # cp prisma/phase21-sandbox.db /tmp/p63/p63-staging.db
   DATABASE_URL=file:/tmp/p63/p63-staging.db npx tsx scripts/setup-p58-staging.ts
   ```
   All writes to `/tmp/p63/` disposable; original `prisma/dev.db` never downloaded/copied/committed/restored (verified not in runner).

4. **Never run against original:** No `migrate reset` `db push` destructive SQL `resolve` against `prisma/dev.db` — guarded script exits 2 if target is `SRC_DB`.

**Production build (only after code gates PASS):**

```bash
npm run build  # prisma generate && next build
# Verify artifacts:
ls -lh .next/BUILD_ID && cat .next/BUILD_ID
ls -lh .next/static
```

Previous local failure was SIGKILL (1.9Gi OOM, worker RSS 1.1Gi); runner `ubuntu-24.04` has 7Gi RAM, expected to pass `✓ Compiled successfully` 60–120s. If build fails, workflow stops — browser verification not started, failure logs preserved in artifact.

---

## Phase E: Production Browser Verification (only after build)

**Preconditions:** Build succeeded, `.next/BUILD_ID` present, isolated staging DB populated.

1. **Start production server (same job):**
   ```bash
   DATABASE_URL=file:/tmp/p63/p63-staging.db npm start -- --port 4100 --hostname 0.0.0.0 &
   ```
2. **Bounded readiness retry (45s, 15×3s):** `curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:4100/` expects `200|307|302`, `curl /api/auth/login` expects `405`, pid check each loop.
3. **Chromium setup:** `npx playwright install --with-deps chromium` (fallback `playwright-core` headless shell).
4. **Existing harness:** `scripts/p60-harness.mjs` (or `p59-harness.mjs`) sequential one-context, `/127.0.0.1:4100`, login `p58.alice/bob` `Student#Demo1` via `POST /api/auth/login` then `addCookies` + `page.goto('/student/progress', waitUntil:'commit' timeout 90000)`.
5. **10 E2E journeys (if harness supports):**
   - Auth, nav, reload persist, daily-goal create/update/persist, invalid 400, isolation alice/bob, sign-out 401, speaking ungraded, vocab due, mobile/responsive.
6. **4 authentic screenshots (exact names/dims):**
   - `evidence/p63/p63-desktop-progress.png` 1280×900
   - `evidence/p63/p63-mobile-progress.png` 375×812
   - `evidence/p63/p63-empty-state.png` 1280×900
   - `evidence/p63/p63-daily-goal.png` 1280×900
7. **Verification per screenshot (in workflow):**
   ```bash
   file evidence/p63/p63-desktop-progress.png
   head -c 8 … | od -An -tx1 | grep "89 50 4e 47"  # PNG header
   node -e "b=readFileSync(f); console.log(b.readUInt32BE(16)+'x'+b.readUInt32BE(20), b.length, sha256(b))"
   # Expect 1280×900 / 375×812, size>0, decodable, no clipping
   ```
8. **Artifact upload:** `actions/upload-artifact@v4` name `phase63-evidence` path `evidence/p63/` `.next/BUILD_ID` retention `14` days, `if-no-files-found: warn`.
9. **No secrets/logs leak:** `set +x` before `DATABASE_URL`, no `eb.session` printed, synthetic `p58.*` only.

**If harness requires changes:** Keep minimal (e.g., adapt hardcoded `/tmp/p60` to `/tmp/p63` via env), document in `svgPHASE_64_GITHUB_ACTIONS_SETUP.md`.

---

## Phase F: Cost & Safety (enforced in workflow)

- **Manual until first success:** `workflow_dispatch` only; no push/PR triggers.
- **Avoid repeated builds:** `concurrency cancel-in-progress: true` + single `ubuntu-24.04` runner.
- **Cache:** `actions/setup-node@v4 cache: 'npm' cache-dependency-path: package-lock.json` (lock-derived key, never cache secrets/DBs).
- **Do not cache:** SQLite `*.db` `*.sqlite` are gitignored, not cached.
- **No auto deploy:** No deployment job, no `environment: production`.
- **Inspect minutes/artifacts:** GitHub → repo → **Actions** → run → minutes shown; **Artifacts** → download `phase63-evidence` (retention 14d); **Settings → Billing** for private-repo minutes.
- **Preserve local DB/lock:** Hashes `68a00e… 035df9a…` re-verified after workflow creation (see svgPHASE_64_SOURCE_SAFETY).

---

**Locally verified:** Workflow YAML valid, job ordering correct, 6 suites + build + browser steps present, artifact retention set.

**Hosted execution:** **NOT YET RUN** — no GitHub repo created, no workflow execution claimed (see svgPHASE_64_GITHUB_ACTIONS_SETUP.md for operator steps).

