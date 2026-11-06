# Phase 28.4 — Concurrency Report

**Load/concurrency test status:** NOT RUN. No active STAGING database or app server is available. No test ran against Production or SQLite.

| Scenario | Code/schema protection observed | Concurrent outcome tested? |
|---|---|---|
| Student starts/submits exam twice | Attempt-number unique constraint, P2002 winner recovery; guarded terminal transition in a transaction | NOT VERIFIED on PostgreSQL |
| Student completes lesson twice | Unique `(studentId,lessonId)` plus upsert | NOT VERIFIED |
| Teacher reviews same submission twice | Unconditional update after a read; no compare-and-set status in reviewed function | NOT VERIFIED; last-write-wins risk |
| Attendance recorded twice | Unique `(sessionId,studentId)` and transaction | NOT VERIFIED |
| XP awarded twice | Unique event/source composite and P2002 suppression in main award | NOT VERIFIED; challenge progress uses read-then-write |
| Certificate generated twice | Numbering sequence serialized transactionally; active-certificate check outside transaction and no active-pair uniqueness | NOT VERIFIED; possible duplicate active rows under race |
| Direct message retried | No message idempotency key/unique request key identified | NOT VERIFIED; possible duplicate message |
| Database locks/deadlocks | No `pg_stat_activity`, lock table or wait data available | NOT MEASURED |

Required after restoring staging: run each race with barriers and synthetic accounts, assert exactly one durable business result, then inspect SQLSTATE/Prisma errors, lock waits, deadlocks and retry handling. Do not call code-review evidence a concurrency pass.
