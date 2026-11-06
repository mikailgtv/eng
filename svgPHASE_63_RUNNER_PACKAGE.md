# svgPHASE_63_RUNNER_PACKAGE — Executable Handoff for Human-Operated Runner

**Verdict:** No compatible runner available on host `1.9Gi 0B swap Node v20.20.2` (needs Linux x64 Node 22.23.3 ≥4 Gi). **BLOCKED** gates must be executed by human operator on authorized runner. Do not retry same `next build` on 1.9Gi host.

## Prerequisites
- **Runtime:** Linux x64, `Node 22.23.3` (exact `.nvmrc` + `engines >=22.13.0 <23.0.0`), `npm 10.8.2+`, OpenSSL 3.0.x (Prisma `debian-openssl-3.0.x`), RAM **≥4 Gi** (observed worker 1.1Gi + system 0.5Gi → needs 1.7Gi, 1.9Gi host OOMs, 4Gi recommended), swap 1–2Gi if 2Gi host, disk 2Gi free for `.next`
- **Source:** Exact snapshot from `PHASE_62_SOURCE_SNAPSHOT.md` — file hashes: `prisma/dev.db 68a00e…`, `package-lock.json 035df9a…`, `migration.sql d4b9b6b…`, `Next 15.5.27`, `Prisma 5.22.0`. Verify before install:
  ```bash
  sha256sum prisma/dev.db package-lock.json prisma/migrations/20261026000000_phase57_daily_goals/migration.sql
  # expect 68a00e… 035df9a… d4b9b6b…
  cat .nvmrc # 22.23.3
  node -v # v22.23.3 (activate: nvm use 22.23.3 or volta pin node@22.23.3)
  ```
- **Authorization:** Use only authorized repo clone/copy method (no cloud upload without approval, no paid service, no new CI provider/credentials per Phase 62/63). Do not copy `prisma/dev.db` production data or `.env` secrets to unapproved service.

## Commands (sequential, isolated, fail-fast)

Create `scripts/phase63-release-gate.sh` on runner (or run manually):
```bash
#!/usr/bin/env bash
set -euo pipefail
mkdir -p evidence/p63/logs
exec > >(tee evidence/p63/logs/run.log) 2>&1
echo "=== $(date -Iseconds) Node $(node -v) npm $(npm -v) free $(free -h | grep Mem) ==="
# 1. Check Node & RAM before heavy tasks
node -v | grep -q "v22.23.3" || { echo "BLOCKED: Node 22.23.3 required"; exit 2; }
AVAIL=$(free -m | awk '/Mem:/ {print $7}'); [ "$AVAIL" -ge 3000 ] || echo "WARN: <3Gi avail, build may OOM"
# 2. Install
npm ci
# 3. Prisma
npx prisma generate
# 4. Lint
npm run lint
# 5. Typecheck (isolated)
node --max-old-space-size=2048 ./node_modules/typescript/bin/tsc --noEmit
# 6. Regressions sequential (each isolated)
for f in scripts/test-phase57-progress.ts scripts/test-phase56-speaking.ts scripts/test-phase55-spaced-repetition.ts scripts/test-phase53-speaking-completion.ts scripts/test-phase50-audio.ts scripts/test-phase46-regressions.ts; do node --max-old-space-size=600 ./node_modules/.bin/tsx "$f"; done
# 7. Build (only after above PASS)
rm -rf .next
NODE_OPTIONS=--max-old-space-size=2048 npm run build
# 8. Verify artifacts
ls -lh .next/BUILD_ID .next/static 2>&1 | head
```

**Expected outputs:**
- `npm ci` exit 0, 232 packages, lockfile unchanged (035df9a…)
- `prisma generate` exit 0 `Generated Prisma Client v5.22.0` 2–3s
- `npm run lint` exit 0 `0 errors 168 warnings`
- `tsc --noEmit` exit 0 no diagnostics 20–30s
- Each regression `14/15/16/9/17/10 passed` exit 0
- `npm run build` exit 0 `✓ Compiled successfully` (not `SIGKILL`), duration 60–120s on 4Gi, creates `.next/BUILD_ID`, `.next/server`, `.next/static`

