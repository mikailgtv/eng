# Phase 57 Audit — Learner Progress Dashboard, Daily Goals & Real Performance Analytics

**Date:** 2026-10-26 (Asia/Tehran)  
**Baseline:** Phase 56 PASS (DB `e9b4eac119cc44941d7cdea88c1429945fce40dd1ee7c548759bcfbc68f7fb02`, lock `035df9a385770ec2fa4494ccb531b507a0cef01e3710d5babd20bc5b66a76b48`, build 15.9s, speaking honest STT/TYPED)  
**New DB:** `68a00e5137b951098fe250d86b7203fa140035063d427f33a4a16987ef302813` (after justified migration `20261026000000_phase57_daily_goals` = `9c9ea7c1…` + runtime `lastLoginAt` updates)  
**Lock preserved:** `035df9a385770ec2fa4494ccb531b507a0cef01e3710d5babd20bc5b66a76b48` (no new deps)

---

## 1. Baseline Inspection (before edit)

### Reports read
- `PHASE_56_FINAL_REPORT.md` (10 sections, PASS, honest browser SpeechRecognition with 10s timeout, transcript distinction, COMPLETED isCorrect=null)
- `PHASE_56_SPEAKING_FLOW_AUDIT.md` (7 sections, no fake scores, privacy no audio upload)
- `PHASE_56_SPEECH_RECOGNITION_TESTS.md` (15/15)

### Existing progress stack inspected
| Path | Content |
|---|---|
| `src/app/(app)/student/progress/page.tsx` | 27-line server page: `requirePageUser(STUDENT,ADMIN)` → `Promise.all(getLearningSummary, getPracticeStats, getVocabularyReviewCounts)` → `<StudentProgress>` |
| `src/app/(app)/student/page.tsx` | Student dashboard: `getLearningSummary + getPracticeStats + countDueVocabulary + listMyAttemptHistory + listStudentAssessments` → `StudentDashboard` (515 lines) |
| `src/components/dashboard/student-dashboard.tsx` | Overall progress conic-gradient, continueLearning, Practice Today (attempts + accuracy), Vocab Review (dueWords), Recent practice (activity_attempt), Exams & quizzes, Upcoming classes empty |
| `src/components/progress/student-progress.tsx` | Level summary ProgressBar, Practice stats (6 tiles), Vocabulary (learning/review/mastered/due), per-course modules, Recently completed |
| `src/lib/learning.ts` | `getAssignedCourseOverviews` (level-access + prerequisites), `computeStreakDays` (UTC dayKey), `getLearningSummary` → `{courses, activeCourse, continueLearning, recent, totals:{totalLessons, completedLessons, startedLessons, percent}, streakDays}` |
| `src/lib/practice.ts` | `getPracticeStats` (attempts, scored, correct, accuracy, distinctActivities, listening, grammar, vocab), `getRecentPractice`, `REVIEW_INTERVALS_DAYS=[1,3,7,14,30]`, `recordVocabularyResponse` etc. |
| `src/app/api/practice/stats/route.ts` | GET own stats (auth via `requireApiUser`) |
| `prisma/schema.prisma` | `LessonProgress` (status COMPLETED, completedAt, timeSpentSec), `ActivityAttempt` (isCorrect null for speaking), `VocabularyReview` (dueAt, lastReviewedAt), `AssessmentAttempt` (percentage/passed), `StudentLearningPreference` (dailyMinutes 10), `StudentLearningProfile` (dailyGoalMinutes 10) |

### Authoritative sources identified
- **Lesson completion:** `lesson_progress` where `status='COMPLETED'` and `completedAt` set (unique per student+lesson). No second progress system.
- **Overall %:** `completedLessons / totalLessons *100` where total = published lessons in all courses assigned to student's group (via `CourseAssignment` + level-access).
- **Assessment scores:** `assessment_attempt` where `studentId=me`, `status != IN_PROGRESS`, `percentage`/`passed` server-graded, `resultsVisible = assessment.showResults`. Never averaged across attempts.
- **Vocab due/review:** `vocabulary_review` where `dueAt <= now` (server UTC), `status` LEARNING/REVIEW/MASTERED, intervals 1/3/7/14/30.
- **Speaking completion:** `activity_attempt` where `activity.type='SPEAKING_PROMPT'` and `isCorrect=null`, `status COMPLETED` (self-reported). Distinguished from assessed (`isCorrect` not null). Never shown as grade.
- **Daily activity timestamps:** `lesson_progress.completedAt`, `vocabulary_review.lastReviewedAt`, `activity_attempt.submittedAt` (all server UTC).

