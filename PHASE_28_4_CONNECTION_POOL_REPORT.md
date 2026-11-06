# Phase 28.4 — Connection Pool Report

**Current STAGING pool status:** NOT CONFIGURED / NOT VERIFIED.

## Evidence

- No PostgreSQL server, local cluster, connection tools, active PG environment variable names, PgBouncer executable, or provider pool settings are present in the current workspace.
- The application has one module-level `PrismaClient` singleton in `src/lib/prisma.ts`; it is cached on `globalThis` outside production to survive development hot reload. Production exports one module-level instance per Node process. It does not create a client per request.
- No explicit Prisma connection limit, pool timeout, idle timeout, statement timeout, or transaction timeout was found in the app configuration. Prisma’s engine manages pooling; exact defaults depend on runtime/CPU and URL parameters and are **NOT MEASURED** here.
- Phase 28.3 used a local direct loopback PostgreSQL rehearsal, not evidence of a persistent pooler/provider pool.

| Metric | Status | Value |
|---|---|---|
| Max connections / pool size | NOT MEASURED | NOT VERIFIED |
| Idle connections | NOT MEASURED | NOT VERIFIED |
| Connect/acquire timeout | NOT MEASURED | NOT VERIFIED |
| Statement timeout | NOT MEASURED | NOT VERIFIED |
| Transaction timeout | NOT MEASURED | NOT VERIFIED |
| PgBouncer/provider pooling | NOT CONFIGURED in detected workspace | NOT VERIFIED in deployment |

## Required test

After STAGING access is restored, record Prisma/provider limits and PostgreSQL `max_connections`; run controlled request/query concurrency at 10, 25, 50, and only then 100 if headroom is proven. Record active/idle/waiting connections, latency, timeout/error rate, pool queueing and database saturation. Do not infer capacity from Phase 28.3 cold development-page timings.
