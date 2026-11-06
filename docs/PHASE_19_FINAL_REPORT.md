# Phase 19 — Automation & Workflow Engine

**Status: Core workflow foundation implemented; Phase 19 is not production-complete.** This extends the existing EnglishBridge web LMS and keeps its URL, backend, database, accounts, learning records and existing services. It is not a separate app.

## Delivered

- Organization-scoped, persisted workflow events, draft/version/published definitions, runs, step history, wait states, approvals and idempotency records.
- A server-side event bus with an allowlisted event catalog, stable organization-scoped idempotency keys and sensitive-metadata filtering.
- A safe condition evaluator (AND/OR groups and fixed fields/operators; no arbitrary code), checksum-versioned publication and a visual admin workflow builder.
- Supported triggers: LMS event and authorized manual trigger. A successful lesson completion is currently connected to the event bus.
- Supported steps: in-app notification through the existing Communication Hub, learning recommendation through the existing adaptive recommendation model, persisted WAIT, and a human approval pause.
- A dry-run/test endpoint that evaluates a definition without production writes; manual runs enter the same durable event queue.
- A protected, bounded worker endpoint, retry/backoff, stale-lock recovery, step idempotency, queue limits, approval expiry and loop prevention.
- Organization admin, Super Admin and Training Admin permission keys for view, manage, execute and approve. Students are denied. Teacher access is default-deny and a teacher-facing center is not implemented.
- Audit entries for workflow creation/versioning/publication, manual triggers, simulations and approval decisions.

## Event system

The event envelope persists `event_id` (row ID), `event_type`, `organization_id`, optional `actor_id` / `subject_user_id`, optional object type/ID, timestamp, source, version, safe metadata, idempotency key, queue status and retry/lock fields. The registry includes the educational, attendance, assessment, gamification, certificate, communication and integration event names listed in the architecture document. `LESSON_COMPLETED` and the internal `MANUAL_TRIGGERED` event are wired today; the other names are a catalog, not evidence that all source mutations publish them.

Lesson completion events are best-effort after the existing completion transaction. Event persistence does not run the workflow in the page request.

## Workflow editor and execution

The responsive `/admin/automation` center has Overview, Workflows, Templates, Runs and Approvals sections. Authorized admins can build a WHEN → IF → THEN flow, add AND/OR conditions, notification/recommendation steps, a duration-based wait, or an approval pause; save a draft; test/dry-run; publish; pause; create a new version; inspect run summaries; and approve/reject pending steps. Editing a published workflow creates a new draft while the last published version stays active; published definition snapshots retain their SHA-256 checksum and historical run/version links.

Current allowed condition fields: user role, English level, group ID, event type, event object type and event source. Operators: equality/inequality, IN/NOT IN, CONTAINS, IS EMPTY and IS NOT EMPTY. The engine resolves the subject against the event's organization before any user-directed action.

## Actions and communications

- `SEND_NOTIFICATION`: in-app publish through the existing Communication Hub; the hub enforces the account's category preferences, quiet hours, grouping/deduplication and notification caps. External providers remain subject to the Phase 12/18 configuration state; this phase does not invent delivery.
- `CREATE_LEARNING_RECOMMENDATION`: creates a deduplicated recommendation for an active student in the same organization.
- `WAIT`: stores a due timestamp and resumes on a later worker tick.
- `REQUIRE_APPROVAL`: persists a pending approval, pauses the run, resumes only after an authorized approval, cancels on rejection or expiry.

The engine intentionally does **not** award XP, change grades or permissions, issue/revoke certificates, assign users/courses, execute webhooks, send direct email/SMS/push, or display mascot reactions. Those actions require existing service-specific guards and idempotency semantics that are not connected in this implementation. Certificate approval is a generic workflow approval only; it does not issue a certificate.

## Queue, retry and idempotency

