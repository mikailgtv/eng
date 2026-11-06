# Phase 25 — Progress Integration Report

**Status: BLOCKED (multiple real evidence sources; chain-wide integration is unverified).**

## Existing evidence sources
- `LessonProgress` is separate from attendance; lesson page/activity flows record real progress.
- `ActivityAttempt` stores actual answers/scores and `AssessmentAttempt` stores server-graded assessment work.
- `LearningEvent`/`StudentSkillState` support observed per-skill evidence, exclusion/recalculation and recommendations.
- Diagnostic submission writes skill-level observations; normal assessment post-submit handler currently queues manual reviews and records diagnostic/placement-specific effects. It does not prove that every QUIZ/EXAM result updates adaptive skill state.
- `AssignmentSubmission` stores text, status, score and feedback; reviewed homework is not shown to uniformly create per-skill learning evidence or recommendations.
- Gamification/XP and streak services use persisted engagement/activity, and the main lesson-progress page is based on actual completion rows.

## No-fake-progress controls
- The Phase 25 session end validates class evidence but does not write `LessonProgress`, `ActivityAttempt`, XP or skill scores. Attendance alone therefore does not mark a lesson complete.
- Dashboard reads use database counts and no new fake stats/data were introduced.
- Progress state changes triggered by page open, login, dashboard refresh, session start/end were not added.

## Gaps / blockers
- **High — assessments:** quiz/exam completion does not have a proven idempotent bridge to skill events, weak-skill recommendations and teacher analytics. Required fix: map question skill tags/graded answers to events with sample/quality context, avoid automatic level changes absent a validated rule, and test retries.
- **High — homework/speaking/writing:** no structured review-to-event mapping; single assignment comment/score is inadequate for the requested skill evidence. Required fix: use reviewed score/rubric evidence only, track source IDs, and prevent duplicate learning events.
- **High — learning path lifecycle:** required states LOCKED/AVAILABLE/IN_PROGRESS/COMPLETED/REVIEW/MASTERED across homework, quizzes and teacher approvals are not demonstrated in one state machine.
- **Medium — recommendations:** next activity/lesson should use assigned course/book, current-level access, prerequisites, teacher override and real learner evidence; the current daily plan is only partial.

No learner level was changed and no progress row was inserted.