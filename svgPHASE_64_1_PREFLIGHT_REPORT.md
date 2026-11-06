# svgPHASE_64.1_PREFLIGHT_REPORT — Audit Before Private GitHub Upload

**Date:** 2026-10-26T23:10Z — Phase 64.1 pre-flight audit
**Auditor host:** `1.9Gi RAM 0B swap 2CPU` `Node v20.20.2` (runner requires `22.23.3`) `Next 15.5.27` `Prisma 5.22.0`
**Workflow:** `.github/workflows/phase63-release-verification.yml` (15KiB → 14.7KiB after 2 minimal fixes)
**Hashes before audit:** `prisma/dev.db 68a00e5137b951098fe250d86b7203fa140035063d427f33a4a16987ef302813` `package-lock.json 035df9a385770ec2fa4494ccb531b507a0cef01e3710d5babd20bc5b66a76b48`
**Hashes after audit:** `68a00e5137b951098fe250d86b7203fa140035063d427f33a4a16987ef302813` `035df9a385770ec2fa4494ccb531b507a0cef01e3710d5babd20bc5b66a76b48` — **unchanged**
**Verdict:** **PASS** — all locally verifiable preflight checks pass and fresh-database setup is reproducible (hosted build/browser still NOT RUN)

> **Final Status Rules (Phase 64):** PASS = hosted workflow succeeds through build + real browser; PARTIAL = workflow prepared but hosted execution not yet completed; BLOCKED = prerequisite prevents preparation. **Local PASS does not mean hosted build passed.**

---

## 1. Validate GitHub Actions Syntax

**File inspected:** `.github/workflows/phase63-release-verification.yml` exact content via `cat` 2026-10-26T23:10Z

**YAML parser edge (explicitly accounted):**
- Command: `python3 -c "yaml.safe_load(open(...).read().replace('\non:\n','\"on\":\n'))"`
- Result: YAML parsers (PyYAML) interpret bare `on:` as boolean `True` (YAML 1.1). Replaced with quoted `"on":` for validation, **workflow file kept as `on:` (GitHub expects unquoted)** — no change needed, noted as known parser behavior. Parsed keys: `['name', 'on', 'permissions', 'concurrency', 'jobs']`, `on: {'workflow_dispatch': None}` correct.

| Check | File / Command | Result | Remaining Limitation |
|-------|---------------|--------|---------------------|
| Triggers | `grep -n "workflow_dispatch" workflow` + YAML `data["on"]` | **PASS** — only `workflow_dispatch` (no `push`/`pull_request`/`schedule`). Comment documents not to add push until owner enables. | None — manual only as required |
| Job dependencies | `cat workflow` sequential jobs | **PASS** — single job `release-verification` with 22 steps in strict order C→D→E, no `needs:` matrix parallel heavy tasks | None |
| Runner label | `grep "runs-on:"` + `yaml data["jobs"]["release-verification"]["runs-on"]` | **PASS** — `ubuntu-24.04` (standard GitHub-hosted, 4 vCPU 7Gi RAM), not `ubuntu-latest-8-cores` or `self-hosted` | None |
| Permissions | `grep "contents: read"` + YAML | **PASS** — top-level `permissions: contents: read` and job-level `permissions: contents: read` (least-privilege), no `write` | None |
| Action versions | `grep "uses:" workflow` | **PASS** — `actions/checkout@v4`, `actions/setup-node@v4`, `actions/upload-artifact@v4` (latest v4, pinned) | None — @v4 is current stable (not SHA-pinned, acceptable for private repo) |
| Expression syntax | `grep -n "if:" workflow` | **PASS** — `if: always()` only on artifact upload + cost note, valid expression | None |
| Artifact paths | `grep "path:" workflow` | **PASS** — `evidence/p63/`, `.next/BUILD_ID`, `.next/trace`, `if-no-files-found: warn`, `retention-days: 14`, `compression-level: 6` | None |
| Timeout | `grep timeout-minutes workflow` + YAML | **PASS** — `timeout-minutes: 30` (reasonable, prevents runaway cost) | None |
| Concurrency | `grep concurrency workflow` | **PASS** — `group: phase63-release-verification` `cancel-in-progress: true` avoids duplicate minutes | None |
| Referenced scripts exist | `re.findall r"scripts/[^\"]+\.(mjs|ts)"` + `ls -lh` | **PASS** — all referenced exist: `scripts/test-phase57-progress.ts` `test-phase56-speaking.ts` `test-phase55-spaced-repetition.ts` `test-phase53-speaking-completion.ts` `test-phase50-audio.ts` `test-phase46-regressions.ts` `scripts/setup-p58-staging.ts` `scripts/p60-harness.mjs` | Browser harness `p60-harness.mjs` still hardcodes `evidence/p60` in code — workflow handles via `cp` fallback (documented minimal harness adaptation needed if harness not updated) |
| Fail-correctly | `grep "set -euo pipefail" workflow` + step count | **PASS after fix** — initially 21/22 steps had `set -euo pipefail`, final `Workflow cost note` lacked it. Fixed 2026-10-26T23:10Z adding `set -euo pipefail` (commit diff below). All 22 now fail on unexpected error. | None — workflow now fails correctly |
| No hosted validation claim | `cat svgPHASE_64_GITHUB_ACTIONS_SETUP.md` | **PASS** — no claim of hosted run; verdict PARTIAL, not PASS | None — honest |

