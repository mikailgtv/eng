# Phase 21 — Architecture & Reliability Audit

**Audit date:** 2026-10-05 (workspace date)
**Disposition:** **BLOCKED — not production-ready.** This is a code/workspace audit, not a deployed-environment certification. No confirmed Netlify staging project, separate staging database, production database, or production credentials were available for inspection.

## Executive summary

The application is a substantial, single Next.js web LMS with a broad existing feature set and a Prisma relational model. It should be hardened in place; there is no evidence supporting a rewrite. After Phase 21 workspace changes, `npx prisma validate`, `npm run typecheck` (with an explicit Node heap cap), and `npm run build` passed. A temporary restored-copy app health check and anonymous API response check also passed. This does not prove authenticated authorization correctness, staging behavior, external integrations, load capacity, transaction safety, or full disaster recovery.

**Critical data-safety incident:** the existing configured local SQLite database at `prisma/dev.db` was modified by a Phase 20 additive curriculum seed, a Prisma schema push, and a tagged QA fixture writer. The QA writer reported writes for four `@demo.example` learners. A subsequent Phase 20 access-verification script also temporarily upserted/deleted a learner-to-course assignment and created/deleted a synthetic organization, level and course. It did not first prove there was no pre-existing inactive assignment for the learner/course pair; a previously inactive row could have been replaced and removed. The configured target was not verified as an isolated test database before those writes. No restoration/rollback was performed. A post-change snapshot now exists at `backups/phase20-local-dev-db-post-change-20261005.sqlite`; it is not a pre-change recovery point. See the audit and backup report for exact effects and limitations.

## Current architecture (observed)

| Layer | Observed implementation |
|---|---|
| Web UI | Next.js 14 App Router, React 18, TypeScript, Tailwind utility classes; student, teacher and admin route groups. Responsive web only; no separate native app was found. |
| Server/API | Next.js route handlers and server-rendered pages; 199 `route.ts` API handlers counted in `src/app/api`. Shared API plumbing in `src/lib/api.ts`; domain services under `src/lib`. This is not a separately deployed backend. |
| Auth | `jose` HS256 JWT in `HttpOnly`, `SameSite=Lax` cookie; `Secure` in production. `src/middleware.ts` is a coarse first gate. `src/lib/auth.ts` rechecks user status, password-version, session row/revocation/expiry and support session against the database. |
| Authorization | Role checks in middleware, page guards and `requireApiUser`; tenant/group enforcement is implemented across domain services but a complete endpoint-by-endpoint IDOR/tenant audit has not been performed. |
| ORM/data | Prisma 5.22 schema with **SQLite provider** in `prisma/schema.prisma`; local URL resolves to `/home/user/prisma/dev.db`. PostgreSQL is only described as a future target in comments. No checked-in migration directory/chain was found. |
| Database shape | Live local file reported 213 SQLite tables, 87 users, 1 organization, 5 groups, 7 levels, 4 courses, 1 book, 39 lessons, 77 student learning profiles, 23 XP transactions and 647 audit rows. These are local snapshot counts, not production metrics. |
| Deployment | `next.config.mjs`; only `netlify-demo/netlify.toml` exists in the workspace. No verified root Netlify app deployment, staging DB, durable storage, or production target was found. |
| Assets/storage | No external object-storage adapter or durable upload service was found. Some schema metadata refers to media/attachments, but a storage backup/restore path is not wired or verified. |
| Jobs | Persisted workflow/event/run models and an internal workflow worker endpoint exist; email/notification/adaptive side effects also run from application code. A real scheduler, worker heartbeat, dead-letter monitoring and retry observability have not been verified. |
| AI/speech | Optional server-side AI, STT and TTS adapters read environment variables; browser/typed fallbacks exist in parts of the flows. External provider credentials/availability are not verified here. |
| Cache/rate limit | Prisma singleton is reused in development; request-level `React.cache` is used for session lookup. No distributed cache/rate-limit service was found. Several rate limits are in-memory maps and therefore per-process/per-instance. |
| Monitoring | Server logs and audit models exist, and API wrapper returns a generic error. No durable central log sink, request correlation across middleware/providers, uptime/error-rate dashboard or alert policy is confirmed. Phase 21 adds request IDs to wrapped API responses and a basic health surface; this is not a full observability stack. |

## Reliability and security risks

