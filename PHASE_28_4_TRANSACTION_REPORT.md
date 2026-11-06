# Phase 28.4 — Transaction Report

**Runtime transaction tests:** NOT RUN in Phase 28.4 because no PostgreSQL staging target is reachable. The Phase 28.3 disposable repeat-target probes were not a transaction/concurrency certification.

## Static review

| Operation | Code evidence | Static assessment / remaining risk |
|---|---|---|
| Exam start/resume | `src/lib/assessment/engine.ts` transaction, unique `(assessmentId, studentId, attemptNumber)`, P2002 winner recovery | Strong duplicate-start protection by code; isolation/lock behavior not tested on PostgreSQL. |
| Exam final submit | `gradeAndFinish` transaction, conditional update `status=IN_PROGRESS` | First terminal writer wins; hooks/XP run after commit and require independent idempotency. |
| Attendance | `saveAttendance` transaction across marks and change rows; unique `(sessionId, studentId)` | Batch atomic in code; concurrent conflict behavior not measured. |
| Assignment submit | Unique `(assignmentId, studentId)` and `upsert`, but prior status read is outside the write; retry can update the same body/state. | Idempotency and two-writer behavior require a PostgreSQL concurrency test. |
| Lesson completion | Unique `(studentId, lessonId)` upsert | Row-level completion is idempotent; downstream adaptive/reward hooks are outside the upsert. |
| XP awards | Unique `(studentId, sourceType, sourceId, ruleKey)`; P2002 maps to no additional award | Strong per-source dedupe for the main award path; challenge progress uses read-then-set outside a transaction. |
| Certificate issue/correction/revocation | Certificate sequence/record/version writes use transactions | Active-certificate precheck is outside issue transaction and no partial unique `(studentId,courseId)` constraint is modeled; concurrent duplicate issue remains possible. |
| Teacher review | Read then unconditional submission update and separate audit | Two reviewers can overwrite each other (last-write-wins); conditional state transition/actor conflict handling is recommended. |
| Invitation acceptance | User creation, invitation consumption and membership links use one transaction | Atomic core; password-history/access-role/audit/notification writes follow afterward. |

Isolation level, deadlock/lock timeout behavior and transaction latency are **NOT VERIFIED**. No isolation setting was changed. No explicit transaction-isolation override was found in the reviewed app paths; the effective level is determined by the database/provider default and has not been queried. Do not assume READ COMMITTED without checking `SHOW transaction_isolation` on the active staging connection.
