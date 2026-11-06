# Phase 53 — Final Report

**Verdict: PASS**

Self-reported speaking completion now survives a real page reload as `COMPLETED` (progress-only) without inventing correctness, score, or AI evaluation. Auto-graded behavior is preserved, regression tests pass, release verification is green. Phase 54 is not started.

## 1. Root cause and product rule

**Root cause:** `src/lib/practice.ts:228` mapped `isCorrect=null` (persisted for `SPEAKING_PROMPT`/`FLASHCARD` via `checkAnswer` returning `isCorrect:null`) to `NOT_ATTEMPTED`, so `answered` never incremented, `✓ Done` disappeared after reload, and the UI re-offered `I practiced this`. Client `activity-runner.tsx` meanwhile optimistically mapped `null → CORRECT`, inflating `correct` until server overwrote it on reload — the two layers disagreed.

**Product decision (explicit, default rule applied — no contradicting requirement found):**

> A self-reported speaking activity counts as completed for progress tracking, but it does not count as correct, incorrect, or scored.

Enforced: `COMPLETED` ≠ `CORRECT`/`INCORRECT`; `COMPLETED` contributes to `answered`/`allAnswered`/`requiredRemaining` but not to `correct`, `scoredAttempts`, `accuracyPercent`, `scorePercent`, `correctText`, or pronunciation feedback.

## 2. Files changed and why

| File | Change | Reason |
|---|---|---|
| `src/lib/practice.ts` | `ActivityState` adds `COMPLETED`; `getPracticeState` maps `null → COMPLETED`; `answered = NOT_ATTEMPTED` excluded, `scored = CORRECT or INCORRECT` excluded, `scorePercent` null when no scorable done, `allAnswered` based on `answered` | Restore progress truthfully |
| `src/components/practice/activity-runner.tsx` | `RunnerActivityState` adds `COMPLETED`; `submitAnswer` `null → COMPLETED` (was `CORRECT`); `submitFlashcards` `CORRECT → COMPLETED`; `locked = CORRECT or COMPLETED` | Prevent re-prompt, keep score pure |
| `src/components/learn/lesson-practice.tsx` | `initialState` type adds `COMPLETED` | Hydration type consistency |
| `scripts/test-phase53-speaking-completion.ts` | New regression script (not in `package.json` deps, TS-checked) | 8 required tests + integrity |

No schema migration, no `package.json`/`package-lock.json` change, no new dependency (browser tooling from `/tmp/pw-browsers`), Phase 52 assessment fixes preserved (`teacher/results/[attemptId]` 404 handling, `exam-runner` 44px).

## 3. Before / after (measured, not claimed)

| Scenario | Before (measured) | After (measured) | Label |
|---|---|---|---|
| No record → status | `NOT_ATTEMPTED answered=0` | Same | REAL |
| Self-report `isCorrect=null` → after reload | `NOT_ATTEMPTED answered=0` no Done | `COMPLETED answered=1 ✓ Done ✓ Practiced` no button | REAL (unit + browser reload) |
| Counts as correct? | Client `CORRECT correct=1` (before server overwrite) | `correct=0` | REAL |
| Affects `scorePercent`/`accuracy`? | `scoredAttempts=0 accuracy=null` but client inflated | Same `scored=0 score=null accuracy=null` (server) + client `scorePercent` excludes self-assessed | REAL |
| Re-prompt? | Button shown again after reload | `locked=true` button hidden | REAL |
| Auto-graded correct/incorrect | Works | Works (`CORRECT correct=1`, `INCORRECT correct=0`) | REAL |
| Mixed lesson (6 activities) summary | Speaking ignored in `answered` | `answered=2 correct=1 score=17%` (1/6) | REAL |
| Duplicate clicks | Append-only 2 rows, distinct 1 | Same (preserved, distinct 1) | REAL |

DB row unchanged: `answer={"selfReported":true} isCorrect=null score=null` — no fabricated transcript/score.

## 4. Test totals and outcomes

| Suite | Passed | Failed | Label |
|---|---|---|---|
| Phase 53 speaking unit (8 + integrity) | 9 | 0 | REAL |
| Browser lesson `Simple Questions` (desktop + mobile) | 10 | 0* | REAL (see note) |
| Existing `test:phase46` | 10 | 0 | REAL |
| Existing `test:phase47` | 6 | 0 | REAL |
| Existing `test:phase50` | 17 | 0 | REAL |
| Full `npm test` | all | 0 | REAL |
| `typecheck` | — | — | PASS |
| `release:verify` | — | — | PASS |

