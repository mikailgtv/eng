# Workflow Catalog — Phase 19

Templates are **presets that populate a draft**. They do not auto-activate. An authorized admin must inspect the event producer, target, conditions and steps, test the draft, then publish a version. Only `LESSON_COMPLETED` is currently emitted by an ordinary LMS learning action; event names marked **not wired** will not run automatically until a producer is connected. Manual trigger is available only when the draft uses the Manual trigger.

## Built-in draft presets

| Template | Trigger | Default condition | Draft steps | Current operational status |
|---|---|---|---|---|
| New Student Welcome | Manual | None | Send an in-app welcome notice to the selected active subject | Usable after manual trigger and worker configuration |
| First Lesson Celebration | `LESSON_COMPLETED` | None | Send an in-app encouragement notice | Producer wired |
| Vocabulary Review | `REVIEW_DUE` | None | Create a vocabulary review recommendation | Event producer not wired |
| Listening Practice | `EXAM_COMPLETED` | Level = `PRE_A1` | Create listening recommendation | Event producer not wired; assessment skill evidence is not inferred |
| Speaking Practice | `SPEAKING_COMPLETED` | None | Create speaking recommendation | Event producer not wired |
| Attendance Follow-up | `ATTENDANCE_ABSENT` | None | Send a neutral class follow-up notice | Attendance workflow events not wired |
| Assignment Reminder | `ASSIGNMENT_OVERDUE` | None | Send an assignment notice | Assignment deadline/overdue producer not wired |
| Exam Follow-up | `EXAM_FAILED` | None | Create a review recommendation | Exam event producer not wired |
| Course Completion Approval | `COURSE_COMPLETED` | None | Pause for generic human approval | Course completion event producer not wired; approval does not issue a certificate |
| Streak Encouragement | `STREAK_EXTENDED` | None | Send a gentle encouragement notice | Gamification event producer not wired |
| Certificate Approval | `CERTIFICATE_ELIGIBLE` | None | Pause for generic human approval | Certificate event producer not wired; approval does not issue/revoke a certificate |

The requested Teacher Review Reminder is not included as an executable preset: the current action resolver targets the event subject, which is the student for an assignment submission, not the assigned teacher. A teacher recipient resolver and group-scope authorization are required first.

## Trigger availability

- **Event**: strict allowlisted event names. Active producer today: `LESSON_COMPLETED`.
- **Manual**: an authorized admin queues an event bound to a published Manual workflow and optionally selects an in-organization student.
- **Simulation**: a separate no-side-effect operation; simulation is not a production trigger.

Schedule/date/relative-time/webhook/import triggers are not available. The workflow event catalog contains many event names for consistent future integration, but catalog presence is not proof an event is emitted.

## Condition field/operator catalog

Fields: `user.role`, `user.englishLevel`, `user.groupId`, `event.eventType`, `event.objectType`, `event.source`.

Operators: `EQ`, `NE`, `IN`, `NOT_IN`, `CONTAINS`, `IS_EMPTY`, `IS_NOT_EMPTY`. Rules combine in a single `AND` or `OR` group. The authoring surface does not accept raw code, property paths or queries.

## Action catalog

| Action | Support |
|---|---|
| Send notification | Implemented via the existing notification hub; honors in-app preferences, quiet hours, grouping and throttling. External channel delivery is only as available/configured in Phase 12/18. |
| Create learning recommendation | Implemented for an active student inside the workflow organization; retry marker prevents duplicate rows. |
| Wait N minutes | Implemented as a durable wait state, resumed by the worker. Calendar/timezone-relative waits are not implemented. |
| Require human approval | Implemented as a durable pause/resume/cancel state with expiry. It does not invoke an official-record action. |
| XP, badge, mascot reaction, course/lesson/assignment assignment, unlock/lock, attendance write, message, task, status change, certificate request/issue, report/export, webhook/integration call | Not offered. These need action-specific authorization, transaction/duplicate rules and audited adapters. |
| Email-only, SMS-only, push-only | Not offered as workflow actions. `SEND_NOTIFICATION` delegates to the existing notification hub, which remains authoritative for channels and provider configuration. |

## Templates not represented as active system records

The template cards are code-defined presets. There is no `workflow_templates` database model, activation flag, template versioning or organization-customizable template store in this phase. A selected preset becomes a normal organization-scoped workflow draft with its own immutable published versions and runs.
