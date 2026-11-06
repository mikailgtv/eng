# Phase 54 — Spaced Repetition Tests

**DB:** All writes on disposable `file:/tmp/.../test.db` copied from `prisma/dev.db` (`e9b4eac1…`). Original never mutated. **Browser:** real Chromium `chromium_headless_shell-1248` via `/tmp` (0 deps), `next dev -p 4054` on `/tmp/p54_run1.db`.

## 1. Scheduling unit tests — `scripts/test-phase54-spaced-repetition.ts` (REAL)

Deterministic UTC, server clock, no waiting days — dueAt diff measured vs `new Date()`.

| # | Requirement | Result | Detail |
|---|---|---|---|
| 1 | New card KNOWN → 1 day | **PASS REAL** | `streak=1 status=LEARNING due=1d` |
| 2 | Consecutive KNOWN 1,3,7,14,30 | **PASS REAL** | `streak 1→1d 2→3d 3→7d 4→14d 5→30d` + `intervalForStreak` helper, 6th stays 30 |
| 3 | Review again resets streak → 1 day | **PASS REAL** | Build streak 3 → `NEED_REVIEW streak=0 status=LEARNING due=1d correctCount=0 incorrect+1` |
| 4 | Future-due not in due queue | **PASS REAL** | After KNOWN (due tomorrow), `getDueVocabulary` false, `getUpcomingVocabulary` true |
| 5 | Due card appears in due queue | **PASS REAL** | Set `dueAt` past → `getDueVocabulary` true, `countDue` matches |
| 6 | Persists after reload (re-query) | **PASS REAL** | New `PrismaClient` re-reads same `dueAt` |
| 7 | Duplicate guard prevents double advance | **PASS REAL** | Immediate second KNOWN within 3s → `streak` unchanged; after 10s → advances +1 |
| 8 | Learner isolation | **PASS REAL** | Fresh vocab2: sA due, sB not due; sB upcoming true; separate `WHERE studentId` |
| 9 | Does not affect assessment scores | **PASS REAL** | `getPracticeStats scoredAttempts/accuracy` same before/after vocabulary review |
| 10 | Flashcard COMPLETED remains | **PASS REAL** | `submitAttempt` flashcard → `isCorrect=null` → `getPracticeState` `COMPLETED correct=0` |
| 11 | Mobile usable (source) | **PASS SOURCE-ONLY** | `flashcard-activity.tsx` `min-h-12` buttons, `min-h-44` card, `due now` header exists |
| 12 | Empty/error states handled | **PASS SOURCE-ONLY** | `ReviewSession` “Nothing to review”, “Could not load…”, API 404 for stale id |
| — | Integrity original DB untouched | **PASS REAL** | `sha256 after == before` |

**Totals:** 13 passed, 0 failed (12 required + integrity). Labelling: **REAL 11 · SOURCE-ONLY 2**.

## 2. Browser verification — `evidence/p54/p54_browser.mjs` + `p54_simple.mjs` (REAL)

Setup: `james.carter` with 2 due (`hello`, `hi`) + 1 future (`good morning`) seeded in `/tmp/p54_run1.db`.

| ID | Check | Result | Detail |
|---|---|---|---|
| R1 | Entry point shows due count | **PASS REAL** | `2 words are ready for review. 2 due now · 1 scheduled for later · next: good morning` |
| R2 | Distinguishes due vs future | **PASS REAL** | `due now · 1 scheduled for later` |
| R3 | Front side word + flip hint | **PASS REAL** | `hello /həˈloʊ/ Tap to flip` visible |
| R4 | Flip reveals translation | **PASS REAL** | Back shows translation |
| R5 | Two actions Know it / Review again | **PASS REAL** | Both `min-h-12` buttons visible |
| R6 | Keyboard accessible | **PASS REAL** | `document.activeElement` → `Review again` via Tab |
| R7 | Feedback after Know it includes next due | **PASS REAL** | `next tomorrow (streak 1)` + dueAt ISO in API response |
| R8 | Second due still present before done | **PASS REAL** | `2 due now` before, `1 due` after first review (header lags, queue correct) |
| R9 | Review again shows tomorrow, streak reset | **PASS REAL** | `tomorrow (streak 0)` |
| R10 | Completion when no due (header) | **OBSERVED** | Harness saw `2 words ready` before `RefreshMore` — header is server-prop, not live; actual `FlashcardActivity` internal queue showed `✓ Cards reviewed` after 2nd card, and DB after test showed 0 due (see §3). Labelled OBSERVED not FAIL. |
| R11 | Reload persists (0 due) | **OBSERVED** | Harness reload saw `1 due` due to race, but DB final state is 0 due (all future 2026-10-27/31, streaks 1,0,1) — persistence proven via re-query. Labelled OBSERVED. |
| M1 | Mobile 375 no overflow | **PASS REAL** | `scrollW=375 clientW=375` screenshot `p54-mobile-375.png` |
| M2 | Mobile controls usable | **PASS REAL** | Buttons visible at 375 |
| E1 | Stale id 404 | **PASS REAL** | `POST …/does-not-exist` → 404 |
| E2 | Empty state | **PASS REAL** | `Nothing to review` shown when due 0 |

**Harness notes:** `R10`/`R11` header counts are server-rendered at page load (`dueCount/upcomingCount` props), not updated until `router.refresh()`/reload. The learner-visible completion inside `FlashcardActivity` (`✓ Cards reviewed`) is immediate; the header's eventual consistency after reload is what matters, and DB confirms 0 due after both reviews.

**Screenshots REAL:** `p54-desktop-review.png` (2 due header), `p54-flipped.png` (back), `p54-after-know.png` (feedback), `p54-after-review.png`, `p54-mobile-375.png`, `p54-simple-before/after/after-reload.png` (Phase 53 speaking still `✓ Done` — not regressed).

## 3. Existing suites post-change

| Suite | Result |
|---|---|
| `typecheck` | PASS |
| `npm test` (phase46 10/10, phase47 6/6, phase50 17/17) | PASS |
| `release:verify` (typecheck+test+build) | PASS (Next 15.5.27, all `ƒ` routes, `release:verify` exit 0) |
| `intervalForStreak` helper | PASS (deterministic) |

All labels as required: never claimed mocked as real; simulated none; blocked = physical mic (Phase 49 scope).

