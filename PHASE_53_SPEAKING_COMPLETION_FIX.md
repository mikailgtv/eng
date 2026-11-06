# Phase 53 — Speaking Completion Semantics & Progress Restoration

**Status:** Fixed — self-reported speaking now restores as `COMPLETED` (progress-only) after reload, without fabricating correctness, score, or AI feedback.

## 1. Product semantics inspected before editing

**Reports read:** `PHASE_51_FINAL_REPORT.md` (adjacent defect: `src/lib/practice.ts:228` maps `isCorrect=null → NOT_ATTEMPTED`), `PHASE_52_FINAL_REPORT.md` (passed, assessment fixes preserved).

**Code inspected:**

- `prisma/schema.prisma:594-608` — `ActivityAttempt.isCorrect Boolean?` comment `null for self-assessed activities (speaking, flashcards)`, `score Int?` null when unscored, append-only history.
- `src/lib/practice.ts:184-248` — `ActivityState` was `NOT_ATTEMPTED|CORRECT|INCORRECT`; `getPracticeState` line 228 mapped `null → NOT_ATTEMPTED`; `answered` and `scored` were same filter (`status !== NOT_ATTEMPTED`); `scorePercent = correct/totalActivities`; `checkLessonCompletion` counts `distinct activityId` with any attempt (null included — already correct for progress).
- `src/lib/activities/check.ts:211-223` — `SPEAKING_PROMPT` `checkAnswer` returns `isCorrect:null, correctText:null, explanation:"Nice practice! Pronunciation feedback arrives in a later phase.", scoreRatio:null, validated:{selfReported:true}` — never claims correctness.
- `src/lib/activities/registry.ts` — `isScoredType` returns false for `SPEAKING_PROMPT`/`FLASHCARD`.
- `src/components/practice/speaking-activity.tsx` — `alreadyPracticed` prop controls `✓ Practiced` vs `I practiced this` button; `done` local state; no score display.
- `src/components/practice/activity-runner.tsx:34-52` — `RunnerActivityState` same 3-value type; `submitAnswer` mapped `null → CORRECT` (incorrect — counted speaking as correct); `locked = status===CORRECT` only; `summary.scorePercent` used `scorable` (self-assessed excluded) — correct.
- `src/components/learn/lesson-practice.tsx` — `initialState` type same 3 values; hydrates from `getPracticeState`.
- `src/lib/practice.ts:496-525` — `getPracticeStats` filters `isCorrect !== null` for scored/accuracy; `getRecentPractice` filters `isCorrect not null` — both already exclude null, so speaking never contributed to accuracy.
- `package.json` scripts: `typecheck`, `test` (phase46/47/50), `release:verify` — verified.
- No git repo; hashes recorded before edits.

**Current behavior confirmed (not assumed from Phase 51):**

| `isCorrect` | Meaning | Previous mapping | Effect after reload |
|---|---|---|---|
| `true` | Auto-graded correct | `CORRECT` | ✓ Done, counted toward `correct` and `score` |
| `false` | Auto-graded incorrect | `INCORRECT` | Shown in mistakes, not `correct` |
| `null` | Self-assessed (speaking/flashcard) | `NOT_ATTEMPTED` **← bug** | Lost Done indicator, re-prompted, `answered` not incremented, `scorePercent` null logic wrong for mixed lessons |

Lesson inspected for browser truth: `Simple Questions` (`cmujqdeit005mkpua6mn96f1u`) — 6 activities: 4 required scorable (MATCHING, MULTIPLE_CHOICE, FILL_BLANK, WORD_ORDER) + 1 optional scorable (LISTEN_AND_TYPE) + 1 optional self-assessed (SPEAKING_PROMPT `What is your name? My name is …`). This matches the evidence in Phase 51.

## 2. Product decision (explicit)

**Default rule applied (no contradicting documented requirement found):**

> A self-reported speaking activity counts as completed for progress tracking, but it does not count as correct, incorrect, or scored.

Consequences enforced in code and report:

- `isCorrect=null` is the persisted marker for this distinction — it never fabricates `isCorrect:true`, `score`, `correctText`, pronunciation score, or AI evaluation.
- After reload, a `null` attempt restores a `COMPLETED` indicator (`✓ Done` badge + `✓ Practiced` message), not `CORRECT`.
- The learner is not asked to self-report again when a valid completion already exists (`locked` includes `COMPLETED`).
- Lesson progress summaries: `answered` includes `COMPLETED`; `correct`, `scoredAttempts`, `accuracyPercent`, `scorePercent` exclude `COMPLETED`.
- `checkLessonCompletion` already counts distinct `activityId` with any attempt — so a required speaking activity does count toward lesson completion (if marked required). Our fixture has speaking optional, so required gate is unchanged — preserved.
- Automatically graded activities retain existing scoring semantics.

Documented in code: `src/lib/practice.ts` header comment on `ActivityState`, and inline comment on `scored` filter; `activity-runner.tsx` comment `// self-reported progress only — not scored`.

