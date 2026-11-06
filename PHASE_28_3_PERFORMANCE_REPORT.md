# Phase 28.3 — Performance Smoke Report

**Test mode:** Next.js development server; timings include cold route compilation and must not be treated as production latency/SLO measurements.

## Observed response timings

| Request | Status | Elapsed |
|---|---:|---:|
| `/health` (cold) | 200 | 3.54 s |
| `/ready` | 200 | 0.59 s |
| STUDENT login (cold) | 200 | 1.55 s |
| TEACHER / ADMIN login | 200 | 0.21 / 0.48 s |
| `/student` (cold compile) | 200 | 10.92 s |
| `/student/assignments` | 200 | 0.71 s |
| `/student/exams` | 200 | 0.92 s |
| `/teacher` | 200 | 2.37 s |
| `/teacher/classes` | 200 | 0.92 s |
| `/teacher/courses` | 200 | 1.62 s |
| `/teacher/assignments` | 200 | 2.71 s |
| `/admin` | 200 | 5.78 s |
| `/admin/users` | 200 | 2.22 s |
| Warm `GET /api/users` | 200 | about 0.10 s |
| `/teacher/attendance` | eventual 200 | 144.3 s server-side; harness timed out at 120 s |

The attendance page cold compilation is an unresolved performance qualification; confirm with a production build and realistic load test before any Production cutover. No production performance claim is made.
