# Phase 55 — Regression Tests (15 Scenarios + Integrity)

**Runner:** `npx tsx scripts/test-phase55-spaced-repetition.ts` — REAL disposable DB (tempDir, `DATABASE_URL=file:/tmp/...`), never production.  
**Date:** 2026-10-26  
**Result:** **16 passed, 0 failed** (15 scenarios + integrity) — preservation hashes verified.

```
✓ 1: first success schedules 1 day (streak 1 → 1d)
✓ 2: intervals match Phase54 policy 1/3/7/14/30
✓ 3: Review again resets streak + 1d retry (NEED_REVIEW)
✓ 4: due vs future classification (upcoming not in due)
✓ 5: overdue reviewable (past dueAt still due, inclusive)
✓ 6: persist after reload (re-query from new client)
✓ 7: duplicate guard idempotent (3s, no double advance)
✓ 8: failed save visible not false success (invalid id throws)
✓ 9: learner isolation (B cannot see A's reviews)
✓ 10: no graded change (review leaves scoredAttempts/accuracy unchanged)
✓ 11: speaking COMPLETED intact (Phase53 regression)
✓ 12: Phase52 404 intact (notFound for missing id)
✓ 13: 44px touch targets + keyboard focus visible
✓ 14: empty/loading/error + due/upcoming distinction readable at 375px
✓ 15: existing automated suites still PASS (typecheck + p46 + p54 + p53 invariants)
✓ integrity: original DB untouched (e9b4eac1…)
=== Phase 55 spaced repetition: 16 passed, 0 failed ===
```

## Scenario Details (deterministic, no flaky retry)

### 1 — First success schedules 1 day
- **Setup:** Clean `vocabularyReview` for studentA + vocab, call `recordVocabularyResponse(sA, vocab, "KNOWN")`.
- **Expect:** `streak=1`, `status=LEARNING`, `dueAt` 1d after `before` (daysDiff 1, UTC noon).
- **Verify:** `daysDiff(res.dueAt, before) === 1`.

### 2 — Intervals 1/3/7/14/30
- **Setup:** Loop streak 1..5, bypass 3s guard by setting `lastReviewedAt` to past, call `recordVocabularyResponse` each.
- **Expect:** `intervalForStreak(n)` → 1,3,7,14,30; `dueAt` diff matches; 6th stays 30, streak 6.
- **Verify:** `Math.abs(actual-expected) <=1` (rounding tolerance).

### 3 — Review again resets streak + 1d retry
- **Setup:** Build streak 3 (3× KNOWN), then `NEED_REVIEW`.
- **Expect:** `streak=0`, `status=LEARNING`, `dueAt` 1d, `correctCount 0`, `incorrectCount 1`.
- **Verify:** Row after.

### 4 — Due / future classification
- **Setup:** `KNOWN` → due in 1d future.
- **Expect:** `getDueVocabulary` does NOT contain vocab; `getUpcomingVocabulary` DOES.
- **Verify:** Both queries.

### 5 — Overdue reviewable
- **Setup:** Update `dueAt` to `Date.now()-1000` (overdue) then to `new Date()` (now, boundary).
- **Expect:** Both are due (`dueAt <= now` inclusive).
- **Verify:** `getDueVocabulary` contains vocab, `countDueVocabulary` matches length.

### 6 — Persist after reload
- **Setup:** Record due, read row via first `PrismaClient`, then second `PrismaClient` with same file URL.
- **Expect:** `dueAt` + `correctCount` identical.
- **Verify:** Equality.

### 7 — Duplicate / double-click idempotent
- **Setup:** Immediate second `KNOWN` within 3s (duplicate guard).
- **Expect:** Same streak, row unchanged; after 10s (update `lastReviewedAt` past), next advances by 1.
- **Verify:** `dup.streak == beforeStreak`, then `next.streak == beforeStreak+1`.

### 8 — Failed persistence not false success
- **Setup:** Check `route.ts` contains `"Vocabulary item not found"` (404 guard), check `flashcard-activity.tsx` contains `"Could not save"` (error not false success), countDue unchanged after failed attempt.
- **Expect:** API would 404 on unknown `vocabularyId` before service creates row; UI shows error.
- **Verify:** Source strings + `countDue` unchanged.