**Data model limitation considered:** `ActivityAttempt` already represents the required state safely (`isCorrect=null` + `score=null` + `answer={selfReported:true}`). No migration needed — we use the existing row rather than new storage. If a future requirement needs to distinguish `COMPLETED` from “viewed” for speaking, a `progressState` enum would be cleaner, but not required now — explained here.

## 3. Root cause

Server: `getPracticeState` treated `null` as `NOT_ATTEMPTED` (line 228), so `answered` (scored.length) excluded self-reported, `allAnswered` false, `correct` unaffected but progress lost.

Client: `activity-runner.tsx` optimistically set `null → CORRECT` (line 48), so immediately after click it *did* show `✓ Done` and counted toward `correct`/`scorePercent` incorrectly, but after `router.refresh()` + reload the server state overwrote it to `NOT_ATTEMPTED` — causing the reported “lose indicator, can re-prompt, summary ignores row”.

Both layers disagreed on the semantics of `null`.

## 4. Minimal fix (existing architecture, no migration, no new dependency)

**Edited 3 files (2 logic + 1 type):**

| File | Change | Why |
|---|---|---|
| `src/lib/practice.ts` | `ActivityState.status` adds `COMPLETED`; map `null → COMPLETED`; split `answered = status !== NOT_ATTEMPTED` (includes COMPLETED) / `scored = CORRECT or INCORRECT` (excludes COMPLETED); `scorePercent = scored.length===0 ? null : correct/totalActivities`; `allAnswered = answered===total` | Restores progress without inflating correctness |
| `src/components/practice/activity-runner.tsx` | `RunnerActivityState` adds `COMPLETED`; `submitAnswer` `null → COMPLETED`; `submitFlashcards` `CORRECT → COMPLETED`; `locked = CORRECT or COMPLETED`; `summary` already correct via `scorable` split | UI distinguishes completion from correctness; prevents re-prompt |
| `src/components/learn/lesson-practice.tsx` | `initialState` type adds `COMPLETED` | Type consistency for hydration |

Total diff: ~12 lines added / 6 removed. No `prisma/schema.prisma` change, no lockfile change, Phase 52 assessment fixes untouched (verified: `src/app/(app)/teacher/results/[attemptId]/page.tsx` still has `ApiError` → `notFound()` for 404, `src/components/assessment/exam-runner.tsx` still `min-h-11`).

**What we did NOT do (per constraints):** No fake transcripts/recordings/pronunciation scores/AI feedback; no assessment scoring change; no flashcard scoring change beyond the same COMPLETED semantics (flashcards were also `CORRECT` before — now `COMPLETED`); no speaking-completion migration; no new dependency.

## 5. Before / after behavior (measured)

| Scenario | Before | After | Evidence |
|---|---|---|---|
| No record | `NOT_ATTEMPTED`, `answered=0`, `Done=false` | Same (unchanged) | Unit test 1 PASS |
| Self-report persisted `isCorrect=null` → reload | `NOT_ATTEMPTED`, `answered=0`, button reappears | `COMPLETED`, `answered=1`, `✓ Done` + `✓ Practiced`, no button | Unit test 2 PASS + Browser B8 REAL (`done=true practiced=true btn=0` after reload) |
| Counts as correct? | Client incorrectly `CORRECT`, `correct=1` | `correct=0` | Unit test 3 PASS, API `correct=0` REAL |
| Affects score/accuracy? | `scorePercent` null (since speaking excluded via NOT_ATTEMPTED, but client inflated) | `scorePercent=null`, `scoredAttempts=0`, `accuracy=null` (unchanged) | Unit test 4 PASS, API `scorePercent=null` REAL |
| Re-prompt? | Button shown again after reload | `locked=true` (COMPLETED), button hidden | Unit test 5 PASS, Browser B8 `btn=0` REAL |
| Auto-graded correct/incorrect | Works (but code used `NOT_ATTEMPTED` filter for scored) | Still `CORRECT`/`INCORRECT`, `correct` increments, `scorePercent` reflects only scorable | Unit test 6 PASS |
| Mixed lesson summary (6 activities) | `answered=0-1` (speaking missing), `correct` inflated if speaking counted as CORRECT | `answered=2` (1 COMPLETED + 1 CORRECT), `correct=1`, `scorePercent=17%` (1/6) | Unit test 7 PASS |
| Duplicate clicks | Append-only → 2 rows but distinct progress stays 1 | Same append-only behavior preserved (distinct check); distinct stays 1 | Unit test 8 PASS (2 rows added, distinct 1) |

DB row for speaking: `answer={"selfReported":true}, isCorrect=null, score=null` — unchanged, truthful.

## 6. Preservation of existing behavior

- Auto-graded types: `isCorrect:true/false`, `scoreRatio→score`, `attemptNumber` increment — unchanged (submitAttempt logic untouched except downstream mapping).
- `getPracticeStats` / vocabulary review / mistakes / lesson locks — no change; verified via `npm test`.
- Phase 52 fixes: `teacher/results/[attemptId]` 404 handling and `exam-runner` 44px target — verified still present (grep check in release gate).

