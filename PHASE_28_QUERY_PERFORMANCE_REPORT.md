# Phase 28 — Query Performance Report

**Audit date:** 2026-10-07

## Baseline status

- PostgreSQL connection latency: **UNKNOWN / NOT MEASURED**.
- Login, student dashboard, lesson, progress, teacher-class, homework, exam-submission query latency: **UNKNOWN / NOT MEASURED**.
- Query plans, row estimates, actual rows, buffers, locks, and N+1 rates: **UNKNOWN / NOT MEASURED**.
- No PostgreSQL target was contacted and no production or local database was queried. No realistic sanitized staging dataset was available.

## Static query review

Repository paths show data access spread across `src/lib` query/service modules and API/page handlers, with a shared Prisma singleton and query helpers. A static source inventory found 171 of 577 TypeScript files import the shared Prisma module and 177 contain Prisma model access; this is broad data-access distribution rather than a single repository boundary. Repeated query families include student lesson progress, assessment attempts/answers, teacher group dashboards (attendance, results, submissions), notifications, audit logs, certificates, and gamification. Existing schema indexes cover several compound filters (see Index Optimization Report).

Static code review cannot establish N+1 frequency or performance impact without execution and realistic row counts. Some loops in gamification/certificate/workflow services perform repeated writes/reads; they are candidates for query-count measurement, not asserted production bottlenecks. No broad include/select refactor was attempted.

## Required staging benchmark

After PostgreSQL staging is approved and seeded with sanitized representative data, record database/service/region, pool settings, p50/p95/p99, query count, plan, buffers, and concurrency for login, dashboard, lesson/progress, teacher-class, assignment review, and exam submission. Compare before/after only where a valid baseline can be gathered without exposing real learner data. Tune indexes and query shape from actual plans, then rerun workflow regression.