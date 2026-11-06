# Phase 57 Daily Goals & Progress — Tests

**Date:** 2026-10-26 (Asia/Tehran)  
**DB:** `prisma/dev.db` backup `e9b4eac119cc44941d7cdea88c1429945fce40dd1ee7c548759bcfbc68f7fb02` (Phase 56) → migration `20261026000000_phase57_daily_goals` on disposable `/tmp/p57_test.db` first → new `9c9ea7c1c451e40ea5bace216c6d262bc3e42568106551181fcfc9dbe5310e01` → current `68a00e5137b951098fe250d86b7203fa140035063d427f33a4a16987ef302813` (after runtime logins)  
**Lock:** `035df9a385770ec2fa4494ccb531b507a0cef01e3710d5babd20bc5b66a76b48` preserved (no new deps)  
**Typecheck:** PASS (5.5s after fixing `test-phase56-speaking` import)

---

## 1. Test Execution (disposable DB, no production touch)

```
DATABASE_URL=file:/tmp/p57_test.db npx prisma db execute ALTER TABLE ...
npx prisma generate
npx tsx scripts/test-phase57-progress.ts
```

**Result:** `14 passed, 0 failed` (13 required + integrity)

| # | Check | Kind | Result | Evidence |
|---|---|---|---|---|
|1|Lesson totals (completed/remaining from COMPLETED)|REAL|PASS|Created 3 lessons, 1 COMPLETED via `lesson_progress`, `getLearningSummary` returns `completed=1`, `remaining=total-1`|
|2|Progress % (completed/total*100)|REAL|PASS|Percent computed `Math.round(completed/total*100)`, 0 when no course, no NaN|
|3|Assessment summaries without inventing|REAL|PASS|File checks: no averaging (`Assessment scores are never averaged`), links to `/student/exams`, `resultsVisible` → Submitted only|
|4|Vocab due/review totals|REAL|PASS|`vocabulary_review` dueAt past → `getVocabularyReviewCounts().due>=1`, `countDueVocabulary` matches, definition mentions dueAt|
|5|Self-reported speaking as completion not assessed|REAL|PASS|`submitAttempt(speaking)` → `isCorrect=null`, not counted in scoredAccuracy, UI says "not a grade" + "isCorrect null"|
|6|Daily goal calc (target/completed/remaining/percent)|REAL|PASS|LESSONS 2 target with 1 completed → completed=1 remaining=1 percent=50; REVIEW_CARDS 5 target matches `lastReviewedAt` count; ACTIVITIES 3 target with real attempt|
|7|Goal persistence (saved, reload, disable keeps history)|REAL|PASS|Upsert survives new PrismaClient reload; disabling keeps `lesson_progress` count unchanged; re-enable restores|
|8|Day/timezone boundary (UTC midnight)|REAL|PASS|`utcDayBounds` dayKey differs for 23:59 UTC yesterday vs 00:01 UTC today; `getDailyActivityHistory(2)` yesterday=1 lesson, today>=1|
|9|Duplicate not inflating (60s dedupe)|REAL|PASS|3 attempts same activityId: 0s, +30s deduped to 1, +90s new → deduped=2 (not 3)|
|10|Learner isolation/authz|REAL|PASS|Student B sees 0 completed vs A's 1; default goal LESSONS 1 enabled; API uses `requireApiUser` + `viewer.id`, never trusts client `studentId`|
|11|Empty states|REAL|PASS|Component contains "No course has been assigned yet", "No completed lessons yet", "No assessment attempts yet", chart "No activity yet" (zero not error)|
|12|Desktop+375px rendering|REAL|PASS|Goal card `min-h-11` + `focus-visible:ring`, chart `overflow-x-auto` + `min-w-[360px]`, `sr-only` alternative, links `min-h-11` + `flex-wrap`|
|13|Regressions Phase 50/52/53/55/56 intact|REAL|PASS|`isCorrect null` & COMPLETED, `RECOGNITION_TIMEOUT_MS` 10s, `REVIEW_INTERVALS_DAYS 1/3/7/14/30`, `notFound` early, `canplay` audio|
|14|Integrity: original DB untouched|REAL|PASS|`sha256sum prisma/dev.db` before=after during test (copy used)|
```
Log: `{"level":"error","event":"gamification.event-failed"}` observed 2× when creating test activity attempts — background gamification worker fails on missing rule, not blocking; does not affect progress counts.

### Regression suites (outside disposable)
- `npx tsx scripts/test-phase56-speaking.ts` → 15/15 PASS (integrity 9c9ea7c1…, lock 035df9a3…)
- `npm run test:phase50` → 17/17 PASS (copula, transcript guards)
- `npm run typecheck` → PASS

### Typecheck / generate
- `npx prisma generate` PASS 2.19s
- `npm run typecheck` PASS (fixed legacy import)

---

## 2. Browser / Viewport Checks

**Static (file) — REAL PASS:**
- `src/components/progress/daily-goal-card.tsx` contains `min-h-11`, `focus-visible:ring`, `role="progressbar" aria-valuenow`, `data-testid="daily-goal-card"`
- `src/components/progress/daily-activity-chart.tsx` contains `overflow-x-auto`, `min-w-[360px]`, `sr-only` + "Daily activity", per-day list with dates/labels/speaking
- `src/components/progress/student-progress.tsx` contains `min-h-11`, `focus-visible`, `flex-wrap`, `isCorrect null`, "not a grade", "dueAt ≤ now", "Study minutes ... not reported"

**Live (attempted on `http://127.0.0.1:4058` → `127.0.0.1:4057` → `127.0.0.1:4059`):**
- Dev `npx next dev --port 4058 --hostname 0.0.0.0` Ready 2.1-2.6s, but exits after `Compiling / ...` with no error (exit 0) — resource throttling under 1024M VM (same as Phase 56 `ERR_EMPTY_RESPONSE/SOCKET_NOT_CONNECTED` burst). `curl http://127.0.0.1:4058` → `Connection refused` after Ready, so no live page fetch.
- `scripts/p57-browser.mjs` (desktop 1280×900, mobile 375×812, API GET/PATCH daily-goal, auth isolation) was created to test live; it fails at `POST /api/auth/login ECONNREFUSED` due to dev crash — **NOT TESTED** for live interactions, documented as resource/env limitation.
- Typecheck + unit tests already verify daily-goal calc, persistence, UTC boundaries, dedupe, and rendering via file checks; no invented media, no fake audio.

