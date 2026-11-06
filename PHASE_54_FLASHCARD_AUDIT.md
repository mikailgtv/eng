# Phase 54 — Flashcard Audit

**Date:** 2026-10-26 — inspected before any edit.

## 1. Inventory: what already works

| Capability | Evidence | Status |
|---|---|---|
| **Flashcard content model** | `prisma/schema.prisma:547` `Activity.type=FLASHCARD`, `configuration={items:[{word,translation,phonetic,example,vocabularyId}]}` validated by `src/lib/activities/schemas.ts:134 flashcardConfig` (1–20 items). DB has 3 published flashcard activities, e.g. “Flashcards: name, my, your” with 3 linked `vocabularyId`. | ✅ Exists |
| **Vocabulary source** | `Vocabulary` model 118 rows, `ActivityVocabulary` join table, `VocabularyReview` per-student scheduling table (`studentId+vocabularyId` unique, `correctCount, incorrectCount, lastReviewedAt, dueAt, status`). | ✅ Exists |
| **Front/back UI** | `src/components/practice/flashcard-activity.tsx` (147 lines) — front shows `word` + `phonetic` + “Tap to flip”, back shows `translation` + `example`; flip is a `<button>` with `aria-pressed`, `aria-label`, `focus-visible` ring. | ✅ Exists |
| **Learner actions** | Two `Button min-h-12` (48px): `Review again` (`NEED_REVIEW`) and `I know it` (`KNOWN`) with `loading` + `disabled` state. Only explicit action updates schedule. | ✅ Exists |
| **Persistence** | `src/lib/practice.ts:recordVocabularyResponse` writes `VocabularyReview` (create or update) keyed to session user; `src/app/api/vocabulary/review` route checks assignment and enforces `viewer` scope; attempts also logged via `ActivityAttempt` (`isCorrect=null` for flashcards, not scored). | ✅ Exists, isolated per learner |
| **Review entry point** | `/student/review` (`src/app/(app)/student/review/page.tsx`) — `getDueVocabulary` → `ReviewSession`; `/student/progress` shows `vocab due ready` + learning/review/mastered counts. | ✅ Exists |
| **Due queue logic** | `getDueVocabulary: where studentId, status ≠ MASTERED, dueAt ≤ now, order dueAt asc, take 20` — deterministic, UTC. | ✅ Exists but intervals wrong |
| **Empty/success states** | `ReviewSession` empty: “Nothing to review right now.” + Go to My Learning + Check again; session done: “✓ Cards reviewed — X known · Y for review” with note about review schedule. | ✅ Exists, missing next-due feedback |
| **Progress semantics** | `getPracticeStats` filters `isCorrect !== null` so flashcards (`null`) don’t inflate accuracy; `getPracticeState` maps `null → COMPLETED` (Phase 53) progress-only, not correctness. Lesson completion counts distinct `activityId` with any attempt. | ✅ Correct (Phase 53 preserved) |
| **Mobile & a11y** | Buttons `min-h-12`, card `min-h-44`, `focus-visible:ring`, `aria-live` for progress, responsive grid. | ✅ Meets baseline, needs verification at 375 |

## 2. What is genuinely missing (vs. Phase 54 requirements)

| Requirement | Gap | Risk if not fixed |
|---|---|---|
| **Deterministic 1,3,7,14,30 interval sequence** | Current `REVIEW_INTERVAL_DAYS = {KNOWN:3, NEED_REVIEW:1, MASTERED:7}` with `KNOWN_MARKS_TO_MASTER=3` — fixed 3-day for any KNOWN, 1-day for NEED_REVIEW, 7-day for mastered. No streak, no 14/30. `correctCount` is total not consecutive, never resets on NEED_REVIEW. | Cards not spaced as specified; mastery threshold arbitrary. |
| **Reset on “Review again”** | `correctCount` never reset, `incorrectCount` just increments — streak not cleared. | Subsequent KNOWN will jump to MASTERED incorrectly. |
| **Master exclusion** | `getDueVocabulary` excludes `MASTERED` — after 3 KNOWN a card never appears again, violating 30-day schedule for mastered. | Due queue incomplete. |
| **Feedback with next due** | `FlashcardActivity` session done only shows counts, not per-card next due; `ReviewSession` footer says “scheduled to come back tomorrow” for all NEED_REVIEW, ignoring actual interval. | Learner not told when next review is due. |
| **Due vs future distinction** | `/student/review` only shows due count in header; progress page shows touched totals but not “scheduled for future” vs “due now”. No upcoming count. | Required feature missing. |
| **Keyboard/loading/empty/error** | Loading state per card exists (`busy`), empty exists, error `role=alert` exists; need to verify keyboard flip via Enter/Space (native button ok) and ensure no card auto-advances without explicit action. | Need explicit verification, not assumed. |

No new table required — `VocabularyReview` already stores `correctCount` (reused as **consecutive streak**), `lastReviewedAt`, `dueAt`; adding interpretation is sufficient. Existing flashcard content (via `vocabularyId` link) provides enough history; we do not invent learner history.

## 3. Existing UI conventions & test commands verified

- UI: `Button` variants (`secondary`, ghost), `Card`/`EmptyState`, `rounded-xl border border-border bg-surface shadow-card`, `text-[13px] text-muted`, `focus-visible` patterns — will preserve.
- Tests: `npm run typecheck`, `npm test` (phase46/47/50), `npm run release:verify` — all green before edit (typecheck exit 0, test 10+6+17 passed, release build 15.5.27).
- Hashes before edit: `prisma/dev.db e9b4eac1…f7fb02` `package-lock.json 035df9a3…a76b48`.

## 4. Decision for implementation

Reuse `VocabularyReview` with new deterministic algorithm, document timezone behavior (UTC, `dueAt` stored as absolute timestamp, `due <= now` via `new Date()` server UTC), add per-card next-due feedback, add upcoming count, keep append-only safety, keep lesson `COMPLETED` semantics.