## Environment variables (names only, no values)
- `DATABASE_URL=file:/tmp/p63-staging.db` (disposable staging, never `prisma/dev.db`)
- `NEXTAUTH_SECRET` / `AUTH_SECRET`, `ENCRYPTION_KEY`, any `NEXT_PUBLIC_*` as per `.env.example` — set via runner's secret manager, never echo values (`set +x` before)

## Safe staging DB setup
```bash
cp prisma/dev.db /tmp/p63-staging.db
sha256sum prisma/dev.db # must remain 68a00e… after
DATABASE_URL=file:/tmp/p63/p63-staging.db npx tsx scripts/setup-p58-staging.ts
# creates synthetic p58.alice/bob with Student#Demo1, never writes orig
```

## Production server startup & readiness
```bash
DATABASE_URL=file:/tmp/p63/p63-staging.db npm start -- --port 4100 --hostname 0.0.0.0 &
sleep 5; curl -I http://127.0.0.1:4100/  # expect 200/307
curl -s http://127.0.0.1:4100/api/auth/login -w " %{http_code}\n" | grep 405  # server ready
curl -s http://127.0.0.1:4100/student/progress -o /tmp/probe.html; grep -q "My Progress" /tmp/probe.html && echo "build served"
```

## Browser tests & screenshots
```bash
# Sequential, one browser context at a time (existing harness or minimal new)
node scripts/phase63-browser-harness.mjs  # or scripts/p60-harness.mjs adapted to p63
# Must capture:
ls -lh evidence/p63/p63-desktop-progress.png # 1280×900, PNG header 89 50 4E 47, width=1280 height=900, size>0, decodable PIL
ls -lh evidence/p63/p63-mobile-progress.png # 375×812
ls -lh evidence/p63/p63-empty-state.png # 1280×900 (bob 0 of)
ls -lh evidence/p63/p63-daily-goal.png # 1280×900 (daily-goal-card)
sha256sum evidence/p63/*.png
python3 -c "from PIL import Image; print(Image.open('evidence/p63/p63-desktop-progress.png').size)"
# Verify journeys: login, protected-page, progress reload, daily-goal create/modify/persist/invalid 400, isolation alice/bob, sign-out 401, speaking not graded, vocab due, mobile overflow/touch/keyboard, empty-state
```

**Artifacts to return (without credentials):**
- `PHASE_62_SOURCE_SNAPSHOT.md` verification logs (`node --version`, `free -h`, `sha256sum` before/after)
- `evidence/p63/logs/run.log` with timestamps, exit codes, build output
- `evidence/p63/evidence-manifest.json` with file paths, viewports, dimensions, SHA-256, capture method, decodable=true, provenance (browser, URL, scenario)
- `evidence/p63/p63-e2e.json` with sequential browser results
- `evidence/p63/*.png` 4 authentic PNGs (decoded, dimensions verified, inspected for clipping/secrets)
- `PHASE_63_*` reports (build verification, browser verification, safety audit)

**Log collection & failure classification:**
- `SIGKILL`/`other side closed` + `free` <500Mi + worker RSS 1.1Gi → environmental BLOCKED (not code)
- `TS2322` etc. → code FAIL
- `EBADPLATFORM`/`P1012` → dependency/runtime FAIL
- Preserve full logs `evidence/p63/logs/*.log`

## Cleanup
```bash
pkill -f "next start"  # only harness pids
rm -rf /tmp/p63-staging.db /tmp/p63-*.db /tmp/p63-fresh.db  # staging only, never orig
# Keep .next for artifact verification, remove secrets from logs
```

**Distinguish:** Local `1.9Gi Node 20` completed lint/typecheck/regressions/Prisma (PASS) but build/browser BLOCKED; external runner must complete build+browser to close release.

