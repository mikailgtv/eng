# Phase 26 — Current Architecture & Production Readiness Audit

**Created before any Phase 26 implementation changes.** Audit boundary: checked-in workspace and prior Phase 21 audit/report only. No hosting account, DNS zone, cloud provider console, production database, secret manager, email provider, storage console, or external monitoring dashboard was accessible. No credentials were requested or exposed. This is not a production deployment verification.

## Executive finding
This is an existing full-stack LMS that should be productionized in place. The application is a single Next.js web app; route handlers and server components implement the backend/API. The current Prisma datasource is **SQLite**, and the repository does not contain a Prisma migrations directory. The only deployment manifest found is under `netlify-demo/`; no root production hosting configuration or confirmed live deployment was found. Do not treat the demo site as the LMS production deployment.

**Current production disposition: not verified / not ready.** No real production domain, hosting target, separate staging/production DB, automated backup, point-in-time recovery, CI/CD pipeline, durable object storage, central monitoring, or error-tracking service was confirmed.

## Stack detection (observed, not inferred)
| Layer | Observed implementation | Production status |
|---|---|---|
| Web framework | Next.js 14 App Router; package range `^14.2.5`; React 18; TypeScript | One full-stack codebase; no separate SPA or backend service found. Resolved version recorded in Phase 21 report as 14.2.35; current sandbox lockfile install/audit still reports an affected Next range. |
| Runtime | Node.js app; current workspace shell observed Node 20.20.2 | Actual production Node runtime/provider is unknown. |
| Package manager | npm; `package-lock.json`; scripts in `package.json` | No verified remote build pipeline. |
| UI | React Server Components/client components, Tailwind CSS 3, lucide-react | Existing responsive web UX; no native app. |
| Backend/API | Next.js Route Handlers under `src/app/api/**` plus server-side domain services under `src/lib/**` | Colocated with frontend; no standalone API deployment. |
| Database/ORM | Prisma 5.22; `prisma/schema.prisma` datasource provider is SQLite, `DATABASE_URL` | PostgreSQL appears only as a future schema comment/README suggestion. No production PostgreSQL connection was inspected. |
| Migration strategy | Guarded `prisma db push` script; `db:reset` refuses; no `prisma/migrations/` directory or checked-in migration chain found | Not suitable for controlled production evolution as-is. No migration applied in this phase. |
| Authentication | Custom `jose` HS256 JWT in `HttpOnly`, `SameSite=Lax` cookie; Secure in production; server revalidates DB user/session state; bcryptjs password hashes | No external identity provider configured/verified. Secret name is `SESSION_SECRET`; no value recorded in this report. |
| Authorization | Role checks in middleware/page/API guards plus domain-specific group/organization checks | Phase 21 security report says full route-by-route tenant/IDOR audit is incomplete. |
| Hosting/deployment | `netlify-demo/netlify.toml` exists; no root Netlify config, Dockerfile, Vercel/Fly/Render/Railway config, or `.github/workflows` found | Actual deployment and deploy history unknown. No live domain was established. |
| Static assets | `public/` includes image and audio assets (including bundled MP3s) | Public assets deploy with Next app. No asset CDN configuration verified. |
| User/content uploads | `src/lib/content/media.ts` writes to local `storage/content/`; API uses file type/size/magic checks and metadata rows. Workspace also has an `uploads/` directory. | No durable external object-storage adapter, malware scanning, private signed-URL store, or production persistence/backup guarantee verified. Local filesystem may be ephemeral on serverless hosts. |
| Notifications/email/SMS | Database notifications and provider/webhook adapters; optional email/SMS/web-push settings | No provider credentials, delivery dashboard, deliverability test, retry/dead-letter policy, or real target environment verified. |
| AI/speech | Optional server-side AI, STT, TTS and voice providers configured through server environment | Credentials, provider availability, quotas, data-processing terms and production fallbacks are unknown. |
| Background jobs | Workflow models/services plus `src/app/api/internal/workflow-worker/route.ts` and `WORKFLOW_WORKER_SECRET` | No scheduler, worker deployment, heartbeat, retry/dead-letter monitoring, or production cron verified. |
| Cache/rate limits | Prisma singleton and request-scoped React cache; several in-memory rate-limit maps | No shared cache/atomic rate-limit provider observed. In-memory state does not provide cross-instance guarantees. |
| Logging/audit | `AuditLog`, server logs, API error wrapper/request IDs documented in Phase 21 | No confirmed durable structured log sink, error tracker, metrics, tracing, alerting, or retention policy. Request IDs are not proven end-to-end across all routes/providers. |
| Health | Public `/health` calls system health, returns only `healthy`/`unavailable`; admin System Health has component diagnostics without secrets | No separate `/ready` endpoint, external uptime probe or operational alert tested. `/health` runs a database query. |
| Security headers | `next.config.mjs`: nosniff, referrer policy, same-origin frame policy, permissions policy; powered-by header disabled | No CSP or HSTS configured/tested; HTTP→HTTPS redirect/certificate are hosting/DNS properties and unverified. |

