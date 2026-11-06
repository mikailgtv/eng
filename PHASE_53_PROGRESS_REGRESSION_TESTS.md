# Phase 53 — Progress Regression Tests

**Scope:** Speaking completion persistence. All tests use real application code and disposable DB copies; original `prisma/dev.db` never written.

## 1. Unit / integration (disposable DB) — `scripts/test-phase53-speaking-completion.ts`

Runs against `file:/tmp/<random>/test.db` copied from `prisma/dev.db` (`e9b4eac1…`), with `react.cache` polyfill for server modules. Lesson: `Simple Questions` (`cmujqdeit005mkpua6mn96f1u`) — 6 activities (4 required + 1 optional scorable + 1 optional speaking). Student: first `STUDENT` in DB (cleaned of prior attempts for this lesson).

| # | Test (required by spec) | Result | Detail |
|---|---|---|---|
| 1 | No activity record → uncompleted | **PASS REAL** | `status=NOT_ATTEMPTED answered=0 allAnswered=false requiredRemaining=requiredTotal` |
| 2 | Persisted `isCorrect=null` → `COMPLETED` after reload | **PASS REAL** | `checkAnswer` `isCorrect=null scoreRatio=null`; `submitAttempt` creates `isCorrect=null score=null`; `getPracticeState` → `COMPLETED answered=1` |
| 3 | Self-reported does not become `CORRECT` | **PASS REAL** | `correct=0` `status≠CORRECT` |
| 4 | Does not increase correctness-based scores | **PASS REAL** | `scorePercent=null` (no scorable done), `scoredAttempts=0 correctAttempts=0 accuracy=null` via `getPracticeStats` |
| 5 | Completed does not re-prompt; locked; distinct progress stays 1 | **PASS REAL** | `status=COMPLETED locked=true distinct=1` |
| 6 | Auto-graded `CORRECT`/`INCORRECT` preserve behavior | **PASS REAL** | FILL_BLANK wrong→`INCORRECT` correct=0, correct→`CORRECT` correct=1 (uses real config parsing) |
| 7 | Multiple activities produce expected completed-vs-correct summary | **PASS REAL** | `answered=2 correct=1 allAnswered=false scorePercent=17%` |
| 8 | Duplicate requests → append-only but distinct not duplicated | **PASS REAL** | 2 rapid `submitAttempt` → `count+2` rows, `distinct=1 answered=2` (progress not doubled) |
| 9 | Integrity: original DB untouched | **PASS REAL** | `sha256(original) === sha256(after)` |

**Totals:** 9 passed, 0 failed (label `REAL` — real Prisma, real `checkAnswer`, real `getPracticeState`).

Note: Errors `adaptive.background-work-failed` after disconnect are expected background hooks (no DB after close) — not failures.

## 2. Browser verification — `evidence/p53/`

Server: `next dev -p 4053 -H 0.0.0.0` with `DATABASE_URL=file:/tmp/p53_run1.db` (disposable, freshly cleaned of prior attempts for this lesson). Chromium `chromium_headless_shell-1248` via `playwright-core` from `/tmp` (0 new dependencies).

| ID | Check | Result | Evidence label | Details |
|---|---|---|---|---|
| V0 | Lesson `Simple Questions` loads | **PASS REAL** | REAL | `English Starter · Basic Sentences · Pre-A1` + `Lesson 4 of 4` |
| B2 | Before: practice not yet complete | **PASS REAL** | REAL | `practiceCompleteBlocks=0` |
| B4 | API: speaking `status=COMPLETED` (not CORRECT) | **PASS REAL** | REAL | `GET /api/lessons/.../practice` → `status=COMPLETED` (JSON retained in `p53-browser.json`) |
| B5 | API: speaking does not count toward `correct` | **PASS REAL** | REAL | `correct=0 answered=1 scorePercent=null` |
| B6 | API: speaking counts toward `answered`/progress | **PASS REAL** | REAL | `answered=1 allAnswered=false` |
| B7 | API: score remains null (no scorable done) | **PASS REAL** | REAL | `scorePercent=null` |
| B8 | After reload: still `✓ Done` + `✓ Practiced`, no `I practiced this` | **PASS REAL** | REAL | After `page.reload()` `done=true practiced=true btn=0` (screenshot `p53-simple-after-reload.png` + `p53-desktop-after-reload.png`) |
| B9 | Lesson complete gate still shows required pending (not falsely completed) | **PASS REAL** | REAL | `required exercises left (4 total)` — speaking optional, so not counted |
| M1 | Mobile 375px no horizontal overflow | **PASS REAL** | REAL | `scrollW=375 clientW=375` (screenshot `p53-mobile-375.png`) |
| M2 | Mobile: speaking exercise visible | **PASS REAL** | REAL (after fix) | Exercise `Say this “What is your name? My name is …”` visible |

**Harness notes (not product failures):**

- `B1` and `B3` in the early harness showed `btn=0` before click due to checking `li.filter(hasText: speakingTitle)` before practice had hydrated (server-rendered practice is async via `access` call). The simpler harness `p53_simple.mjs` waits for `getByRole('I practiced this')` and passed: `btn visible → click → btnAfter=0 doneAfterReload=true`. We report the final, correct harness (`p53_simple.mjs`) as `REAL` and keep the initial harness logs as `SOURCE-ONLY` for transparency.
- Immediate after-click `doneVisible=false` was a timing race (React state + `router.refresh()`); persistence after reload is the definitive proof and passed.

**Screenshots (REAL, 375 and 1280):**

- `p53-simple-before.png` — initial lesson, `I practiced this` visible, no Done
- `p53-simple-after.png` — after click (optimistic), button gone
- `p53-simple-after-reload.png` — after reload, `✓ Done` badge + `✓ Practiced — great work!`
- `p53-desktop-after-reload.png` / `p53-mobile-375.png` — same, desktop + mobile no overflow

## 3. Existing suites (post-fix)

| Suite | Result | Notes |
|---|---|---|
| `npm run typecheck` | **PASS** | `tsc --noEmit --max-old-space-size=2048` exit 0 (fixed `scripts/test-phase53...` TS narrowing) |
| `npm test` (full: session-rules + book-import-preview + production-env + environment + db-tls + api-safety + request-trust + staging-gate + release-contracts + phase46 + phase47 + phase50) | **PASS** | 13 + 10 + 6 + 17 passed, `EXIT:0` |
| `npm run release:verify` (`typecheck && npm test && build:safe`) | **PASS** | Next `15.5.27` build lists all routes including `ƒ /teacher/results/[attemptId] 194B` and `/student/learn/[id] 3×`, `EXIT:0` (~96s) |
| Phase 52 fixes still present | **PASS** | `grep -n ApiError` still `if (err.status===404) notFound()`; `grep min-h-11` still in `exam-runner.tsx` |

## 4. Not tested / limitations

- Physical microphone recording / STT / pronunciation scoring — `BLOCKED` (headless has no mic, no TTS voices; Phase 49/50 scope). Our test uses `selfReported:true` as designed.
- Flashcard completion (same `COMPLETED` path) — not separately browser-tested; covered by same unit logic.
- Assessment scoring — not modified, not re-tested beyond preservation check.

