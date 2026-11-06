# Phase 28.4 — Index Audit Report

**Scope:** static index/Prisma-schema audit against `prisma/schema.postgresql.prisma`; live `pg_stat_user_indexes`, table sizes and plans are NOT VERIFIED.

## Results

- 213 Prisma models; 602 index/PK/unique annotations in the PostgreSQL schema, consistent with the Phase 28.3 catalog report.
- 277 FK scalar fields; 208 have an index whose leading column covers that FK field; **69 do not**. This is a schema-only screening count, not a claim that every FK needs its own index.
- Exact duplicate index definitions: **0**.
- Left-prefix overlap candidates: **11**. Examples include a standalone `sessionId` index alongside unique `(sessionId, studentId)`, standalone `teacherId` alongside unique `(teacherId, groupId)`, and single-column `scopeKey` indexes alongside unique `(scopeKey, key)`. These are candidates only; uniqueness/foreign-key semantics and actual usage must be checked before removal.
- Indexes added: **0**. Indexes removed: **0**.

## Requested LMS access paths

| Access path | Schema evidence |
|---|---|
| `User.email`, `User.username` | Unique indexes |
| `User.role` | Leading column of `(role, status)` |
| Student-to-user | `StudentLearningProfile.studentId` primary key |
| Teacher-to-group | `(teacherId, groupId)` unique plus both leading-column indexes |
| Enrollment student/course | `StudentCourseAssignment(studentId, courseId)` unique; `CourseAssignment(courseId, groupId)` unique |
| Course/lesson | `Module(courseId, order)` and `Lesson(moduleId, order)`; no direct `Lesson.courseId` field (normalized join) |
| Assignment course/lesson | `lessonId`, group/status, teacher/status and `dueAt` indexed; `Assignment.courseId` has no leading index |
| Submission student/assignment | `(assignmentId, studentId)` unique and `(studentId, status)` index |
| Attendance student/session | `(sessionId, studentId)` unique, `sessionId`, `(studentId,status)` indexes |
| Progress student/lesson | `(studentId, lessonId)` unique, `(studentId,status)` and `lessonId` indexes |
| Notification user | `userId` leading in several indexes |
| Message sender/receiver | `senderId` indexed; no `receiverId` field; access is through conversation participants (`userId, archivedAt`) |
| Assessment/course | `(courseId,status)`, `(status,startAt,endAt)` |
| Assessment attempt | `(studentId,status)`, `(assessmentId,status)`, unique `(assessmentId,studentId,attemptNumber)` |

## Decision

Do not add or remove indexes without live `EXPLAIN (ANALYZE, BUFFERS)` on safe read queries plus `pg_stat_user_indexes`/table-size evidence. Prioritize plan review for `Assignment.courseId`, reporting joins and search filters. B-tree indexes do not normally accelerate leading-wildcard substring search; verify actual PostgreSQL plans before considering `pg_trgm`/full-text changes.
