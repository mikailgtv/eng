# Phase 28 — Index Optimization Report

**Audit date:** 2026-10-07

## Existing schema indexes

The Prisma schema declares 287 explicit `@@index` definitions, 33 single-field unique attributes, and 69 composite unique constraints (plus five composite primary keys). Examples aligned with current LMS queries include:

- Authentication: unique `User.username`, `User.email` (nullable), and `employeeCode`.
- Progress: `LessonProgress(studentId, lessonId)` unique, plus `(studentId, status)` and `lessonId` indexes.
- Assignments: `Assignment(groupId, status)`, `(teacherId, status)`, and `dueAt`; `AssignmentSubmission(assignmentId, studentId)` unique and `(studentId, status)`.
- Attendance: `AttendanceRecord(sessionId, studentId)` unique; session/group/date-related lookups have current indexes on related models.
- Assessments: `AssessmentAttempt(assessmentId, studentId, attemptNumber)` unique plus student/status and assessment/status indexes; answers unique by `(attemptId, questionId)`.
- Notifications: `(userId, readAt, createdAt)`, `(userId, category, createdAt)`, and related indexes.
- Audit logs: `createdAt` and `(entityType, entityId)`; there is no explicit `actorId` index in the model.

## Static gaps and guardrails

A schema-only scan found 83 FK scalar field declarations without an explicit index/unique with that field as the leftmost key. This is a review queue, not a list of automatic additions: some are low-volume or queried through other indexes, and extra indexes add write/storage cost. The live query inventory indicates dashboard, learning-progress, assessment, attendance, assignment, and audit access paths, but no representative production workload is available.

No PostgreSQL server was used; no `EXPLAIN`, `EXPLAIN ANALYZE`, buffer/cache measurement, cardinality, or query-latency collection was performed. No index was added, removed, or changed. Before tuning, capture representative query plans and frequency on staging with realistic sanitized data, then justify each candidate. Pay particular attention to audit actor filtering and the 83 unindexed FK candidates, without assuming every FK needs a standalone index.