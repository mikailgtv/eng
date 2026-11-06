# Phase 21 — Cache Strategy

**Decision:** do not introduce a shared response/data cache yet. The application serves personalized learner/teacher/admin data and no measured latency baseline or production cache backend exists. Correctness and tenant isolation take priority over speculative cache gains.

## Observed behavior

- Next.js App Router server pages and APIs were emitted as dynamic (`ƒ`) in the successful production build; personalized content is not intentionally statically cached.
- `getSessionUser` uses React `cache` for per-request memoization only. It revalidates role/status/session against the database.
- Prisma uses a singleton in development (`src/lib/prisma.ts`); this is not a distributed connection pool or data cache.
- No Redis, CDN cache configuration, cache-tag invalidation service or shared cache was found.
- `/health` uses `Cache-Control: no-store`; sensitive pages/API responses should stay uncached unless explicit privacy-aware headers are added.

## Cache policy matrix

| Data | Policy | Reason / invalidation |
|---|---|---|
| Session user and permissions | Request-scoped memoization only | Role, account state, tenant and revocation changes must take effect immediately. Never persistently cache authorization decisions. |
| Student progress, XP, streak, certificates, answers, submissions | No shared cache | Read-after-write correctness; private per-student data. If needed, use short request-local memoization only. |
| Teacher notes, attendance, roster access | No shared cache | Sensitive data and access may change by group/organization. |
| Course/lesson/catalog metadata | Candidate for later cache | Cache only published public metadata, keyed by tenant + level + version. Invalidate on content publish, archive, tenant override or policy change. Do not cache access decisions. |
| Book tree | Candidate for later cache | Key by book ID + version + tenant; invalidate on node edits, mapping changes and workflow state transitions. Keep drafts private. |
| Static public assets | CDN/browser cache with versioned filenames | No learner state; use immutable caching only for content-hashed assets. |
| Organization policies/levels | Request cache initially | Must invalidate immediately after policy changes; avoid cross-tenant key mistakes. |
| Health | `no-store` | Public endpoint should reflect a fresh bounded DB probe. |
| AI/speech provider output | Do not cache by default | Privacy, variable response, cost and consent concerns; cache only reviewed non-personal reference data. |

## Safe future implementation

1. Measure database query time and page/API latency on staging first.
2. Add version fields or reliable publish/version IDs for immutable curriculum/book snapshots.
3. Use tenant-inclusive keys and test cross-tenant cache isolation.
4. Publish invalidation events from course/book/policy changes. Avoid time-only invalidation for permissions.
5. Limit cache TTLs, memory, and per-key fan-out. Prefer Redis/managed cache only when supported by the actual runtime.
6. Add tests proving a changed role, organization, assignment, preview grant, note or progress row is not served stale.

## Not implemented

No Redis or persistent cache was added, no user-specific API is cached, and no performance gain is claimed. The absence of a configured shared cache is a production scalability item, not a blocker for this local audit build.