### Critical
1. **Environment/data isolation is not established.** `.env` points to local SQLite, but earlier seed/schema/fixture commands wrote to it before isolation was verified. Never target it with another seed, reset, rollback or push. A verified post-change backup is not a restore point for the pre-change state.
2. **No production-grade migration chain.** The working schema provider is SQLite and there is no reviewed migration history. A production PostgreSQL target cannot be declared equivalent or migrated safely by a provider-string change alone.
3. **No verified staging recovery.** File backup verification passes locally; there is no Netlify staging restore simulation or staged authentication/recovery check.

### High
- `db:reset` previously invoked `prisma db push --force-reset` and the general seed directly. Phase 21 now disables that package command and gates schema/data scripts to an explicit disposable `prisma/phase21-sandbox.db` target. Do not run any writer in this task against `dev.db`.
- The general `prisma/seed.ts` performs upserts that can replace password hashes and identity fields for known usernames. The direct seed is now sandbox-gated; the production `ALLOW_DEMO_SEED` exception remains a dangerous legacy switch and must not be set.
- Rate-limit maps are in-memory and cannot reliably limit across serverless instances or restarts; use an external atomic store before public production exposure.
- Critical multi-record operations (lesson completion plus XP/streak/achievement/event effects; exam submission; certificate issuance) need transaction/idempotency review per workflow. Existing unique constraints help in places, but end-to-end atomicity was not proven.
- File storage is not durable/configured; backups currently cover SQLite only.
- Netlify staging, secrets contexts, DB/network separation and deployment/rollback policy were not verifiable.

### Medium
- API handlers use a shared legacy `{data}`/`{error: string}` response convention; this Phase 21 change is additive (`success`, `errorCode`, `requestId`) to avoid breaking existing clients. Handwritten routes may still differ.
- UI route error/loading boundaries exist, but important data pages have not all been audited for explicit recoverable error/retry states. A root `global-error.tsx` was added in addition to `error.tsx`.
- Feature toggles are spread across feature settings; a global `ON/OFF/STAGING_ONLY` registry and environment promotion policy were not found.
- API route collection during Next build emitted `DYNAMIC_SERVER_USAGE` diagnostics for cookie-dependent handlers; build completed, but route mode/build logging should be reviewed.
- No measured production-like latency, stress, mobile-device, cold-start, connection-pool or memory profile exists.

## Current bottlenecks / single points of failure

1. One database is the authoritative store; a single local SQLite file has no managed HA, point-in-time recovery or off-host redundancy.
2. API, frontend and backend are in one Next.js deployment; database/provider availability gates most personalized pages.
3. Optional AI/STT/TTS/notification services have no verified health probe or fallback test in the target environment.
4. In-process retry/rate-limit state is lost at restart and inconsistent across instances.
5. Background workflow execution depends on a scheduler/worker that has no verified heartbeat in this workspace.
6. No verified durable object store or file backup chain.

## Changes made in Phase 21 (workspace only)

- Added an allowlisted disposable DB gate to the main and Phase 20 seed/push scripts; `db:reset` is disabled. Scripts refuse production/deployment contexts and any target other than `prisma/phase21-sandbox.db`.
- Added safe-placeholder `.env.example` and environment setup documentation.
- Added `/health` (minimal public response) and an admin-only System Health page. Diagnostics expose configuration status, not secrets; external services are not contacted.
- Added basic security headers (nosniff, referrer policy, same-origin framing, permissions policy) without an untested restrictive CSP.
- Added API request IDs/error codes while retaining legacy client-facing error text and `data` payload structure.
- Added a root-level recovery error boundary.
- Created a post-change local SQLite backup and a repeatable temporary-file restore-verification script.

## Recommended next actions

1. Keep all further DB writes paused. Obtain owner confirmation of the local database's intended provenance and identify/compare a verified pre-incident backup before any cleanup.
2. Establish separate staging PostgreSQL and object storage; design, review and test forward migrations on a disposable copy before switching providers.
3. Create an endpoint authorization matrix and run tenant/IDOR tests with independent org fixtures on isolated staging.
4. Make lesson/Xp/streak/achievement, exam submission and certificate issuance transaction/idempotency guarantees explicit and prove them with retry/failure tests.
5. Replace in-memory rate limits with shared atomic storage; persist worker heartbeats and retry/dead-letter records; centralize structured logs/metrics.
6. Perform mobile browser, load, failover and full staging recovery tests; record actual measurements and service-specific RPO/RTO.

## Audit limits

This audit did not inspect live Netlify configuration/secrets, third-party dashboards, remote storage, production network policies, every API mutation, all UI error paths, all database orphans beyond SQLite FK checks, or a production-like deployment. These are unverified—not presumed safe.
