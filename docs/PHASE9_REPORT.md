# Phase 9 report — Adaptive learning engine

Phase 9 adds a personal study plan on top of the existing LMS. Phases 1–8 were not rebuilt. Phase 10 was not started. The engine does not change grades, exam results, attendance, curriculum, or work schedules.

The app is running at http://localhost:3000.

## 1. Completed features

Students see **Your learning plan** on the dashboard and a full page at `/student/plan`.

The plan answers “what should I practice next?” from recorded activity: lessons, practice, vocabulary review, exams, assignments, speaking, listening, and tutor sessions. It does not use exam scores alone.

Today’s plan is short. Beginners default to 10 minutes. Students can choose 5, 10, 15, 20, 30, 45, or 60 minutes. Each item has a reason, a source, and a link into the existing lesson, review, tutor, speaking, or listening page.

A weekly list covers Saturday through Friday. A missed item stays available with “Let’s continue from here.” The plan does not say the student is behind, and it does not build a backlog.

The profile uses descriptive labels only: Not started, Needs Practice, Developing, Needs Review, Strong recent performance. Students are not compared with each other.

Teachers open **Learning plans**. They see Needs Review, Low recent activity, No practice recorded yet, High error frequency, and Strong recent performance. There is no top or worst student, and no best or weakest group. A teacher can set a priority skill or a required review, such as Present Simple, for a group they already manage.

Administrators can turn the engine on or off, set review intervals, the daily default, the recommendation cap, teacher override, and retention. Changes are audited.

## 2. Architecture

Server modules in `src/lib/adaptive/`:

- `events.ts` — LearningEventService. Append-only events. Duplicate source ids are ignored.
- `estimate.ts` — MasteryEstimator. Output is a learning progress estimate, not an exact ability score.
- `review.ts` — ReviewScheduler. Default intervals are 1, 2, 4, 8, 16 days and can be changed.
- `plans.ts` — RecommendationEngine and StudyPlanGenerator.
- `skills.ts` — SkillTracker catalog. New skills can be added by an administrator.
- `hooks.ts` — writes events after real practice, lessons, exams, assignments, speaking, listening, and tutor sessions. A hook failure does not undo that activity.
- `service.ts` — authorization for plans, overrides, exclusion, and recalculation.

The dashboard reads the cached daily plan. It does not replay the full history on each page load. A full rebuild happens only when a teacher or administrator asks for it.

## 3. Database

`npx prisma db push` added, without `--accept-data-loss`:

- `skills`, `knowledge_items`
- `learning_events`, `student_skill_states`, `student_knowledge_states`
- `review_schedules`, `learning_recommendations`
- `daily_learning_plans`, `weekly_learning_plans`
- `learning_goals`, `adaptive_rules`
- `teacher_learning_overrides`, `student_learning_preferences`

Events keep history. Excluding an event marks it. It is not hard-deleted. Mastered is not permanent: a later incorrect answer moves the item to Needs Review and keeps the earlier correct count.

## 4. Recommendation logic

Priority, highest first:

1. Teacher required review
2. One unfinished item from the previous plan
3. Due review items
4. Repeated recorded misses, including speaking transcripts that were not the full phrase for am / is / are
5. Teacher priority skill
6. The current unfinished lesson
7. A student goal, only when it does not hide a recorded weakness
8. A short item for a skill with no recent practice, so the plan is not only vocabulary

Each item stores observed evidence separately from the estimate. Example: “4 correct and 1 incorrect answers are still on record. This is not a grade.”

Sources are SYSTEM, TEACHER, COURSE, REVIEW, or STUDENT_GOAL. Tutor practice stays labeled AI Practice and is not an exam.

## 5. Schedule awareness

Firefighter shift groups and day-worker groups are not assumed to be free at the same time. If a class is already scheduled, the plan says practice stays short around that class. The work roster and class times are not edited.

## 6. AI integration

The tutor can receive a short adaptive note: a teacher review label, a review item with observed counts, or a goal. It does not receive passwords, employee codes, emails, or teacher-private notes. The tutor still cannot change grades, publish official content, or override a teacher.

Mistake review can mention that note. Generated tutor items remain drafts.

## 7. Student experience

Login, dashboard, today’s plan, then the existing lesson, review, listening, or speaking page. Completing an activity records an event. The next plan uses that event. Optional confidence is “Not sure / Somewhat sure / Very sure” and is stored as a self-report, not as ability.

Practice is not saved on the device. If the connection fails, the page says to try again online. There is no fake offline mode.

## 8. Security

Students can read and complete only their own recommendations. Another student gets 404. Students cannot recalculate history, exclude events, or change organization settings. Teachers can override and review only groups they already manage. Usage counts are admin-only. Audit rows cover setting changes, overrides, exclusion, retention, and recalculation.

## 9. Tests

`scripts/testing/verify-phase9.ts`: **31 passed, 0 failed**.

Covered: mastery decay, one-step difficulty, configurable intervals, duplicate events, forgotten vocabulary with history kept, client mastery rejected, teacher override, daily and weekly plans, no ranking language, cross-student privacy, speaking and listening events, admin settings, audit, and recalculation.

Regression on the same server: Phase 7 **20/0**, Phase 8 **30/0**. `npx tsc --noEmit` passed. These checks returned no 500 responses.

## 10. Limitations

- Review timing is a configurable estimate. It is not a scientific spaced-repetition measurement.
- The engine does not claim an exact English percentage.
- An exam result is stored as observed points. It does not by itself mark a skill mastered.
- Plans refresh when opened if the last sync is older than six hours, when the student chooses Update my plan, or when a teacher override clears the sync time. There is no separate overnight job.
- Event hooks run after the original activity is saved. If the process stops before the hook finishes, that one event can be missing until a teacher recalculates. Recalculation only replays events that were stored.
- Offline practice is not stored locally.
- Difficulty moves by one band only, and only after three recent scored events.
- The verifier saved a teacher override, “Present Simple,” on the demo student’s group. That is a real row from the test, not a placeholder.

Phase 10 was not started.