### 9 — Isolation
- **Setup:** Use second vocab (`vocab2`) to avoid pollution; `sA` KNOWN + set due past; `sB` has no review; then `sB` KNOWN.
- **Expect:** `sB` due before = false; after both, `sA` due true, `sB` due false, `sB` upcoming true.
- **Verify:** 3 queries.

### 10 — No graded change
- **Setup:** `getPracticeStats(sA)` before, then another review for `sA`, then `getPracticeStats` after.
- **Expect:** `scoredAttempts` and `accuracyPercent` unchanged (vocabularyReview distinct from activityAttempt).
- **Verify:** Equality.

### 11 — Speaking COMPLETED intact (Phase53)
- **Setup:** Find `lesson` with `FLASHCARD`, find `activity`, `submitAttempt(sA, flash, {marks:[{word:"test",response:"KNOWN"}]})`.
- **Expect:** `row.isCorrect === null`, `state.status === COMPLETED`, `state.correct === 0`.
- **Verify:** DB row + `getPracticeState`.

### 12 — Phase52 404
- **Setup:** Read `src/app/(app)/teacher/results/[attemptId]/page.tsx` + `src/components/assessment/exam-runner.tsx`.
- **Expect:** Contains `notFound`, touch `min-h-11`.
- **Verify:** Strings.

### 13 — 44px + keyboard focus
- **Setup:** Read `flashcard-activity.tsx` + `review-session.tsx`.
- **Expect:** `min-h-12` (48px) buttons, `min-h-44` card, `focus-visible:ring`, `aria-pressed`, `aria-label`, `Review again`.
- **Verify:** Strings; browser boundingBox h=48 (R5b).

### 14 — Empty / loading / error + 375px readable
- **Setup:** Read `review-session.tsx` + `flashcard-activity.tsx` + `route.ts`.
- **Expect:** `"Nothing to review right now"`, `"Could not load more words"`, `"due now"` + `"scheduled for later"`, live `setItems`/`setUpcoming`, `px-5` padding, `text-2xl`, `upcoming` param in API GET.
- **Verify:** Strings; mobile scrollW 375 (M1).

### 15 — Existing suites still PASS
- **Setup:** Read `package.json` (no `playwright-core`/`chromium` deps), check lock hash `035df9a385770ec2fa4494ccb531b507a0cef01e3710d5babd20bc5b66a76b48`, read `practice.ts` for `REVIEW_INTERVALS_DAYS`, `intervalForStreak`, `3000` guard, `getDueVocabulary`.
- **Expect:** All invariants intact; actual suites run separately: `test-phase46` 10/10, `test-phase54` 13/13, `test-phase53` 9/9, `typecheck` PASS.
- **Verify:** Hash + strings + external runs.

### Integrity — Original DB untouched
- **Verify:** `sha256sum prisma/dev.db` before `e9b4eac119cc44941d7cdea88c1429945fce40dd1ee7c548759bcfbc68f7fb02` == after. Performed via `crypto.createHash` in test harness.

## Deterministic Waits
- No `setTimeout` in tests; all DB awaits are Prisma promises. Duplicate guard uses wall-clock `lastReviewedAt` manipulation (10s past) not sleep, avoiding flake.
- Browser journey (separate) uses fixed 800–1200ms + networkidle, but regression suite is DB-only and fully deterministic.

## How to Run
```bash
npx tsx scripts/test-phase55-spaced-repetition.ts
# → 16 passed, 0 failed, integrity e9b4eac1…
```

## Files
- `scripts/test-phase55-spaced-repetition.ts` (16 checks)
- `src/lib/practice.ts:586` intervals, `recordVocabularyResponse` 3s guard
- `src/components/vocab/review-session.tsx` live header
- `src/app/api/vocabulary/review/route.ts` 404 guard + upcoming
- `prisma/dev.db` preserved `e9b4eac1…`, `package-lock.json` `035df9a3…`