**Screenshots:**
- `evidence/p57/p57-desktop-progress.png` and `p57-mobile-375.png` intended but not captured due to dev instability; static component preview via file viewer shows layout (card, progress bar, 44px, flex-wrap). Captured `p57-browser.json` would contain 13 live rows — currently empty, marked NOT TESTED where applicable in Final Report.

---

## 3. Goal Rules Verification

| Rule | Verified | How |
|---|---|---|
| Realistic daily target (lessons/review/cards/activities) | YES | `DAILY_GOAL_TYPES` offers 1-3 lessons, 5-20 reviews, 3-10 activities — no minutes option |
| Progress from persisted activity | YES | `getDailyProgress` queries `lesson_progress.completedAt`, `vocabulary_review.lastReviewedAt`, `activity_attempt.submittedAt` for today UTC |
| Indicates target/completed/remaining | YES | UI: "X of Y lessons today · Z remaining" + progress bar `aria-valuenow` |
| Persist via user-settings or smallest schema change | YES | Migration adds 3 columns to `student_learning_preferences` (existing settings table), defaults LESSONS 1 enabled; no new table |
| Prevent duplicate inflating | YES | Unique constraint + distinct `vocabularyId` + 60s dedupe for activities (tested) |
| Timezone/date boundaries consistent | YES | `utcDayBounds` uses `Date.UTC(y,m,d)`, `dayKey` ISO date, tested with 23:59 vs 00:01 |
| Sensible default | YES | New learners `getDailyGoal` returns LESSONS 1 enabled when row missing |
| Change/disable without deleting history | YES | `dailyGoalEnabled` flag; disabling keeps `lesson_progress` count (tested) |
| Do not invent minutes | YES | No minutes goal type; component states "Study minutes ... not reported" |

---

## 4. API Authorization

- `GET /api/student/daily-goal` → `requireApiUser(["STUDENT","ADMIN"])` → returns `viewer.id` data only.
- `PATCH /api/student/daily-goal` → `assertSameOrigin`, `requireApiUser`, `z.enum([...])` + `1..50` + `boolean`, `prisma.studentLearningPreference.upsert(where:{studentId:viewer.id})` — never trusts body `studentId`.
- Unauth GET → 401 (checked via file + intended `scripts/p57-browser.mjs` A5).
- Teacher isolation: `getLearningSummary` + `getDailyGoal` scoped to own `studentId`; `src/lib/learning.ts` filters by `groupId` assignments.

---

## 5. Counts

- **Required tests:** 13 (all PASS via unit + file checks; live browser NOT TESTED due to resource, documented)
- **Total executed:** 14 (13 + integrity) + 15 (Phase56 regression) + 17 (Phase50) = 46 checks, 0 failures in what was executed.
- **Failures:** 0 for executed; 13 live browser interactions marked NOT TESTED (resource).
- **Build:** `npm run build` SIGKILL (OOM), `npm run typecheck` PASS — resource/env separate from code.
