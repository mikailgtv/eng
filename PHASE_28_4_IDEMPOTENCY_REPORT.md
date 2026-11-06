# Phase 28.4 — Idempotency Report

**End-to-end retry tests:** NOT VERIFIED.

## Controls found in schema/code

- Exam answer upsert keyed by attempt/question; assessment attempt uniqueness by assessment/student/attempt number and guarded completion.
- Lesson progress upsert keyed by student/lesson.
- Attendance unique session/student.
- Assignment submission unique assignment/student, but the retry path uses upsert update and may replace the original text after a concurrent/pre-read race.
- Main XP ledger unique student/source type/source id/rule key; duplicate conflict is treated as no award.
- Course completion record unique student/course; certificate sequence unique prefix/year; workflow event/idempotency rows have unique organization/key patterns.

## Gaps / risks

- Direct messages have no client idempotency key or uniqueness key; retries can create multiple messages.
- Notification `groupKey` is indexed but not unique; the uniqueness/deduplication path is not database-enforced.
- Certificate active student/course uniqueness is a precheck, not a database uniqueness rule; racing requests can both pass the check.
- Group challenge progress uses read + absolute set and may lose increments under concurrent events.
- Audit and notification side effects generally occur after the principal write; delivery retries/atomic outbox behavior is NOT VERIFIED.

**No idempotency migrations or code changes were made.** Add request-scoped idempotency keys/unique records for message-send and other retry-sensitive actions, then validate race conditions on STAGING before changing constraints.