Events and runs are database-backed, so queued events, waits, approval state, versions and history survive process restart. The protected `POST /api/internal/workflow-worker` drains bounded batches, resumes due waits and expires stale approvals. Set server-only `WORKFLOW_WORKER_SECRET` to a random value of at least 32 characters and call the endpoint from a trusted scheduler. **No scheduler/worker is configured in this workspace**; queued work will remain queued until one is installed.

Per-organization queue caps, a workflow cap, worker batch bounds, unique event/run/step keys, action idempotency records, stable notification deduplication, exponential retries and five-minute stale-lock recovery limit accidental repeats. Action execution is not a mathematically exactly-once distributed transaction: a crash after an external provider accepts delivery but before the idempotency record is completed can still require provider-specific reconciliation. There are no external action adapters in this phase.

## Database and APIs

Added Prisma models: `WorkflowEvent`, `Workflow`, `WorkflowVersion`, `WorkflowRun`, `WorkflowRunStep`, `WorkflowApproval`, and `WorkflowIdempotencyRecord`. New tables were applied to the local SQLite development database with `prisma db push`; existing tables were not reset. The repository does not yet contain a reviewed production migration. Production rollout requires a backup and a formal, reviewed migration against the production database.

Main routes:

- `GET/POST /api/admin/automation` — scoped list/metrics and save a draft/new version.
- `PATCH /api/admin/automation/workflows/:id` — publish, pause or archive.
- `POST /api/admin/automation/workflows/:id/run` — authorized manual enqueue.
- `POST /api/admin/automation/simulate` — side-effect-free simulation.
- `GET/POST /api/admin/automation/approvals` — pending queue and authorized decisions.
- `POST /api/internal/workflow-worker` — secret-protected scheduler entry point.

## Validation performed

- Prisma format, validate, client generation and local `db push`: passed.
- `npm run typecheck`: passed.
- Optimized Next.js production build: passed with `NODE_OPTIONS=--max-old-space-size=2048`. Default Node heap ran out of memory during build type checking; the 2 GB heap completed it.
- Phase 19 service checks: eight groups passed, covering validation/allow-listing, conditions, unsafe URL/code rejection, side-effect-free simulation, immutable versions, queue/idempotency/tenant isolation, wait/resume/approval, sensitive metadata filtering and recursive-event protection.
- API smoke test: Admin login/center/summary succeeded; student summary returned 403; unsafe action URL returned 422; draft/publish/manual enqueue returned 201/200/202; worker without its secret returned 503.
- Existing regression suites run: Phase 3 58 checks reported passed; Phase 5 43/0; Phase 7 20/0; Phase 8 30/0; Phase 9 31/0; Phase 11 57/0; Phase 14 42/0; Phase 15 all checks passed; Phase 16 route checks passed; Phase 17 20/0; Phase 18 integration suite passed.

See `PHASE_19_QA_REPORT.md` for test limitations and observed legacy-suite failures/warnings.

## Known limitations — not production-complete

1. Only lesson completion and authorized manual runs currently emit usable events; the remaining catalog types need server-side producers in the corresponding LMS services.
2. No schedule/date/relative-time/webhook/import trigger; no timezone-aware calendar recurrence. `WAIT` is elapsed minutes only. The organization timezone is used for the “completed today” dashboard metric.
3. Only four action types are executable; `ELSE`, arbitrary multi-branch graphs, mascot reactions, gamification XP, assignments, certificates, webhooks and other provider actions are not implemented.
4. Templates are reviewed draft presets in the UI, not persisted/activatable template records. No template activation/version lifecycle exists.
5. No always-on durable worker is provisioned; deployment must configure the server-only secret and an external trusted scheduler. No load/soak test has been run.
6. The current builder is for authorized admins. Teacher-specific group-scoped management/visibility is not implemented. Fine-grained organization isolation is enforced for current event/run/API actions.
7. Mobile responsiveness is implemented in the existing web UI, but no real-device viewport suite or formal accessibility audit has been run.
8. No production migration has been generated/reviewed. Local `db push` is not a production migration plan.

No Phase 20 work was started.
