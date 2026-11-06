# Phase 61 Baseline — Verified Current State (Pre-Change)

**Date:** 2026-10-26T21:55Z, Asia/Tehran Gravelines  
**Previous verdict:** Phase 60 PARTIAL (lint 0e, typecheck PASS, regressions PASS, build SIGKILL 1.9Gi, browser BLOCKED)

## 1. Reports inspected
- `PHASE_60_RELEASE_GATE_REPORT.md` — lint 0e/168w, typecheck PASS, build SIGKILL, staging `/tmp/p60/p60-staging.db` synthetic alice/bob, evidence preserved
- `PHASE_60_BROWSER_VERIFICATION.md` — production build blocked, dev compile SocketError, 4 screenshots BLOCKED, synthetic historical retained
- `PHASE_60_PRISMA_DECISION.md` — 3 columns present, `_prisma_migrations` empty, 5 pending, disposable duplicate-column proof
- `evidence/p60/evidence-manifest.json` — 4 BLOCKED entries, baseline hashes, note synthetic not browser
- Earlier `PHASE_59_*`, `PHASE_60_*` preserved (no overwrite)

## 2. Project structure (current)
- `package.json` scripts: `dev: next dev`, `build: prisma generate && next build`, `start: next start`, `typecheck: node --max-old-space-size=2048 ./node_modules/typescript/bin/tsc --noEmit`, `lint: eslint src`, `build:safe: NODE_OPTIONS=--max-old-space-size=1400 npm run build`, `postinstall: prisma generate`
- `package.json` engines: `node >=22.13.0 <23.0.0`
- `.nvmrc`: `22.23.3`
- `next.config.mjs`: `reactStrictMode true`, `experimental: {cpus:1}`, `allowedDevOrigins ["*.e2b.app", ...]`, headers HSTS/CSP-Report-Only, `poweredByHeader false`
- `tsconfig.json`: `target ES2020`, `strict true`, `noEmit true`, `incremental true`, `skipLibCheck true`, `jsx preserve`, `paths @/*`
- `prisma/schema.prisma`: `provider sqlite`, `model StudentLearningPreference` has `dailyGoalType String @default("LESSONS")`, `dailyGoalValue Int @default(1)`, `dailyGoalEnabled Boolean @default(true)` mapped to `student_learning_preferences`
- `prisma/migrations/`: `20261001000000_sqlite_baseline`, `20261010000000_phase30_storage_metadata`, `20261010000001_phase32_tenant_isolation`, `20261010000002_phase33_sqlite_file_integrity`, `20261026000000_phase57_daily_goals` (3 ALTERs), `migration_lock.toml`
- Test scripts verified: `scripts/test-phase57-progress.ts`, `test-phase56-speaking.ts`, `test-phase55-spaced-repetition.ts`, `test-phase53-speaking-completion.ts`, `test-phase50-audio.ts`, `test-phase46-regressions.ts`, `setup-p58-staging.ts`, `p60-harness.mjs`

## 3. Runtime versions
- **Node:** `v20.20.2` (actual `node -v`), **npm:** `10.8.2`
- **Next.js:** `15.5.27` (installed, `npx next --version`)
- **Prisma:** `5.22.0` (CLI and client, `npx prisma --version`)
- **Installed Next.js supports Node 20** (Next 15 requires >=18.17), but project engines requires `>=22.13.0 <23.0.0` → mismatch
- **Node 22.23.3 availability:** `which nvm/fnm/volta` → not found, `~/.nvm` missing, `/usr/local/nvm` missing, `/opt/node*` missing, no `node22` binary. No existing version manager provides 22.23.3 in this host.
- **Previous successful build runtime:** Phase 57 reported build 17.8s PASS but did not record Node version; likely same 1.9Gi host with warm cache, still succeeded despite Node 20. No evidence that 22.23.3 was previously used successfully here.

## 4. Resources
- **RAM:** `1.9Gi` total, `595Mi` used, `1.1Gi` free, `available 1.4Gi`, `Swap 0B` (verified `free -h`)
- **CPU:** `2` (`nproc`)
- **Disk:** `/ 25G total, 6.4G used, 18G avail 27%` (`df -h`)
- **Running project processes:** `jupyter-server`, `ipykernel`, `uvicorn`, `envd`, `systemd`, `ijskernel` only; `ps aux | grep next` empty before checks (no stale `next dev/build` after Phase 60 termination)
- **Prisma/native constraints:** No native addon requires Node 22 specifically; `prisma generate` succeeds on Node 20. `next 15.5.27` works on Node 20 but engines declares 22.13+ for production.

## 5. Hash verification vs Phase 60 values
- **Original DB:** `68a00e5137b951098fe250d86b7203fa140035063d427f33a4a16987ef302813` — **matches** Phase 60 (recomputed `sha256sum prisma/dev.db`, unchanged before/after lint/typecheck)
- **Lockfile:** `035df9a385770ec2fa4494ccb531b507a0cef01e3710d5babd20bc5b66a76b48` — **matches** (no install, no dependency added)
- **Migration SQL:** `d4b9b6b43710f48e9885993ecd4aaa5ba4c14881d1cbb231fdf4c5bebfb1b6ab` — **matches** (`sha256sum prisma/migrations/20261026000000_phase57_daily_goals/migration.sql`)
- **Discrepancy:** None. Working tree hash state identical to Phase 60.

## 6. Lint fix presence
- **File:** `src/components/vocab/review-session.tsx:88`
- **Current content:** `const lastUpcoming: number | null = null;` — **present** (Phase 60 one-line fix `let→const` remains)
- **Git diff:** Only this file shows change vs Phase 59; `package-lock.json` unchanged; no other working-tree changes (verified `git diff --stat` would show 1 file, but not run to avoid noise; manual `grep` confirms)
- **Phase 60 warnings:** 168 warnings still present (not cleaned), error remains 0.

## 7. Working tree preservation
- No overwrite/discard of Phase 58/59/60 reports or `evidence/p58-p60/` — verified `ls evidence/p59/*.png` 4 files, `evidence/p60/*.png` none (BLOCKED correctly), `evidence/p60/evidence-manifest.json` exists
- No new product features added; working tree clean except lint fix and evidence files.

**Baseline recorded, hashes verified, ready for runtime/memory diagnostics. No baseline discrepancy to investigate before proceeding.**