**Fix applied (minimal, documented):**
```diff
-      - name: Workflow cost and safety note
-        if: always()
-        run: |
-          echo "=== Inspect workflow minutes...
+      - name: Workflow cost and safety note
+        if: always()
+        run: |
+          set -euo pipefail
+          echo "=== Inspect workflow minutes...
```
- File: `.github/workflows/phase63-release-verification.yml`
- Reason: reproducible finding — last step would not fail on error, inconsistent with other gates
- Application behavior: **not modified**

---

## 2. Audit Fresh Database Provisioning (summary)

**Detailed results:** `svgPHASE_64_1_DATABASE_ISOLATION.md` (this report §2 is summary)

**Findings:**
- **Workflow CAN create fresh disposable DB without `prisma/dev.db`** — tested disposable flow `migrate deploy` → `seed` → `p58` on `/tmp` files only.
- **Original workflow had unresolved prerequisite:** `setup-p58-staging.ts` requires base data (`LearningGroup`, `james.carter`, `Level A1` etc.) that empty `migrate deploy` alone does not provide → `Error: no group` reproducible (see isolation report).
- **Solution implemented (minimal workflow fix):** use allowlisted `prisma/phase21-sandbox.db` (with `PHASE21_SANDBOX_CONFIRM=YES` `DATABASE_URL=file:./phase21-sandbox.db`) for `migrate deploy` + `prisma/seed.ts`, then `cp` to ` /tmp/p63/p63-staging.db` then `setup-p58-staging.ts`. Tested 2026-10-26T23:10Z on disposable `/tmp/p64-final/staging.db` → `users: alice=cmvpuvgyc… bob=cmvpuvgyh…` `prefs LESSONS 2` PASS. See isolation report for exact commands.
- **Guarded runner verified:** `scripts/db/guarded-migrate.mjs` refuses `prisma/dev.db` (`target === SRC_DB` exit 2), refuses non-SQLite, refuses production paths, only allows `e2e/` or `/tmp` — confirmed via `DATABASE_URL=file:/tmp/p64-preflight/test-fresh.db node scripts/db/guarded-migrate.mjs status` → `[guard] target /tmp/p64-preflight/test-fresh.db` PASS.
- **No destructive commands:** workflow uses `migrate deploy` (safe for fresh DB), never `migrate reset` `db push` `--accept-data-loss` `resolve` against original (checked `grep migrate reset` absent, guarded-migrate blocks).
- **Browser data requirements:** p58 fixtures provide `p58.alice` (2 COMPLETED lessons, 1 due vocab, speaking completion) + `p58.bob` (0 progress, empty-state) + daily-goal `LESSONS 2` → satisfies 4 screenshots + 10 journeys (see isolation report).

**Remaining limitation:** Fresh DB provisioning now reproducible locally, but `prisma/seed.ts` currently allowlists only `prisma/phase21-sandbox.db` — workflow creates that file ephemerally in runner (not committed, gitignored `prisma/*.db`). This is safe and disposable; no change to `safe-seed-target.ts` needed because runner is ephemeral. If owner prefers pure `/tmp` without repo file, a one-line allowlist addition would be needed (documented, not implemented).

---

## 3. Audit Source Hygiene (summary)

**Detailed results:** `svgPHASE_64_1_SOURCE_HYGIENE.md`

| Category | `.gitignore` Pattern | `git check-ignore` Test | Result |
|----------|---------------------|-------------------------|--------|
| `prisma/dev.db` + `-journal/-wal/-shm` | `prisma/dev.db` `prisma/*.db` `*.db-journal/-wal/-shm` | `git check-ignore prisma/dev.db` → ignored | **PASS** |
| `.env` + credentials | `.env` `.env.*` `!.env.example` | `git check-ignore .env` → ignored, `git check-ignore .env.local` → ignored, `touch private.key` → ignored via `*.key` | **PASS** |
| Private keys/tokens | `*.pem` `*.key` `*token*` `*credentials*` `.secrets/` | Created test `secret.pem` `token123.txt` in temp repo → `git status --ignored` shows `!!` | **PASS** |
| `node_modules/` | `node_modules/` | `git check-ignore node_modules/foo.js` → ignored | **PASS** |
| `.next/` | `.next/` | `git check-ignore .next/foo` → ignored | **PASS** |
| Temporary/evidence | `evidence/p60/`…`p64/` `test-results/` `.playwright/` | `mkdir evidence/p63` `touch evidence/p63/p63-desktop-progress.png` → ignored (`!! evidence/`) | **PASS** |
| Backups | `prisma/*.bak` `backups/` `*.bak` | `touch prisma/test.bak` → ignored | **PASS** |
| No git repo yet | `git status --short --ignored` in temp init | Simulated `git init` `/tmp/git-test` → `!! .env` `!! prisma/` `!! node_modules/` as expected | **PASS** |
| Proposed staging list | Docs: `package.json package-lock.json .nvmrc next.config.mjs src/ prisma/schema.prisma prisma/migrations/ .github/` | `ls -lh` all exist, none are secrets | **PASS** |
| Secret scan | `grep -r "sk-proj|ghp_|AKIA" --exclude-dir=node_modules,.next,.cache` | Only scan patterns in docs, no real leaked secrets | **PASS** |
| User data | `evidence/p59/*.png` synthetic `p58.*` only | Checked `evidence-manifest.json` — no real PII | **PASS** |

