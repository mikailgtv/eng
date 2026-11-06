# svgPHASE_64_GITHUB_ACTIONS_SETUP — Private Repo Workflow Preparation (PARTIAL)

**Date:** 2026-10-26T23:00Z — Phase 64 G (local validation complete, hosted execution pending)
**Status:** **PARTIAL** — workflow prepared & locally validated, hosted execution **NOT YET RUN** (no repo created, no minutes assumed)
**Runner target:** Private GitHub repo, standard `ubuntu-24.04` (7Gi RAM), no purchase, no cloud resources
**Baseline:** Node `22.23.3` Next `15.5.27` Prisma `5.22.0` SQLite — hashes `68a00e…` `035df9a…` preserved

---

## 1. What Was Inspected & Prepared Locally

**Project inspected (Phase A):** `package.json` scripts verified (`lint`, `typecheck`, 6 suites, `build`/`start`, `guarded-migrate`), `.gitignore` hardened, `.nvmrc` `22.23.3`, `package-lock.json` `035df9a…`, `prisma/dev.db` `68a00e…`, 5 migrations (`d4b9b6b…` latest), `scripts/setup-p58-staging.ts` + `guarded-migrate.mjs` + `p60-harness.mjs` reviewed, Phase 62/63 reports not overwritten.

**Workflow created:** `.github/workflows/phase63-release-verification.yml` (15KiB, 22 steps) — manual `workflow_dispatch`, `ubuntu-24.04`, `Node 22.23.3`, `npm ci`, least-privilege, 30-min timeout, 14-day artifact, no deploy/secrets/larger runners.

**Validation performed locally:**

| Check | Command | Result |
|-------|---------|--------|
| YAML valid | `python3 -c "yaml.safe_load(open(...))"` | PASS — `on` (True) `workflow_dispatch`, jobs `release-verification` 22 steps |
| Triggers | `grep workflow_dispatch` | PASS — only manual, no push/PR |
| Permissions | `grep "contents: read"` | PASS — top + job level |
| Job ordering | `grep -n "Prisma generate\|Lint\|Typecheck\|Phase 57\|Production build\|browser"` | PASS — C→D→E order sequential, no concurrent heavy tasks |
| Node version | `grep "22.23.3"` | PASS — exact |
| npm ci | `grep "npm ci"` | PASS — no `npm install` command (only comment comparison) |
| Runner | `grep ubuntu-24.04` | PASS — standard, not `larger` |
| Timeout | `grep timeout-minutes` | PASS — 30 |
| Cache | `grep "cache: 'npm'"` | PASS — lockfile-derived key |
| Secrets scan | `grep -R "ghp_\|AWS_" workflow` | PASS — none deployed |
| Hashes unchanged | `sha256sum prisma/dev.db package-lock.json` | PASS — `68a00e… 035df9a…` |

**Original DB/lock unchanged:** Re-ran `sha256sum` after workflow + `.gitignore` edits → `68a00e…` `035df9a…` identical to before (documented in `svgPHASE_64_SOURCE_SAFETY.md`).

---

## 2. Private GitHub Repository — Do Not Upload Secrets

**The local project has no `.git` yet (`git status` → not a git repo).** This is intentional: the user must create the private repo themselves and review what is committed.

### How to create the private repository (step-by-step, no invented URL)

1. **Review untracked & .gitignore:**
   ```bash
   # On local computer (8 GiB RAM, with the sanitized source)
   ls -la .gitignore   # must contain prisma/dev.db, .env, node_modules/, .next/, *.db-wal etc.
   git init
   git status          # verify .env, prisma/dev.db, node_modules are IGNORED (not listed)
   git add package.json package-lock.json .nvmrc next.config.mjs tsconfig.json \
           src/ prisma/schema.prisma prisma/migrations/ public/ scripts/ .github/
   # Never add: prisma/dev.db, .env, .next/, evidence/p60..p64/, node_modules/
   git commit -m "Phase 64: sanitized baseline (no dev.db, no secrets)"
   ```

2. **Create private repo on GitHub (browser):**
   - Open `https://github.com/new`
   - **Owner:** your account, **Repository name:** choose e.g. `englishbridge-lms-private` (example, not invented as real URL)
   - **Visibility:** **Private** (do not make public)
   - **Do not** initialize with README/license (keep empty to push existing code)
   - Click **Create repository**

3. **Push sanitized source (no force, no auto-publish of history):**
   ```bash
   # GitHub shows the URL after creation — use THAT URL (do not guess)
   git remote add origin https://github.com/<YOUR_USERNAME>/<YOUR_REPO>.git
   git branch -M main
   git push -u origin main
   # Verify on GitHub: repository is Private, no prisma/dev.db or .env in file list
   ```

