# Phase 28.4 — N+1 Query Report

**Review type:** static code review; query-count tracing and live execution are NOT VERIFIED.

## Confirmed N+1-shaped patterns

1. `src/app/(app)/teacher/groups/page.tsx` and `teacher/reports/page.tsx` call `groupSnapshot` once per group (`Promise.all(groups.map(...))`). `groupSnapshot` performs a group/include read, a member read, progress aggregation/read(s), and a next-session query. Cost grows with group count; parallelization does not remove database round trips.
2. `src/lib/certificates/reports.ts` loads students, then course assignments per student, then evaluates each student/course pair. This is a nested N+1 pattern for exports.
3. `studentCertificateHome` in `src/lib/certificates/service.ts` loops assigned courses and evaluates/persists each one. Its call to `expireDueCertificates` performs an unbounded due-certificate read followed by per-certificate updates, audit calls and notifications.
4. `sendToGroup` sends per-student messages serially; it is a fan-out workload rather than a SQL N+1, but request duration and partial delivery scale with group size.

## What was not established

The student, teacher and admin dashboard pages also call helper functions, but without query logs/Prisma instrumentation and a live target the total SQL count, repeated key pattern and real latency are NOT MEASURED. No broad claim that all LMS pages are N+1-free is made.

## Recommendation

Batch group snapshots by `groupId IN (...)`, aggregate progress by group/student in bounded queries, bulk-load certificate evaluation inputs, and move certificate expiry to an idempotent scheduled job. Add Prisma query instrumentation with parameter redaction and test query count against representative synthetic staging data before changing code.
