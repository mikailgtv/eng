# Phase 61 — Release Runner Handoff (Current Host Cannot Complete Build)

**Reason:** Host `1.9Gi RAM, 0B swap, 2 CPUs` cannot complete `next build` (worker SIGKILL OOM). Typecheck PASS, lint PASS, but production build requires ≥4 GiB. Do not run heavy build on this host again without materially different conditions.

## Required runtime (verified)
- **Node:** `22.23.3` as per `.nvmrc` and `package.json engines >=22.13.0 <23.0.0`. Current host has `v20.20.2` (mismatch, Next 15.5.27 works on 20 but project declares 22.13+). Verify on runner: `node -v` must show `v22.23.3`, `npm -v` 10.8+ (tested 10.8.2).
- **How verified:** `cat .nvmrc` → 22.23.3, `cat package.json | grep engines`, `node -v` on this host → 20.20.2, `which nvm/fnm/volta` → none. No downloader available per policy.
- **Next.js:** `15.5.27` (installed), `experimental.cpus:1` recognized (single `jest-worker/processChild` observed). Requires Node 22.13+ per engines.
- **Prisma:** `5.22.0` (CLI+client), `debian-openssl-3.0.x`, `linux`

## OS/arch
- **OS:** Linux `debian-openssl-3.0.x` (Prisma binaryTarget), `linux` x64 observed. No arch constraint beyond Node 22 Linux x64.
- **Files required:** Entire repo checkout including `prisma/dev.db` (original, never written), `prisma/migrations/`, `prisma/schema.prisma`, `package.json`, `package-lock.json 035df9a…`, `.nvmrc`, `next.config.mjs` (cpus:1), `tsconfig.json`, `src/`, `public/`, `scripts/` (test harnesses)

## Minimum RAM / swap
- **RAM:** ≥4 GiB (Phase 57 succeeded 17.8s with warm cache on ~1.9Gi but current build needs >1.7 Gi worker + 0.5 system = >1.9; 4 Gi provides headroom). **Swap:** recommended 1–2 Gi buffer if host is 2 Gi; production runner should have swap or 4 Gi+ RAM. Current host has 0B swap and fails even with `NODE_OPTIONS=--max-old-space-size=1024` (SIGKILL after 140s).

## Environment variables (names only, no values)
- `DATABASE_URL` — e.g. `file:./prisma/dev.db` for production, `file:/tmp/p61-staging.db` for isolated browser tests (never original)
- Any `NEXT_PUBLIC_*`, auth secrets, `DATABASE_URL` production, `ENCRYPTION_KEY` etc. as per `.env.example` / existing `.env` (do not commit values)
- `NODE_OPTIONS=--max-old-space-size=2048` recommended for typecheck/build on 4 Gi runner

## Safe DB isolation
- **Original DB:** `prisma/dev.db SHA 68a00e…` read-only, never written during tests. Verify before/after: `sha256sum prisma/dev.db` must remain `68a00e5137b951098fe250d86b7203fa140035063d427f33a4a16987ef302813`.
- **Staging:** `cp prisma/dev.db /tmp/p61-staging.db` (or `/tmp/p60-staging.db`), then `DATABASE_URL=file:/tmp/p61-staging.db npx tsx scripts/setup-p58-staging.ts` to create synthetic `p58.alice`/`p58.bob` (bcrypt `Student#Demo1`). Writes confined to `/tmp/` disposable.
- Never run `prisma migrate reset`, destructive `prisma db push`, `--accept-data-loss`, or `migrate resolve --applied` against original.

