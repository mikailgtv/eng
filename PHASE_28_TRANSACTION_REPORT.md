# Phase 28 — Transaction and Race-Condition Report

**Audit date:** 2026-10-07  
**Method:** static source/schema review only; no concurrent or PostgreSQL tests were run.

## Existing protections

- Exam grading/finalization uses a Prisma transaction and a guarded `updateMany` from `IN_PROGRESS`; only the winning request finalizes, with the other request reading the stored result. `AssessmentAnswer` is unique by `(attemptId, questionId)`.
- Assessment attempts are unique by `(assessmentId, studentId, attemptNumber)`; attempt creation counts attempts then creates inside a transaction.
- Lesson progress uses `upsert` and is unique by `(studentId, lessonId)`.
- Assignment submission is unique by `(assignmentId, studentId)` and uses `upsert`; attendance is unique by `(sessionId, studentId)` and has transactional write paths.
- XP ledger rows are unique by `(studentId, sourceType, sourceId, ruleKey)` and duplicate-key errors are treated idempotently in the award path.
- Certificate issuance groups certificate/version/completion-record writes in a transaction; completion record is unique by `(studentId, courseId)`.
- Password-reset and several content, identity, teaching, workflow, and certificate operations use transactions. A source scan found transaction calls across these areas.

## Risks needing staging concurrency tests/fixes

1. **Assessment start/max attempts:** count and create are inside a transaction, and a composite unique constraint prevents duplicate attempt numbers, but no PostgreSQL concurrency test/retry behavior was run. Two simultaneous starts may race and one may surface a unique violation; validate isolation, user response, and retry/idempotency.
2. **XP caps and multi-step award:** daily-cap/rule counts are read before ledger insert; unique idempotency prevents duplicate same-source entries but does not by itself serialize different simultaneous events against a daily cap. Profile refresh, streaks, badges, notifications, and challenge updates are not one atomic unit. Determine intended guarantees and add atomic/serializable or guarded-ledger logic where required.
3. **Certificate uniqueness:** active-certificate lookup occurs before the issuance transaction. `publicId` and `downloadToken` are unique, but no schema constraint enforces one active certificate per student/course. Concurrent issuance needs an explicit invariant and safe conflict handling.
4. **Assignment review/submission:** submission status checks and review/write side effects are not all in a single transaction. The unique key prevents a second row, but review-vs-resubmit concurrency and notification/audit atomicity need staging tests.
5. **Lesson completion side effects:** progress upsert is unique/idempotent, while adaptive/gamification hooks run separately; verify retries do not duplicate rewards or lose required downstream events.

These are review findings, not reproduced failures. Preserve current semantics; do not add constraints or alter transaction isolation without data cleanup analysis and workflow tests. PostgreSQL deadlock/retry, timeout, and `P2002` behavior remain untested.