## Environment variable inventory (names only; values intentionally suppressed)
Observed code/environment names include:
- **Core/session:** `DATABASE_URL`, `SESSION_SECRET`, `PUBLIC_APP_URL`, `BASE_URL`, `ORG_TIMEZONE`, `NODE_ENV`.
- **AI/content generation:** `AI_API_KEY`, `AI_BASE_URL`, `AI_CONTENT_PROVIDER`, `AI_CONTENT_WEBHOOK_URL`, `AI_MODEL`.
- **Speech/audio:** `STT_API_KEY`, `STT_BASE_URL`, `TTS_API_KEY`, `TTS_BASE_URL`.
- **Email/SMS/web push:** `EMAIL_PROVIDER`, `EMAIL_WEBHOOK_URL`, `SMS_PROVIDER`, `SMS_WEBHOOK_URL`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`.
- **Integrations/worker:** `INTEGRATION_SECRET_KEY`, `WORKFLOW_WORKER_SECRET`.
- **Demo/safety/runtime flags:** `NEXT_PUBLIC_DEMO_HINTS`, `ALLOW_DEMO_SEED`, `PHASE20_QA_SEED_CONFIRM`, `PHASE20_SEED_CONFIRM`, `PHASE21_SANDBOX_CONFIRM`, plus hosting/runtime names `NETLIFY`, `CONTEXT`.

At the initial audit, `.env` was ignored by `.gitignore` and `.env.example` contained placeholders, but generic `.env.*` variants were not covered. A Phase 26 follow-up tightened ignore patterns; see the addendum below. There is no evidence of separate staging and production secret stores. **Never copy real values into reports, frontend `NEXT_PUBLIC_*` variables, source, or Git.**

## Existing production safeguards and constraints
- `scripts/db/guarded-dev-db.mjs` refuses schema/data operations in production/Netlify production and only permits explicitly confirmed `prisma/phase21-sandbox.db`; `db:reset` is disabled.
- `prisma/dev.db` is protected. Earlier Phase 20 writes occurred before isolation was confirmed; available backup is post-change only and not a pre-incident recovery point. No Phase 26 DB access/write/seed/restore was performed.
- Existing Phase 21 report records the backup as unencrypted and containing user records/password hashes; it must not be committed or shared.
- Existing Phase 21 reports document no verified production host, staging PostgreSQL, off-host object storage, scheduler heartbeat, distributed rate limiter, or production restore drill.
- Phase 25 added checks for real session lesson/attendance completion but remains E2E blocked; Phase 23 placement/import/demo gaps also remain and are outside a production readiness pass.

## Production flow recommendation (not yet deployed)
`Real users → configurable HTTPS domain/DNS → existing Next.js app/API runtime → separately managed PostgreSQL production database → private durable object storage → independently scheduled worker/provider integrations`, with environment-specific secret management, central logs/metrics/error tracking, automated encrypted backup/PITR, staging restore tests, and controlled CI/CD promotions. Exact provider choices cannot be certified without owner/provider access, cost/capacity requirements, and testing; no provider is assumed or hardcoded here.

## Audit limits
No remote host/config/DNS/TLS/secrets/provider dashboard was inspected; no actual production build/deploy, auth smoke test, database connection, backup, restore, load test, mobile-device test, endpoint security matrix, or external service probe was run. Absence of evidence is reported as unverified, not inferred to be healthy. This document is the initial Phase 26 architecture deliverable and was created before any Phase 26 code/config change.

## Post-audit Phase 26 workspace delta
After this baseline was saved: `.gitignore` was extended to exclude `.env.*` except `.env.example`, plus local `storage/` and `uploads/`; `scripts/production/check-env.mjs` was added as a non-network/non-DB production config preflight; and `src/app/ready/route.ts` was added as a generic DB readiness endpoint. Typecheck, Prisma validation, two pure tests, and synthetic positive/negative preflight checks passed. None provisions or verifies a production resource.