### Suites before edit
- `npm run typecheck` PASS (5.5s, after fixing legacy `scripts/test-phase56-speaking.ts` import)
- `test-phase56-speaking` 15/15, `test-phase50-audio` 17/17, `test-phase53-speaking-completion` 9/9, `test-phase54/55` 13/13+16/16 — all PASS
- `npm run build` low-resource 15.9s PASS (Phase 56), now **PASS 17.8s** after reinstall (prisma generate + next build, warnings only) — previous SIGKILL was env/resource, now resolved.

### Reused services / no second system
- Reused `getLearningSummary`, `getPracticeStats`, `getVocabularyReviewCounts`, `listMyAttemptHistory`, `requirePageUser`, `requireApiUser`.
- No new progress table; only extended `StudentLearningPreference` (smallest justified change) for goal persistence.

---

## 2. Design Decisions & Data Sources

### Metrics only from persisted data (with clear definitions)
| Metric | Definition | Source | What is NOT shown |
|---|---|---|---|
| Lessons completed | Count of `lesson_progress` rows with `status=COMPLETED` for assigned courses | `student_lesson_progress.completedAt` | No invented remaining if no course |
| Remaining | `totalLessons - completedLessons` | Same as above | — |
| Overall % | `Math.round(completed/total*100)` | Same | No NaN when total=0 → 0 |
| Assessment attempts | Each `assessment_attempt` row, `percentage`/`passed` when `showResults=true`, else "Submitted" | `assessment_attempt` + `assessment.showResults` | No averaging, no combined score |
| Vocab reviewed | `vocabulary_review` counts by `status`, `due = dueAt <= now` | `vocabulary_review` | No minutes |
| Due now | `countDueVocabulary()` | Same | — |
| Daily activity (7 days) | Per UTC day counts of `completedAt`, `lastReviewedAt`, `submittedAt` | Real timestamps | No page-open minutes |
| Speaking completed | `activity_attempt.isCorrect=null` (SPEAKING_PROMPT) | `activity_attempt` | Never % or grade |

### Omitted undocumentable metrics (with limitation note)
- **Study minutes from page-open duration:** Not reported. App only has best-effort `timeSpentSec` on lesson completion (clamped 0-7200), not defensible for every page. UI explicitly states: "Study minutes from page-open time are not reported; only completed lessons, review actions and submitted practice are counted."

### Daily goals rules
- **Types:** `LESSONS` (1,2,3), `REVIEW_CARDS` (5,10,15,20), `ACTIVITIES` (3,5,10) — only units with honest data. Minutes deliberately excluded (would need defensible active timer).
- **Storage:** `student_learning_preferences.dailyGoalType` (default LESSONS), `dailyGoalValue` (default 1), `dailyGoalEnabled` (default true). Existing `dailyMinutes` retained for backwards compat. Smallest justified schema change; migration `20261026000000_phase57_daily_goals` tested on disposable `/tmp/p57_test.db` before applying to `prisma/dev.db`.
- **Progress calc:** For goal type, count events where timestamp in `[UTC 00:00, 23:59:59.999]` of today. Lessons = `lesson_progress.completedAt` in day. Reviews = `vocabulary_review.lastReviewedAt` in day (distinct vocabularyId, natural dedupe). Activities = `activity_attempt.submittedAt` in day, deduped if same `activityId` within 60s (retry guard).
- **Timezone:** All boundaries UTC midnight via `Date.UTC(y,m,d)`, `dayKey = start.toISOString().slice(0,10)`. Documented in UI: "Day boundaries are UTC midnight."
- **Disable without deleting:** `dailyGoalEnabled=false` keeps all history rows untouched; UI shows "Paused — history saved."
- **Default:** New learners get LESSONS 1 enabled (sensible, achievable).
- **Duplicate prevention:** Lessons unique constraint prevents double count. Vocab distinct `vocabularyId` per day. Activities 60s dedupe window.

### Authorization & integrity
- Learner only own data: all queries `where: {studentId: viewer.id}`; API uses `requireApiUser` + `viewer.id`, never trusts client `studentId`.
- Teacher not gain private data: `requirePageUser` + `getLearningSummary` scoped to student's own group assignments; no cross-tenant read.
- Server authoritative: calculations in `src/lib/daily-goals.ts` server-side only; client never sends totals.
- No duplicate inflation: as above.
- No modifying historical scores/reviews: `setDailyGoal` only upserts preference, never touches `lesson_progress`/`activity_attempt`/`vocabulary_review`.
- Preserve COMPLETED semantics: `isCorrect=null` never treated as correct; progress page explicitly states "isCorrect = null, not a grade."

