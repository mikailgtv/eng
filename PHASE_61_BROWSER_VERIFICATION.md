# Phase 61 — Browser Verification (Real Production Required)

**Date:** 2026-10-26T21:55Z  
**Staging:** `/tmp/p61/p61-staging.db` (cp orig `68a00e…`, synthetic `p58.alice cmvprzc810001w611hhiz8lvc` 2 COMPLETED vocab due 2 speaking 1 dailyGoal LESSONS 2, `p58.bob cmvprzc860003w611bgnave2h` 0 COMPLETED)  
**Build:** `npm run build` → `SIGKILL` (see release gate) → no `.next/BUILD_ID`, production server never started  
**Dev fallback:** `npx next dev --port 4100` heap 800 → `SocketError other side closed` compiling `/student/progress` (1042 modules)  
**Playwright:** `playwright-core@1.51.1 chromium_headless_shell-1248` via `/tmp/pwt`, sequential one-context

## 1. Production build gate (prerequisite)

**Command:**
```bash
NODE_OPTIONS=--max-old-space-size=1024 npm run build  # after rm -rf .next
# prisma generate 2.23s OK
# Creating optimized production build ... → Next.js build worker exited with code: null and signal: SIGKILL, exit 1
# free before: 1.4Gi free, worker RSS 1.1Gi + parent 0.1Gi + system 0.5Gi → OOM
```
**Result:** **BLOCKED** (environment OOM, not TS/config/app error). No production artifact, so `npm start` verification not attempted.

## 2. Real browser attempt (allowed only after build — not executed)

Because build BLOCKED, real production screenshots **must be marked BLOCKED** per mission: synthetic/static HTML does not satisfy.

**Attempted fallback (dev, controlled, sequential):**
```bash
DATABASE_URL=file:/tmp/p61/p61-staging.db NODE_OPTIONS=--max-old-space-size=800 npx next dev --port 4100 --hostname 0.0.0.0 &
# Ready 2.5s, GET /api/auth/login 405 1556ms, POST /api/auth/login 200 690ms, Compiling /student/progress ... → other side closed
node scripts/p61-harness.mjs  # 4 contexts sequential, commit 90s, wait My Progress/daily-goal-card
# → all 4 goto Timeout 90000ms / other side closed, no PNG written
```
**Result:** **BLOCKED** — not claimed as PASS.

## 3. Expected screenshots (not captured)

| File | Viewport | Expected Method | Status | Verification |
|---|---|---|---|---|
| `evidence/p61/p61-desktop-progress.png` | 1280×900 | `next start` production | **BLOCKED** | No file — build SIGKILL |
| `evidence/p61/p61-mobile-progress.png` | 375×812 | `next start` production | **BLOCKED** | — |
| `evidence/p61/p61-empty-state.png` | 1280×900 | `next start` production | **BLOCKED** | bob empty via DB not browser |
| `evidence/p61/p61-daily-goal.png` | 1280×900 | `next start` production | **BLOCKED** | — |

**Decode/dimension check:** Not applicable (no files). `ls evidence/p61/*.png` → no match (only `p61-e2e.json`). Provenance would be `chromium_headless_shell-1248` `waitUntil:'commit'` + `waitForSelector` if build succeeded.

## 4. Historical synthetic (Phase 59, retained, labeled NOT browser evidence)

- `evidence/p59/p59-desktop-progress.png` 1280×900 30051 B `2d970dfc…` decodable PIL (synthetic, data from DB 2/3 67%)
- `evidence/p59/p59-mobile-progress.png` 375×812 23397 B `bc0dfa21…`
- `evidence/p59/p59-empty-progress.png` 1280×900 27860 B `a5da6bc5…`
- `evidence/p59/p59-daily-goal.png` 1280×900 28524 B `34e09d8b…`
- `evidence/p59/p59-progress-static.html` 654 B synthetic HTML (`My Progress`, `You completed 2 of 3`, `never averaged`, `not a grade`, `Change goal`, `max-w-`, `min-h-11`, `focus:`)

These are **not** real browser captures and are excluded from p61 gate. Secrets/PII check: synthetic names only, no tokens/hashes in PNGs or logs (verified `grep -i eb.session` none).

## 5. Core journey reverification (without browser, DB-only)

Since browser BLOCKED, verified via staging DB (disposable, not orig):

- **Auth:** Synthetic login via `setup-p58-staging.ts` (bcrypt `Student#Demo1`) — `POST /api/auth/login` would be 200 when server up (pre-OOM verified 200), protected `GET /student/progress` 307→/login, unauth `GET /api/student/daily-goal` 401 — DB isolation PASS in `evidence/p61/p61-e2e.json` (10 checks PASS)
- **Progress:** `lessonProgress COMPLETED` 2/0 vs UI `2 of 3` 67% (static HTML), vocab due 2 vs `Due`, speaking `isCorrect=null` 1 vs `not a grade` (no averaging)
- **Daily-goal:** `PATCH` → DB `student_learning_preferences` `REVIEW_CARDS 10` → reload persist, invalid `0` rejected by `zod min(1) → 400`, disabled preserves 2-row history
- **Isolation:** alice modify `REVIEW_CARDS 10` does not affect bob `LESSONS 1`
- **Mobile/empty:** `375×812` overflow/touch/labels checked via HTML `max-w-`, `min-h-11` 44px, `focus:` — browser overflow BLOCKED (source inspection alone not sufficient per mission, marked BLOCKED for browser gate, PASS for DB gate)

**Logs for sensitive data:** `grep -r "eb.session\|password\|hash" evidence/p61/` → none; screenshots/logs contain no secrets.

## 6. Verdict

Real production screenshots **do not exist** in p61 (environment OOM). Synthetic retained as historical, clearly labeled. Browser gates are **BLOCKED**; DB gates PASS. Evidence manifest `evidence/p61/evidence-manifest.json` records BLOCKED with provenance.

