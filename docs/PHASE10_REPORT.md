# Phase 10 report — Motivation and engagement

Phase 10 adds personal motivation on top of the existing LMS. Phases 1–9 were not rebuilt. Phase 11 was not started. Learning Level is not an English level. There is no public ranking, leaderboard, or best/worst student or shift.

The app is running at http://localhost:3000.

## 1. Completed features

Students see motivation on the dashboard and a full page at `/student/achievements`.

- Today's goal uses the Phase 9 minute target. Progress comes from finished activities, not from opening the page.
- Learning Level and an XP progress bar. The page says this is not the English level.
- Personal streak, with "Resume your learning streak" after one missed day. A long gap says "Let's continue from here." Opening the app does not count.
- One saved streak freeze at most. It is earned from a real streak and cannot be stacked without limit.
- Badges and milestones from stored learning events. Locked badges show the requirement.
- A short personal challenge, teacher challenges, and a group total. Group progress does not list student names.
- A quiet badge notice. No confetti. Reduced-motion settings already remove animation.
- This week compared only with the student's own previous week.

Teachers see group counts: how many students finished at least one activity, total activities, lessons, and a group total. Flagged ledgers are marked for review, not punished. Teachers can assign a challenge or a group total for a group they already manage.

Administrators can change XP values, the daily cap, the weekly goal, and turn motivation on or off. Changes are audited. Aggregates have no ranking.

## 2. Architecture

`src/lib/gamification/rules.ts` holds the level, streak, and badge rules.

`src/lib/gamification/award.ts` writes the XP ledger after a Phase 9 learning event is stored. If motivation fails, the learning event still stands.

`src/lib/gamification/service.ts` builds the student, teacher, and admin views. Students cannot call the award function.

The loop is: learning activity, learning event, XP or badge, cached profile, next plan. Academic difficulty is not raised because of XP.

## 3. XP ledger

XP is not a single overwritten number. Each award is a row in `xp_transactions` with student, amount, source, rule, and time.

The same source id cannot be awarded twice. The same practice activity cannot be awarded again on the same day. Each rule has a daily count cap, and the student has a daily XP cap. Defaults:

- Lesson 20
- Practice 10
- Speaking 15
- Listening 15
- Vocabulary review 5
- Assignment 20
- Quiz 10, only when the stored score is at least 60 percent of the points
- Daily cap 80

A correction adds a reversal row and marks the original reversed. History is not silently rewritten.

Suspicious frequency is flagged for a person to review. It does not automatically remove XP or punish the student.

## 4. Badges and milestones

Rules live in the database, not in the page. Seeded badges include First Step, First Conversation, Listener, Speaker, Word Builder, Streak Starter, Consistent Learner, and Course Explorer. An administrator can add, edit, or deactivate a badge. A teacher cannot create a global badge.

Milestones use the same event counts. Listening minutes are an estimate from finished listening activities, not a timer of the page being open.

## 5. Database

`npx prisma db push` added, without `--accept-data-loss`:

- `gamification_profiles`
- `xp_transactions`
- `learning_levels`
- `badges`, `student_badges`
- `milestones`, `student_milestones`
- `learning_streaks`, `streak_freezes`
- `challenges`, `challenge_participants`
- `group_challenges`, `group_challenge_progress`
- `gamification_settings`

Activity tracking still uses Phase 9 `learning_events`. Motivation does not create a second activity log.

## 6. API

- `GET /api/gamification/me` — the signed-in student only
- `POST /api/gamification/challenges` — teacher or admin, own groups
- `POST /api/gamification/group-challenges` — collective total only
- `POST /api/gamification/settings` — admin
- `POST /api/gamification/badges` — admin
- `POST /api/gamification/xp/correct` — admin reversal
- `GET /api/admin/gamification/usage` — admin aggregates

A student request to award XP, create a badge, or assign a challenge returns 403.

## 7. Notifications

A badge, milestone, challenge completion, or new teacher challenge sends one notice. The same title is not sent again within 24 hours. Messages do not use guilt or punishment.

## 8. Tests

`scripts/testing/verify-phase10.ts`: **27 passed, 0 failed**.

Covered: level thresholds, streak resume, freeze, no guilt language, XP award, duplicate and same-activity limits, badge from a real lesson event, student blocked from XP, badges, and challenges, teacher challenge, group total without names, cross-group denial, reversal ledger, audited settings, achievements page, English-level separation, no ranking, teacher and admin pages, and usage privacy.

Phase 9 checks were run again after this work: **31 passed, 0 failed**. `npx tsc --noEmit` passed. These checks returned no 500 responses.

## 9. Limitations

- Minutes on the daily goal are estimates attached to finished activities. They are not a measurement of how long the page was open.
- Word Builder still requires 100 recorded vocabulary reviews, as specified. An administrator can lower that number.
- There is no monetary reward, loot box, or random prize.
- Teachers assign challenges. They do not create global badges.
- A flagged ledger is a review signal only.
- The verifier created a speaking challenge and a group total on the demo student's group, and reversed the test lesson XP. Those are real rows from the test.

Phase 11 was not started.
