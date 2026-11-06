# Phase 21 — Performance Report

**Status:** local compile/bundle observations only. No response-time/load/device benchmark was executed.

## Measurements available

The final Phase 21 workspace build completed on Next.js 14.2.35. It reported shared first-load JavaScript of **87.3 kB** and a student home route first-load estimate of **101 kB**; the route segment itself was 5.34 kB. Teacher routes ranged around 90–105 kB first-load in that build output; `/admin/system-health` is 87.5 kB first-load. These are build analyzer estimates, not transferred gzip/Brotli sizes, real browser performance, or mobile CPU measurements. One TypeScript run without an explicit heap limit terminated with V8 out-of-memory; rerunning `npm run typecheck` with `NODE_OPTIONS=--max-old-space-size=2048` passed. CI should provision adequate memory and cap parallelism. In this workspace, a full build attempt timed out with a memory-heavy Next worker; setting `experimental.cpus: 1` and a 1.5 GB Node heap produced a successful final build in about 83 seconds. This is a build-resource measurement only, not runtime performance. A final post-change build must be run.

Observed source bundle dependencies are limited to Next/React, Tailwind, lucide-react, Prisma server code, zod, jose, bcryptjs, pdf-lib and QR code tooling. No bundle analyzer, unused-image/font report or duplicate-dependency review was completed. `next/image`/responsive image optimization was not audited comprehensively.

## High-frequency query paths and existing support

- Student home / learning path: assigned course and level query plus per-student `LessonProgress` reads; schema has level/status, assignment, module/lesson order and student/status indexes.
- Lesson view: lesson/module/course lookups, progress and prerequisites/release gates; lesson and progress foreign-key indexes exist.
- Practice and exam history: activity attempts and assessment attempts have student/activity/assessment/status/time indexes and uniqueness constraints.
- Notifications: user/read/time and user/category/time indexes.
- Teacher roster and reporting: group/user/teacher/organization indexes exist, but real query plans, pagination and tenant-scale performance were not measured.

See `PHASE_21_DATABASE_INDEX_REPORT.md` for existing indexes and measurement plan.

## Tests not run

- No baseline p50/p95/p99 API or page latency.
- No 100-student/10-teacher, 500/50 or 1,000/100 scenario.
- No CPU, memory, cold-start, DB pool, query latency, failure rate or connection saturation measurements.
- No Android Chrome, Samsung Internet, iPhone Safari, low-end device, reduced network or Lighthouse test.
- No failure-injection or concurrent exam/lesson-submit test.

## Recommendations (not claims of delivered performance)

1. On isolated staging, capture browser traces for login, student home/path/lesson/activity, teacher roster and report flows at representative low-end mobile and desktop profiles.
2. Collect request IDs and server duration/database span metrics; report percentiles and errors alongside workload/DB size.
3. Add cursor pagination to feeds/reports where datasets can grow; do not fetch whole organization datasets to compute dashboards.
4. Profile actual SQL plans before adding indexes; avoid stale caching of private state.
5. Measure largest assets and fonts; preserve the firefighter leopard identity while using appropriate responsive/compressed formats and reduced-motion behavior.
6. Load-test only isolated staging with synthetic, clearly tagged users and an agreed stop/cleanup plan.

**Scalability statement:** capacity at any of the requested concurrency/record scenarios is **unknown and unclaimed**.