**Do not upload:** `prisma/dev.db` (4.5MiB), `prisma/*.bak`, `.env`, `.env.local`, any `*.pem`/`*.key`, `evidence/` screenshots with synthetic data (they are gitignored), `.next/`.

---

## 3. Run the Workflow & Download Evidence

**Actions is free for public repos, and private repos include 2,000 Ubuntu minutes/month free (then pay-as-you-go).**

1. **Open Actions:**
   - In your new private repo on GitHub → tab **Actions** → left sidebar **`Phase63 Release Verification (Private)`** (or wait for first push to show).

2. **Manually run:**
   - Click **Run workflow** → branch `main` → **Run workflow** (green button)
   - Job appears → click run → **Summary** shows 22 steps progress (install, lint, typecheck, 6 regressions, migrate deploy, p58 fixtures, build, server readiness, Chromium, 4 screenshots).

3. **Inspect minutes:**
   - **Actions → that run → Summary** shows **Duration** (expected 6–10 min first run with cache cold, 4–7 min cached)
   - **Settings → Billing and licensing → Usage** shows Actions minutes used (private repo quota)
   - Workflow uses `concurrency: cancel-in-progress` to avoid duplicate minutes

4. **Download artifact:**
   - At bottom of run Summary → **Artifacts** → `phase63-evidence` → download ZIP (contains `evidence/p63/*.png` `run-summary.json` `.next/BUILD_ID`, retention 14 days)
   - Verify locally: `unzip phase63-evidence.zip && file evidence/p63/*.png && sha256sum evidence/p63/*.png`

5. **If build fails (expected if base seed missing for fresh DB):**
   - Check **Logs** for `p58 fixtures failed` — follow Phase D instructions in `svgPHASE_64_RELEASE_WORKFLOW.md` to enable base seed via `prisma/phase21-sandbox.db`
   - Do not re-run repeatedly without fixing — each run costs minutes

**Do not configure auto-deploy, cloud credentials, or larger runners.**

---

## 4. Workflow Cost & Safety (documented for user)

| Control | Workflow Value | How to Inspect |
|---------|---------------|---------------|
| Runner | `ubuntu-24.04` standard (4 vCPU, 7Gi RAM, 14Gi SSD) — sufficient for `next build` (previous SIGKILL was 1.9Gi local) | Actions log → `Setup job` shows runner |
| Minutes | ~6–10 min cold, ~4–7 min cached; free quota 2,000 Ubuntu min/mo for private repos | `Actions → run → Duration` + `Settings → Billing` |
| Artifact storage | `phase63-evidence` 14-day retention, ~1–3 MiB ZIP (4 PNGs ~100–300KiB + BUILD_ID) | `Actions → Artifacts` |
| Cache | `actions/setup-node cache: npm` keyed on `package-lock.json` hash `035df9a…` — no DB/secrets cached | `Actions → Caches` |
| Frequency | `workflow_dispatch` manual only — user must click **Run workflow** | `.github/workflows/*.yml` `on:` |
| No paid features | No `runs-on: ubuntu-latest-8-cores`, no `larger-runner`, no `concurrency` abuse | Workflow file `runs-on:` |
| Secrets | None required; `DATABASE_URL` is ephemeral `/tmp/p63/p63-staging.db`, not a secret | Workflow `env:` |

**Preserved locally:** `prisma/dev.db` `68a00e…` and `package-lock.json` `035df9a…` never changed (verified before/after).

---

## 5. Final Status (separated)

| Category | Result | Evidence |
|----------|--------|----------|
| **Locally verified** | PASS — hashes unchanged, `.gitignore` hardened, 6 suites/lint/typecheck paths verified, setup/guarded-migrate inspected | `svgPHASE_64_SOURCE_SAFETY.md` `sha256sum` outputs |
| **Workflow preparation** | PASS — YAML valid, triggers/permissions/timeout/job ordering verified, no secrets/deploy/larger runners | `.github/workflows/phase63-release-verification.yml` (this doc §1) |
| **Hosted execution** | **NOT RUN** — no GitHub repo created by this assistant, no workflow run claimed, no minutes assumed | No invented URL, no `phase63-evidence` ZIP (would be `actions/upload-artifact` result) |

**Verdict:** **PARTIAL** — workflow ready for private repo, hosted build/browser not yet executed. Creating YAML is not proof of hosted build.

**Next step for user:** Follow §2–3 above to create private repo, push sanitized source, run workflow, download `phase63-evidence`. After hosted run succeeds through build + 4 PNGs, verdict becomes **PASS**.

**Do not begin Phase 65** until hosted verification completes.

