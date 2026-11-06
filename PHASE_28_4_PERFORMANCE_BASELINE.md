# Phase 28.4 — Performance Baseline

**Formal Phase 28.4 baseline:** NOT MEASURED. The PostgreSQL endpoint and application server are unavailable. Historical Phase 28.3 data below is a single development-server observation, not an official baseline; timings include Next.js compilation. Database query time and rows scanned are NOT MEASURED.

| Operation | Historical Phase 28.3 HTTP observation | p50 | p95 | p99 | DB query time |
|---|---:|---|---|---|---|
| Login (student/teacher/admin) | 1.55 / 0.21 / 0.48 s | NOT MEASURED | NOT MEASURED | NOT MEASURED | NOT MEASURED |
| Student dashboard | 10.92 s | NOT MEASURED | NOT MEASURED | NOT MEASURED | NOT MEASURED |
| Teacher dashboard | 2.37 s | NOT MEASURED | NOT MEASURED | NOT MEASURED | NOT MEASURED |
| Admin dashboard | 5.78 s | NOT MEASURED | NOT MEASURED | NOT MEASURED | NOT MEASURED |
| Course page | NOT MEASURED | NOT MEASURED | NOT MEASURED | NOT MEASURED | NOT MEASURED |
| Lesson page | NOT MEASURED | NOT MEASURED | NOT MEASURED | NOT MEASURED | NOT MEASURED |
| Assignment list | 0.71 s | NOT MEASURED | NOT MEASURED | NOT MEASURED | NOT MEASURED |
| Submission list | NOT MEASURED | NOT MEASURED | NOT MEASURED | NOT MEASURED | NOT MEASURED |
| Exam page | 0.92 s (student exams) | NOT MEASURED | NOT MEASURED | NOT MEASURED | NOT MEASURED |
| Progress page | 1.14 s | NOT MEASURED | NOT MEASURED | NOT MEASURED | NOT MEASURED |
| Attendance page | server eventually returned 200 in 144.3 s; test client timed out at 120 s | NOT MEASURED | NOT MEASURED | NOT MEASURED | NOT MEASURED |
| Notifications/messages/reports | NOT MEASURED | NOT MEASURED | NOT MEASURED | NOT MEASURED | NOT MEASURED |

No p95/p99 can be derived from one sample. All displayed values are historical dev-mode total response time; no Phase 28.4 connection saturation test, pool measurement or `EXPLAIN ANALYZE` was run. Establish a production-mode STAGING baseline with repeated warm/cold samples and correlated Prisma query timing before claiming a performance pass.
