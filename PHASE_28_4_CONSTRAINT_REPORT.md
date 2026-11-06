# Phase 28.4 — Constraint Report

**Historical Phase 28.3 data-integrity evidence:** 277/277 FKs validated, zero orphans; 315 unique indexes checked, zero duplicate groups. **Current live catalog:** NOT VERIFIED.

## Business uniqueness in PostgreSQL Prisma schema

- User `employeeCode`, `username`, and optional `email`: unique; PostgreSQL permits multiple NULL email values, consistent with the optional field design.
- Student/course assignment `(studentId,courseId)`; course/group assignment `(courseId,groupId)`.
- Assignment submission `(assignmentId,studentId)`; attendance `(sessionId,studentId)`; lesson progress `(studentId,lessonId)`.
- Assessment attempt `(assessmentId,studentId,attemptNumber)`; answer `(attemptId,questionId)`.
- XP source tuple, course completion `(studentId,courseId)`, certificate `publicId`/download token, and workflow organization/idempotency key.

## Gaps to resolve/monitor

- No partial unique constraint enforcing one active ISSUED certificate per student/course; only an application precheck is present.
- Message table has no client-request idempotency key.
- FK indexes are not automatic in PostgreSQL: static mapping finds leading indexes for 208/277 FK scalar fields; actual need for the remaining fields depends on join/delete/update patterns and query plans.
- Soft deletion is modeled with fields such as `archivedAt`/`deletedAt`; `src/lib/prisma.ts` has no global Prisma extension enforcing a deleted-row predicate. Filtering is caller-by-caller.

No constraint was added or removed. Current duplicate/business constraint data and index validity are NOT VERIFIED because the target is unavailable.