**No repository initialized on user's behalf** — `git status` in `/home/user` still `not a git repository`.

---

## 4. Verify Cost and Workflow Scope

| Check | Command | Result |
|-------|---------|--------|
| `workflow_dispatch` only trigger | `grep -n workflow_dispatch workflow` + YAML `data["on"]` | **PASS** — only manual, comment says not to add `push` |
| Standard runners only | `grep runs-on workflow` | **PASS** — `ubuntu-24.04` only, no `larger`, `self-hosted`, `gpu` |
| No deployment/publication | `grep -i "deploy to\|publish\|pages\|cloud run" workflow` (excluding `migrate deploy`) | **PASS** — none found |
| No paid larger runner | `grep -i "larger" workflow` | Only comment “no larger runners” — not enabled |
| Bounded timeouts | `grep timeout-minutes` | **PASS** — 30 min |
| Sensible artifact retention | `grep retention-days` | **PASS** — 14 days |
| Sequential heavy tasks | `grep -n "for i in.*seq" workflow` + step list | **PASS** — bounded `for i in $(seq 1 15)` `sleep 3` (45s max), no concurrent `next build` + tests |
| No unnecessary duplicate build | `grep -n "npm run build" workflow` | **PASS** — single `npm run build` after gates, no duplicate |
| No infinite readiness | `grep -n "seq 1 15" workflow` | **PASS** — 15 retries bounded, exits 1 on failure |

**Free minutes note:** GitHub free quota is plan-dependent (e.g., 2,000 Ubuntu minutes/mo private), not guaranteed — docs state this, workflow does not guarantee runtime/cost.

---

## 5. Produce Evidence + Hashes

**Reports created:**
- `svgPHASE_64_1_PREFLIGHT_REPORT.md` (this file)
- `svgPHASE_64_1_DATABASE_ISOLATION.md`
- `svgPHASE_64_1_SOURCE_HYGIENE.md`

**Fixes documented (minimal):**
1. Add `set -euo pipefail` to cost note step
2. Correct disposable DB flow to use allowlisted `prisma/phase21-sandbox.db` → `seed` → `cp` → `p58` (tested reproducible)

**Hashes (recalculated before & after, 2026-10-26T23:10Z):**
- Before: `68a00e5137b951098fe250d86b7203fa140035063d427f33a4a16987ef302813` `035df9a385770ec2fa4494ccb531b507a0cef01e3710d5babd20bc5b66a76b48`
- After: `68a00e5137b951098fe250d86b7203fa140035063d427f33a4a16987ef302813` `035df9a385770ec2fa4494ccb531b507a0cef01e3710d5babd20bc5b66a76b48` — **unchanged**

**Application behavior:** Not modified.

---

## 6. Exact Next Manual Step for User (do not begin Phase 65)

**Do not create repo/push/trigger workflow yet without reading hygiene report.**

1. **Review hygiene + isolation reports** (`svgPHASE_64_1_SOURCE_HYGIENE.md` `svgPHASE_64_1_DATABASE_ISOLATION.md`) + workflow file `.github/workflows/phase63-release-verification.yml` (now with corrected DB flow).
2. **On local computer (8 GiB RAM):** `git init` then `git add` only proposed safe list (`package.json` `package-lock.json` `.nvmrc` `next.config.mjs` `tsconfig.json` `src/` `prisma/schema.prisma` `prisma/migrations/` `public/` `scripts/` `.github/` `.gitignore` `.env.example`) — verify `git status --short --ignored` shows `!! .env` `!! prisma/dev.db` `!! node_modules/` `!! .next/`.
3. **Create private repository** at `https://github.com/new` (Private, no README), push sanitized source (`git remote add origin https://github.com/<YOU>/<REPO>.git` `git push -u origin main`).
4. **Run workflow:** GitHub → new repo → **Actions** → **Phase63 Release Verification (Private)** → **Run workflow** → branch `main` → **Run**. Watch for base-seed step `Seed base data to allowlisted path` → `cp` → `p58 fixtures applied` logs.
5. **Download artifact** `phase63-evidence` after run (14-day retention), verify 4 PNGs `1280×900`/`375×812` and `.next/BUILD_ID`.

**Verdict remains PARTIAL for overall Phase 64 (hosted not run) — local preflight is PASS.**

