# Phase 20 — Learning Path Report

## Delivered
- Student page maps published, assigned courses to modules/lessons, with level labels, current lesson progress, course percentage, unit counts, lock reasons, next/review state and lesson CTA.
- Server-side gates apply student level/course assignment, release schedule, sequential release and prerequisites before returning a lesson view.
- Progress uses existing `LessonProgress` unique `(studentId, lessonId)` rows; course/unit summaries are calculated from lesson records rather than duplicating them. XP uses the unique ledger source/rule key and stored records.
- Student dashboard may show a stored, low-frequency firefighter leopard reaction after a learning event, respecting enable/cooldown/daily limits; reactions are event-derived, not activity data or fabricated streaks.
- Teacher profile view is distinct and includes current/target level, course assignment and explicit course preview action.

## Verification
- Fixed nested Link markup so the lesson card no longer nests the CTA link inside a surrounding link.
- Local Phase 20 script verified level-filtered course path and actual tagged lesson progress/XP for four demo learners.
- Typecheck and production build pass after Phase 21 changes. Temporary restore app health and anonymous API checks pass.

## Limitations
- Mascot reaction table was present but had 0 rows at the last read-only snapshot; event delivery and visual reaction flow have not been exercised end-to-end.
- Unit progress is derived from lesson progress; a separate durable `StudentUnitProgress` record is not implemented.
- No full learner session/browser-restart/mobile/offline test, load test, or authenticated lesson/quiz/exam-to-certificate path was run.
- Earlier QA fixture writes are in the local existing DB; they are tagged demo data, not real performance outcomes.