## Exact commands (sequential, isolated, adapt only if actual script names differ)
```bash
# 0. Verify baseline
node -v  # expect v22.23.3
npm -v   # 10.8.2+
free -h; nproc; sha256sum prisma/dev.db package-lock.json prisma/migrations/20261026000000_phase57_daily_goals/migration.sql
cat src/components/vocab/review-session.tsx | grep -n lastUpcoming  # const ... present

# 1. Install (no lockfile change)
npm ci
# Expected: 232 packages, no lockfile diff (sha 035df9a… unchanged)

# 2. Prisma generate
npx prisma generate
# Expected: Generated Prisma Client v5.22.0, exit 0

# 3. Typecheck (isolated, no concurrent build/browser)
node --max-old-space-size=2048 ./node_modules/typescript/bin/tsc --noEmit
# Expected: exit 0, no diagnostics, ~28s

# 4. Lint (isolated)
npm run lint
# Expected: 0 errors, 168 warnings (no-unused-vars 105, no-explicit-any 61), exit 0

# 5. Production build (isolated, no concurrent)
rm -rf .next
NODE_OPTIONS=--max-old-space-size=2048 npm run build
# Expected: prisma generate 2.4s, Next.js Creating optimized production build ... ✓ Compiled successfully, exit 0 (requires 4Gi)
# Build identity: check .next/BUILD_ID or next build output hash

# 6. Regressions sequential (each isolated, heap 600 to avoid pressure)
node --max-old-space-size=600 ./node_modules/.bin/tsx scripts/test-phase57-progress.ts  # 14 passed
node --max-old-space-size=600 ./node_modules/.bin/tsx scripts/test-phase56-speaking.ts   # 15 passed
node --max-old-space-size=600 ./node_modules/.bin/tsx scripts/test-phase55-spaced-repetition.ts # 16 passed
node --max-old-space-size=600 ./node_modules/.bin/tsx scripts/test-phase53-speaking-completion.ts # 9 passed
node --max-old-space-size=600 ./node_modules/.bin/tsx scripts/test-phase50-audio.ts        # 17 passed
node --max-old-space-size=600 ./node_modules/.bin/tsx scripts/test-phase46-regressions.ts   # 10 passed

# 7. Start production server from built artifact (not dev)
DATABASE_URL=file:/tmp/p61-staging.db npm start -- --port 4100 --hostname 0.0.0.0 &
# Verify readiness: curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:4100/ → 200/307, curl http://127.0.0.1:4100/api/auth/login → 405
# Verify build identity: compare .next/BUILD_ID with server response header if available

# 8. Browser harness (one browser, one context sequential)
node scripts/p61-harness.mjs  # or adapted harness capturing 4 PNGs with viewports 1280x900, 375x812, 1280x900, 1280x900
# Expected: 4 PNGs decoded, no clipping, no PII, evidence-manifest.json updated
```

## Expected exit codes
- `npm ci` 0, `prisma generate` 0, `typecheck` 0, `npm run lint` 0 (0 errors), `npm run build` 0, each regression 0, `next start` background pid, browser harness 0.

## How to start production server and verify readiness
- Use `npm start` (not `next dev`) after successful `npm run build`
- With `DATABASE_URL=file:/tmp/p61-staging.db` (disposable)
- Confirm port 4100 listening: `ss -ltn | grep 4100` or `curl -I http://127.0.0.1:4100/` → 307/200, not ECONNREFUSED
- Check that `GET /api/auth/login` returns 405 (server up) and `GET /student/progress` returns 200 HTML with `My Progress`

## How to execute real browser harness after server ready
- `evidence/p61/` must exist, Playwright `chromium_headless_shell-1248` via `chromium.launch({executablePath: '/home/user/.cache/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell', args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu']})`
- One browser, one context at a time, reuse server, `addCookies` from `POST /api/auth/login`, `page.goto(..., {waitUntil:'commit'})`, wait `My Progress`/`daily-goal-card`, `page.screenshot({path, fullPage:false})`, verify `PNG header 89 50 4E 47`, `readUInt32BE(16/20)` dimensions, size>0, inspect clipping/sensitive.

## How to collect logs and distinguish failures
- **Resource exhaustion:** `Next.js build worker exited with code: null and signal: SIGKILL`, `free -h` shows available <500Mi, `dmesg | grep -i oom` (if permitted) shows `oom-killer`, or `other side closed` during dev compile. Classify as `BLOCKED (environment)`, not code defect.
- **TypeScript diagnostic:** `tsc --noEmit` non-zero with file:line errors (e.g. `error TS2322`) → classify as `FAIL (code)`
- **Runtime/dependency:** `npm ci` EBADPLATFORM, `prisma generate` P1012 → `FAIL (dependency/runtime)`
- **Config:** `Error: experimental.cpus not recognized` → `FAIL (config)`
- **Application build error:** `Failed to compile` with stack → `FAIL (application)`
- Preserve full logs: `/tmp/build.log`, `/tmp/p61-dev.log`, `npm run lint` full output, `typecheck` output, `p61-e2e.json`.

## How to return artifacts without credentials
- Collect: `PHASE_61_*.md`, `evidence/p61/evidence-manifest.json`, `evidence/p61/*.png` (only real captures, decodable), `evidence/p61/p61-e2e.json`, build logs.
- **Do not** copy `prisma/dev.db` production data, `.env` secrets, `eb.session` JWTs, password hashes, or real learner PII. Synthetic `p58.*` users only.
- Use `sha256sum` to prove original DB/lockfile unchanged; include hashes in reports.

## No CI assumed
- **No existing CI verified** on this host (no `.github/workflows` found beyond existing conventions; no external runner detected). Do not claim CI exists. Do not introduce new CI provider/credentials/paid service without authorization. Follow repo's existing conventions if CI is later found (check `next.config.mjs` already has `cpus:1` for small runners).

