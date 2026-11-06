# Phase 21 — Database Index Report

**Database:** SQLite at local `prisma/dev.db` (not verified as staging/production)
**Audit date:** 2026-10-05

## Summary

The existing Prisma schema already defines **287 `@@index` declarations and 69 `@@unique` declarations** across 213 models. The local SQLite file reports 213 user tables and passes `PRAGMA integrity_check` and `PRAGMA foreign_key_check` with zero violations. No new index was applied in Phase 21: the only available DB is an existing local data file, and query plans/load traces on an isolated staging database are not available. Adding indexes and `db push`-ing them into the existing file would be unsafe and unmeasured.

## Existing high-value indexes (schema inspection)

| Entity / query family | Existing schema constraint/index | Query helped | Expected effect (not benchmarked) |
|---|---|---|---|
| Users | Unique `username`, `email`, `employeeCode`; indexes `(role,status)`, `groupId`, `organizationId`, `(lastName,firstName)`, `(status,lastLoginAt)` | Login lookup; admin roster; group/org/role filters | Efficient indexed equality/prefix filters; verify query plans for combined tenant filters. |
| Learning groups | Indexes on `status`, `teacherId`, `organizationId`, `departmentId`, `parentId` | Teacher/admin group views and tenant selection | Avoid broad scans for common single-column filters. |
| Student lesson progress | Unique `(studentId,lessonId)`; indexes `(studentId,status)` and `lessonId` | Dashboard completion counts; lesson progress lookup | Exact progress lookup and status-scoped student read are indexed. |
| Course catalog | `Course(levelId,status)` and `(curriculumId,sortOrder)`; `CourseAssignment` unique `(courseId,groupId)` plus `groupId`; `StudentCourseAssignment` unique `(studentId,courseId)` plus `(courseId,active)` | Assigned course listing and course/level selection | Supports assignment joins/filters; verify actual join plan with Postgres before scale claims. |
| Lessons / activities | `Lesson(moduleId,order)`, `status`, `unitId`; `Activity(lessonId,order,status)` | Learning path and lesson payload | Keeps ordered lesson/activity lookups indexable. |
| Activity attempts | `(studentId,activityId,submittedAt)`, `(studentId,submittedAt)`, `activityId` | Practice history and teacher/student activity analytics | Supports learner history; large-window reporting still needs pagination/aggregates. |
| Exams | `Assessment(status,startAt,endAt)`, `(courseId,status)`, `(type,status)`; attempts unique `(assessmentId,studentId,attemptNumber)` and indexes `(studentId,status)`, `(assessmentId,status)`, `submittedAt` | Available exams, attempt history, exam result lookup | Supports common filter paths; the single-column `submittedAt` index may be less useful than tenant/assessment composites for reports. |
| Notifications | `(userId,readAt,createdAt)`, `(userId,category,createdAt)`, `(userId,groupKey)`, `createdAt` | Unread list and chronological feed | Supports per-user feed access; pagination still required at scale. |
| XP | Unique `(studentId,sourceType,sourceId,ruleKey)` and `(studentId,createdAt)` | Idempotent XP ledger insertion and per-learner ledger | Database uniqueness prevents duplicate source/rule awards; totals may still aggregate a learner's ledger. |
| Books | `(organizationId,status,levelCode)`; nodes `(bookId,parentId,sortOrder)` and `(nodeType,status)` | Tenant book listing and ordered tree reads | Supports tenant/catalog and node hierarchy access. |
| Teacher notes | `(studentId,createdAt)`, `(groupId,createdAt)`, `sessionId`, `authorId` | Student and group note history | Supports scoped chronological notes. |
| Audit | `createdAt`, `(entityType,entityId)` | Recent audit history and entity timeline | Supports these reads; actor/organization-scoped audit query plan needs review. |

## Indexes added in Phase 21

**None.** This is intentional. A broad schema has existing indexes, but the number of indexes alone does not demonstrate correct selectivity or a faster query. No destructive/migrating database action was taken as part of this report.

## Candidate follow-up measurements

Before adding any index, collect query plans and latency from a separate staging PostgreSQL database under representative row counts. Inspect:

1. `User` roster joins filtered by `organizationId`, `role`, `status`, `groupId`.
2. Student dashboard aggregation by `studentId` and progress status/date.
3. Teacher roster/progress joins filtered by `(organizationId, teacherId, studentId)`.
4. Course access combining group assignments, individual assignments and level order.
5. Assessment reporting grouped by assessment/student/status and ordered by submitted time.
6. Audit queries scoped by tenant/actor plus time.
7. Notification pages using stable cursor pagination `(createdAt,id)`.

Potential composites are hypotheses only (for example, tenant plus status/time on high-volume report tables). Avoid adding them until `EXPLAIN (ANALYZE, BUFFERS)` / provider-equivalent plans and write overhead are measured.

## Caveats

- Local counts are small and are not a workload benchmark.
- SQLite plans do not predict managed PostgreSQL plans/connection behavior.
- Schema annotations do not by themselves prove the current physical database is in sync after every model change; the most recent reported `db push` occurred before this Phase 21 report, and no further push was run.
- Do not use `db:reset` (disabled). Guarded `db:push` now permits only the explicit disposable `prisma/phase21-sandbox.db` target.
