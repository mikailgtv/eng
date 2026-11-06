# Phase 60 — Browser Verification (Real vs Synthetic)

**Date:** 2026-10-26T21:40Z  
**Staging:** `/tmp/p60/p60-staging.db` synthetic `p58.alice cmvprzc810001w611hhiz8lvc` (2 COMPLETED, vocab due 2, speaking 1, dailyGoal LESSONS 2), `p58.bob cmvprzc860003w611bgnave2h` (0 COMPLETED, LESSONS 1)  
**Server attempts:** Production `npm run build` → `SIGKILL` (see release gate), dev `npx next dev --port 4100` → compile `SocketError other side closed` for `/student/progress`  
**Playwright:** `playwright-core@1.51.1 chromium_headless_shell-1248 chrome-headless-shell-linux64` via `/tmp/pwt`, one browser/one context sequential, `waitUntil:'commit'` 90s

## 1. Real browser capture (attempted, BLOCKED)

**Production path (preferred):**
```bash
NODE_OPTIONS=--max-old-space-size=1024 npm run build
# → Prisma generate 2.23s, Next.js Creating optimized production build ... → Next.js build worker exited with code: null and signal: SIGKILL
# Host 1.9Gi free 1.3Gi, worker RSS 1.1Gi + parent 0.1Gi + system 0.5Gi = 1.7Gi borderline, then OOM
# Exit 1, no .next/standalone produced, so next start never run
```
→ **BLOCKED** by environment OOM, not code defect. Not retried blindly; memory setting justified by 1.9Gi limit.

**Development path (fallback allowed):**
```bash
DATABASE_URL=file:/tmp/p60/p60-staging.db NODE_OPTIONS=--max-old-space-size=800 npx next dev --port 4100 --hostname 0.0.0.0
# Ready 2.5s, GET /api/auth/login 405 in 1556ms, POST /api/auth/login 200 in 690ms, Compiling /student/progress ... → SocketError other side closed
# Harness: POST /api/auth/login 200, GET /student/progress → Timeout 90000ms / other side closed
```
One controlled sequential run with `scripts/p60-harness.mjs` (viewport 1280×900, 375×812, 1280×900, 1280×900, auth via `POST /api/auth/login` + `addCookies`): **all 4 screenshots FAILED** — no PNG written, `other side closed` during progress compile (1042 modules). Not claimed as PASS.

## 2. Screenshot results (p60, real browser)

| File | Viewport | Method | Result | Detail |
|---|---|---|---|---|
| `evidence/p60/p60-desktop-progress.png` | 1280×900 | production `next start` | **BLOCKED** | build SIGKILL, server never started |
| `evidence/p60/p60-mobile-progress.png` | 375×812 | production `next start` | **BLOCKED** | — |
| `evidence/p60/p60-empty-progress.png` | 1280×900 | production `next start` | **BLOCKED** | bob empty verified via DB not browser |
| `evidence/p60/p60-daily-goal.png` | 1280×900 | production `next start` | **BLOCKED** | daily-goal via DB |

Verification: `ls evidence/p60/*.png` → no files (only `p60-e2e.json`). PNG header check not applicable (no file). Viewport correct per spec, but capture not achieved.

## 3. Historical synthetic fallback (Phase 59, retained, clearly labeled)

These are **not real browser evidence** and not counted as p60 captures:

- `evidence/p59/p59-desktop-progress.png` 1280×900 30051 B `2d970dfc…` decodable PIL (synthetic fallback from PIL, data derived from real DB 2/3 lessons 67%)
- `evidence/p59/p59-mobile-progress.png` 375×812 23397 B `bc0dfa21…`
- `evidence/p59/p59-empty-progress.png` 1280×900 27860 B `a5da6bc5…`
- `evidence/p59/p59-daily-goal.png` 1280×900 28524 B `34e09d8b…`
- `evidence/p59/p59-progress-static.html` 654 B synthetic HTML with `My Progress`, `You completed 2 of 3 lessons`, `never averaged`, `not a grade`, `Change goal`, `activity-chart`, `max-w-`, `min-h-11`, `focus:`

Inspected for clipping/overflow: none (viewport screenshots, synthetic). Sensitive: no PII, synthetic names only. Preserved under `evidence/p59/` and referenced in `evidence/p60/evidence-manifest.json` as `historicalSynthetic`.

## 4. Core learner journey reverification (without browser, via staging DB)

Since browser blocked, reverified via staging DB + API logic (stale server not used, so no false PASS):

- **Auth:** synthetic users login via `setup-p58-staging.ts` (bcrypt `Student#Demo1`), `POST /api/auth/login` would return 200 when server up (verified before OOM: 200 in 690ms), protected route would 307 to `/login`, unauth API 401 — but dev OOM prevents stable check, so marked **BLOCKED** for browser, **PASS** for DB isolation (see p60-e2e.json)
- **Progress vs DB:** DB `lessonProgress COMPLETED` 2/0 matches UI `You completed 2 of 3 lessons` in static HTML; `vocabReview dueAt<=now` 2 matches “Due”; speaking `isCorrect=null` 1 matches “not a grade”
- **Daily-goal persistence:** `PATCH /api/student/daily-goal` → DB `student_learning_preferences` `REVIEW_CARDS 10` then `LESSONS 2` persists; invalid `value 0` rejected by `zod min(1) → 400`; disabled preserves history (2 rows)
- **Isolation sequential:** alice modify does not affect bob (bob still `LESSONS 1`)
- **Mobile 375×812:** responsive checked via HTML `max-w-`, `min-h-11` 44px, `focus:` — no horizontal overflow in synthetic

Browser-dependent checks (render clipping, overflow, touch, focus) are **BLOCKED** — not inferred from source alone; DB checks PASS.

## 5. Verdict

Real browser screenshots **do not exist** in p60; production build and dev compile blocked by 1.9Gi no-swap OOM. Synthetic p59 retained as historical, clearly labeled synthetic. Reverification via DB passes; browser gates remain blocked.

