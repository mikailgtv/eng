# Phase 25 — Security Report

**Status: BLOCKED — not a security certification.**

## Phase 25 controls verified from source
- Teaching APIs require teacher/admin roles for session start/end/attendance and assignment creation/review; student submission endpoints require STUDENT.
- Session services call `assertSessionAccess`/`assertGroupAccess`; lesson selection newly verifies the lesson is published under a published course assigned to the session group.
- Attendance marks are limited to active group students, scheduled/cancelled writes are blocked, duplicate IDs are rejected, and changes are stored in append-only `AttendanceChange` rows. Cancellation and lesson selection are audited.
- Student assignment page/service scopes to the session student's own group and published assignment; student identity is taken from server session, not request body.
- Teacher notes are stored with `TEACHER_ONLY` visibility and are not shown on student assignment/classroom pages reviewed in this audit.
- No student score/XP/level client mutation was added. No DB data was changed.

## Unresolved risks inherited from Phase 21
The existing Phase 21 security report remains applicable: critical Next.js dependency finding; one high production dependency finding; incomplete route-by-route tenant/IDOR audit across the app; in-memory limiters; incomplete atomicity/idempotency tests; deployment-context/secret isolation not verified; no complete SameSite/CSRF mutation-route audit; and no independent penetration test. The earlier local DB incident and post-change-only/untrusted-for-recovery backup constraints remain; do not reset, reseed, or use protected `prisma/dev.db` for Phase 25.

## Phase 25 authorization/test gaps
- No cross-organization/cross-teacher integration matrix was executed for class, session, assignment, submission, score, feedback, student notes and reports.
- No concurrency/retry/idempotency tests for Start/Complete, bulk attendance, submissions, score changes or event generation.
- `Assignment` accepts optional lesson/course references; linking to a group is not verified by Phase 25 E2E data tests.
- No audit schema was expanded for IP/request metadata or before/after score/feedback changes; no verified score-modification history beyond generic audit entries.
- Admin organization management reports/private-note exclusion were not exercised.

## Blockers
- **Critical — dependencies:** resolve applicable Next.js critical advisory and PostCSS high finding in reviewed dependency branch; run full build and regressions.
- **High — tenant security:** test all actor/resource combinations on disposable fixture DB and review any gaps before release.
- **High — idempotency/atomicity:** add request/replay guards and concurrent integration tests to sensitive mutations.
- **High — audit completeness:** record actor, action, before/after, reason and appropriate request context for score/feedback/attendance/session/transfer changes.

Static checks are not evidence that the above risks are closed.