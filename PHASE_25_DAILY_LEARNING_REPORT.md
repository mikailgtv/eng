# Phase 25 — Daily Learning Report

**Status: BLOCKED (real daily learning components exist; requested mission ordering and integration are incomplete).**

## Existing evidence
- Student home calls `getLearningSummary`, activity attempt stats, vocabulary due counts, assessment history, `studentPlan`, gamification engagement and existing firefighter leopard reaction service.
- Student plan uses real persisted learning events, student knowledge review schedules, skill estimates, teacher overrides, incomplete lessons and student/group goals. Recommendations include evidence text and state that they are estimates, not exact ability scores.
- Student learning routes include continue lesson, review queue, assignments, schedule, exams and practice. Empty states display when no records are present.
- Course progress is calculated from completed lesson progress; opening the dashboard or attending class does not itself write completion.

## Requested mission ordering gap
The current plan generator (`src/lib/adaptive/plans.ts`) prioritizes teacher learning overrides, carry-over, due review, weak-skill states, incomplete lesson, goals and balance. It does not establish the specified strict priority sequence of teacher homework assignment > required homework > incomplete lesson > scheduled review > weak-skill practice > new lesson. Published assignments are not shown as the first required mission in `studentPlan`.

## Other gaps
- Upcoming deadlines/assessment and daily assignment activity are separate dashboard surfaces, not a single today's mission state machine.
- Homework, quiz and reviewed speaking/writing evidence are not proven to consistently update the plan and learner skill state.
- Test with no data and demo filtering/report isolation were not run; assigned demo content may be included in learning totals per prior Phase 23 audit.
- Mascot reaction supports student dashboard messages but not every requested homework/streak/weak-result event; pedagogical beginner-level copy coverage was not tested.

## Blockers
- **High — DailyLearningService integration:** mission priorities and homework lifecycle are incomplete. Required fix: compose only real, permission-scoped assignments, progress and review rows in the required order; store idempotent completion/evidence and show no fake tasks.
- **High — progress integrity:** validate all progress triggers against real activity/submission/teacher-approved evidence and prove session attendance alone does not advance it.
- **Medium — mascot/UX:** add accessible, supportive, level-appropriate event copy after real achievements only; avoid implying poor ability from low scores.

No daily tasks or progress values were added.