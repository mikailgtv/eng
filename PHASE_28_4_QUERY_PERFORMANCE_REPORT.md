# Phase 28.4 — Query Performance Report

**Live query metrics:** NOT MEASURED. **EXPLAIN ANALYZE:** NOT RUN because the PostgreSQL staging server and tools are absent; no query was run against the SQLite source as a substitute.

## Static review findings

- Student dashboard runs multiple helper reads in parallel and several preceding reads; response latency is not equivalent to SQL time.
- Teacher dashboard batches groups, sessions, students, plans, assignments, exams and recent records with `Promise.all` and bounded upcoming lists; some day/group reads are not hard-capped.
- Course API lists at most 40 courses, but nested modules/units/lessons can expand without per-relation limits.
- Student assignment page fetches published assignments/speaking/listening tasks for a group without an explicit `take`/cursor.
- Question bank uses offset pagination with page size capped at 50, but text `contains` search has no schema-level trigram/full-text index.
- User search is 20-row offset pagination; messages cap conversation lists at 30 and message reads at 50; notification APIs cap at 30 and use a timestamp cursor.
- Certificate report generation loops through students and course assignments and calls course evaluation per pair; see the N+1 report.

| Query family | Execution time | Rows scanned/returned | Plan/index use |
|---|---|---|---|
| Student/teacher/admin dashboards | NOT MEASURED on live PG | NOT MEASURED | NOT VERIFIED |
| Course/lesson/assignment/submission/exam/progress | NOT MEASURED on live PG | NOT MEASURED | NOT VERIFIED |
| Attendance/notifications/messages/reports | NOT MEASURED on live PG | NOT MEASURED | NOT VERIFIED |

Historical Phase 28.3 development HTTP samples are in `PHASE_28_4_PERFORMANCE_BASELINE.md`; they include cold Next.js compilation and are not database query timings. No production SLO or slow-query threshold is configured/verified.

The Phase 28.3 source snapshot’s largest tables by row count (not bytes) were `audit_logs` (647), `notifications` (318), `notification_deliveries` (258), `account_security_events` (232), `login_attempts` (210), and `user_sessions` (165). This is historical row-count evidence only; PostgreSQL table/index sizes, bloat, growth and storage ranking are NOT MEASURED. Logs, messages, notifications, submissions, AI/voice records and audit events are growth-sensitive.