### UX / a11y
- Existing visual language: `Card` rounded-2xl, `Button` min-h-11, focus-visible ring, muted text, tabular-nums.
- Info near top: Daily Goal → Daily Activity → Overall progress.
- Chart: simple bar per day, stacked not decorative, with `sr-only` text alternative + per-day list (`date · label: X lessons Y reviews Z activities (N speaking not graded)`).
- Focus 44px targets: all buttons `min-h-11`, links `min-h-11`.
- No overflow at 375px: `overflow-x-auto` + `min-w-[360px]` + `flex-wrap` prevents clipped labels.
- Links: Continue learning `/student/learning`, Review `/student/review`, Exams `/student/exams`, Speaking `/student/speaking`, lesson links `/student/learn/{id}`.
- Zero activity not error: "No activity yet — finish a lesson..." with normal styling.
- Existing chart libs only: no new deps (lock preserved).

---

## 3. Files Changed (Phase 57)

| File | Change |
|---|---|
| `prisma/schema.prisma` | Added to `StudentLearningPreference`: `dailyGoalType String @default("LESSONS")`, `dailyGoalValue Int @default(1)`, `dailyGoalEnabled Boolean @default(true)` |
| `prisma/migrations/20261026000000_phase57_daily_goals/migration.sql` | 3× ALTER TABLE ADD COLUMN with defaults |
| `src/lib/daily-goals.ts` | New — `DailY_GOAL_TYPES`, `utcDayBounds`, `getDailyGoal/setDailyGoal`, `getDailyProgress` (dedupe), `getDailyActivityHistory` (7 days), `getSpeakingStats`, `getProgressSummary` |
| `src/app/api/student/daily-goal/route.ts` | New — GET (goal+progress+history+speaking), PATCH/POST (validate z.enum, 1-50, boolean, `assertSameOrigin`, `requireApiUser`) |
| `src/components/progress/daily-goal-card.tsx` | New client — shows target/completed/remaining/percent, progress bar aria-valuenow, Change goal (type/value/enabled) with 44px, focus states, "Paused keeps history" |
| `src/components/progress/daily-activity-chart.tsx` | New — 7-day bars, utc note, dedupe note, text alternative, per-day list with speaking distinction |
| `src/components/progress/student-progress.tsx` | Major update — integrates daily goal+chart, lessons definition, practice 6 tiles with hints, speaking section (isCorrect null, not graded), vocab with dueAt definition, assessments (real percentage/passed, hidden → Submitted), limitation note, per-module, recent with links |
| `src/app/(app)/student/progress/page.tsx` | Extended — fetches `getLearningSummary + getPracticeStats + getVocabularyReviewCounts + getDailyGoal + getDailyProgress + getDailyActivityHistory + getSpeakingStats + listMyAttemptHistory` |
| `scripts/test-phase57-progress.ts` | New 14-test suite (13 required + integrity) disposable DB |
| `scripts/test-phase56-speaking.ts` | Fix import `../scripts/test-phase50-audio.ts` → remove `.ts` for typecheck |
| `scripts/p57-browser.mjs` | New browser test (desktop 1280, mobile 375, API persistence, isolation) |
| `evidence/p57/*` | Desktop + mobile screenshots, `p57-browser.json` (see Limitations) |

**Not changed:** `package.json`/`package-lock.json` (no deps), `StudentLearningProfile.dailyGoalMinutes` (retained), Phase 50/52/53/55/56 logic.

---

## 4. Limitations & Honest Notes

- **Build:** `npm run build` now **PASS** (17.8s, prisma generate + next build, warnings only, SIGKILL resolved after reinstall); `npm run typecheck` PASS (5.5s), `prisma generate` PASS.
- **Live browser:** Dev server unstable under 1024M (exits after compiling "/" with no error, likely resource). Static checks for 44px, overflow, a11y pass; live interactions via API tested (GET/PATCH daily-goal, login isolation). Real activity counts verified via unit tests against disposable DB. No invented audio/media.
- **Minutes:** Deliberately omitted; UI explains why. If teacher needs minutes, must be requested — not invented.
