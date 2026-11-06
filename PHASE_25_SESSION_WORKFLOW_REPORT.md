# Phase 25 — Session Workflow Report

**Status: BLOCKED (session start/attendance foundations exist; delivery and completion chain is partial).**

## Existing workflow
- `ClassSession` already models `SCHEDULED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`, scheduled/actual times, assigned teacher, group, optional course/module/lesson and recurrence.
- Teacher dashboard already displays Start/Continue class. `startSession` verifies group scope, records server time, avoids a second in-progress session for that teacher/group and audits start. `endSession` and cancel controls already existed.
- `AttendanceRecord` is unique per student/session, supports PRESENT/ABSENT/LATE/EXCUSED; `AttendanceChange` provides an append-only old/new status record. The existing UI offers Mark all present and individual status buttons.

## Phase 25 changes
- Added in-session published lesson selection using the session's own assigned group. Service validates lesson → published module → published course → `CourseAssignment` and persists lesson/module/course IDs, then audits the previous/new lesson. Session creation now applies the same scope validation to any optional course/module/lesson links and audits schedule creation.
- Added completion evidence rules: active session + server start timestamp + valid published assigned lesson + at least one active student + marks for every active student. A specific `422 Cannot complete session...` message reports missing conditions.
- Attendance cannot be newly marked during a scheduled/cancelled session; marks are limited to active group students; duplicate student IDs in a save are rejected. Post-completion corrections remain available and recorded in `AttendanceChange`.
- Cancellation now writes an audit event.

## QA
`npm run test:session-rules`, `npm run typecheck`, `npx prisma validate` passed. These are pure/static tests; no authenticated session or attendance record was inserted. The Phase 25 selector's API and database scope were not integration-tested.

## Blockers
- **High — end-to-end class delivery:** no persistent `session_activities`, lesson delivery events, quick-check records, exercises completed per session, structured session summary or teacher next-lesson decision is wired to this record. Required fix: safely add session-scoped event model(s) after staging migration rehearsal and integrate existing activity/assessment entities.
- **High — scheduling lifecycle:** session reschedule status/action absent; timezone still defaults to UTC in recurrence code; no shift rotation/off-day support. Required fix: configurable timezone/rotation and audited reschedule action with calendar consistency.
- **High — classroom panel:** current page provides class/session/attendance/note controls, not all requested student-level weak skills, current lesson, homework status, last activity, book/unit/shift and assessment/feedback panel. Required fix: scoped optimized queries and role-aware student panel.
- **Medium — attendance detail:** schema has no late-minute or per-mark note field. Required fix: additive migration after stage/restore validation; retain correction history and audit.
- **High — completion summary:** completion validates minimum evidence but does not display/store the required structured attendance, activity, homework, assessment, issue, note and next lesson summary. Required fix: explicit summary UI and persistable reviewed fields.

No session progress is awarded merely for attendance or session completion.