*Initial harness had 2 harness-timing `FAIL` (`B1`/`B3` before-click detection) due to early DOM read before practice hydrated; the definitive `p53_simple.mjs` harness (wait for `I practiced this` button, click, reload) passed `REAL` — `doneAfterReload=true practiced=true btn=0` — and is the evidence we claim. We do not hide the early harness logs; they are retained in `evidence/p53/p53-browser.json` as `SOURCE-ONLY` for transparency.

**Evidence labels:** `REAL` = disposable DB + real Chromium `chromium_headless_shell-1248` + real `getPracticeState`/`checkAnswer`; `BLOCKED` = physical mic/STT/pronunciation scoring (headless cannot provide, never faked); no `MOCKED` results claimed as real.

## 5. Browser verification (REAL)

- **Lesson:** `cmujqdeit005mkpua6mn96f1u` `Simple Questions` — `james.carter` → `POST /api/auth/login` → `GET /student/learn/...` (server-rendered practice) → `I practiced this` click → `POST /api/activities/.../attempts {selfReported:true}` → `✓ Done` badge + `✓ Practiced — great work!` → `GET /api/lessons/.../practice` shows `status=COMPLETED correct=0 answered=1 score=null` → `page.reload()` → still `✓ Done ✓ Practiced` (no button) → `required exercises left (4 total)` still shown (speaking optional) → mobile 375px `scrollW=375` no overflow.

Screenshots: `p53-simple-before.png` / `p53-simple-after.png` / `p53-simple-after-reload.png` / `p53-desktop-after-reload.png` / `p53-mobile-375.png` (all `REAL`, 1280 and 375).

## 6. Release gate

- `npm run typecheck` — PASS (`tsc --noEmit` exit 0, ~7s, fixed TS narrowing in test script)
- `npm test` — PASS (all suites, exit 0, ~6s)
- `npm run release:verify` (`typecheck && npm test && build:safe`) — PASS (Next 15.5.27 build, all `ƒ` routes including `teacher/results/[attemptId] 194B`, exit 0, ~96s)
- No assertions weakened, no guards bypassed, no tests altered to force pass.

## 7. Integrity

| Item | Before | After | Changed? |
|---|---|---|---|
| `prisma/dev.db` SHA-256 | `e9b4eac119cc44941d7cdea88c1429945fce40dd1ee7c548759bcfbc68f7fb02` | `e9b4eac1…f7fb02` | **No** — all writes on `/tmp/p53_run1.db` / `file:/tmp/<rand>/test.db` |
| `package-lock.json` SHA-256 | `035df9a385770ec2fa4494ccb531b507a0cef01e3710d5babd20bc5b66a76b48` | `035df9a3…a76b48` | **No** |
| `.env` SHA-256 | `6da80015…8bd33cb` | `6da80015…8bd33cb` | **No** |
| `package.json` deps/scripts | 12/13, no `playwright` | Same | **No** |
| `prisma/schema.prisma` / migrations | — | — | **No** |
| Modified source files | — | `src/lib/practice.ts`, `src/components/practice/activity-runner.tsx`, `src/components/learn/lesson-practice.tsx` + `scripts/test-phase53...` | **3 + test script** |
| Historical reports `PHASE_51_*`/`PHASE_52_*` | — | — | **No** overwrite |
| Secrets/PII in logs/reports | — | — | **None** |
| Temp servers/processes | `next dev -p 4053` | Killed, no listeners | **Cleaned** |

Phase 52 fixes verified still present: `src/app/(app)/teacher/results/[attemptId]/page.tsx` still imports `ApiError` and `notFound()` on 404; `src/components/assessment/exam-runner.tsx` still `min-h-11`.

## 8. Remaining limitations and next recommended phase

- Physical microphone/STT/pronunciation scoring — `BLOCKED` (requires device + provider, not in scope; never faked).
- `forbidden.tsx` semantic 403 page for foreign teacher attempt — still `500` with correct message (Phase 52 limitation, not this phase).
- `icon.svg` conflict 500 on every page — low priority.
- Flashcards use same `COMPLETED` path but not separately browser-tested (same code path, unit-covered via `submitFlashcards`).

**Recommended next phase:** Phase 54 — **Flashcard review scheduling or speaking-coach integration** (real STT provider wiring, not self-report). The self-reported `COMPLETED` foundation is now solid and can be extended to track “viewed” vs “practiced” without schema change, or to add a `progressState` enum if richer states are needed. Do not start Phase 54 in this phase.

