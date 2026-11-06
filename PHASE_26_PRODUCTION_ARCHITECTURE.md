# Phase 26 — Production Architecture (Target)

**Status: proposed only; no production resources exist/are verified in this workspace.** Preserve the existing Next.js LMS as a single web application. Provider and domain are intentionally not hardcoded because no account/domain/owner requirements were available.

## Target request path
`Learner/teacher/admin browser → owner-controlled DNS → HTTPS edge/CDN/WAF → existing Next.js 14 App Router app (UI + server/API) → managed PostgreSQL via Prisma → private durable object storage → optional provider adapters / independently scheduled worker`.

Cross-cutting services should be added only after provider selection and staging tests: central structured logs/error tracking/metrics, alert routing, encrypted backups/PITR, shared rate limiter/job queue if needed, and secret manager.

## Environment boundaries
| Environment | Purpose | Data/services | Promotion rule |
|---|---|---|---|
| Development | Local feature work | Explicit disposable sandbox DB; local secrets only; no production egress or account data | No protected `prisma/dev.db` seed/reset/push. No production credentials. |
| Staging | Production-like verification | Dedicated PostgreSQL database, object-store bucket, domain/certificate context and provider test accounts; only synthetic/tagged data | Deploy the exact release candidate; backup/restore first; pass auth/role, E2E, mobile, integration and performance checks. |
| Production | Real users | Separate managed PostgreSQL, private storage, unique production credentials, backup/PITR, monitoring/alerts | Manual approval after staging evidence, backup ID, migration plan, smoke tests and rollback compatibility review. |

No environment is provisioned/verified yet. Staging must not share DB, storage, worker secret, AI/email credentials, or callback endpoints with production.

## Data and service boundaries
- **Application:** continue using existing Next.js server components and Route Handlers; do not introduce a second frontend or separate API without measured need.
- **Database:** target PostgreSQL only after explicit provider choice and reviewed SQLite-to-Postgres migration rehearsal. `prisma/schema.prisma` currently targets SQLite.
- **Storage:** content media currently writes to local `storage/content/`. Replace that adapter with private object storage only after specifying ownership, retention, encryption, size/type policy, malware strategy, signed access and restore tests. Keep public curriculum/audio assets separate from learner submissions/private media.
- **Jobs:** existing workflow-worker API needs an independently scheduled, authenticated caller, durable retries/heartbeat/failed state and an alert. Do not execute it from browser requests.
- **External providers:** AI/STT/TTS/email/SMS/web-push are optional integrations. Route them through bounded timeouts, safe fallbacks, provider-specific secrets, data minimization and observable failure records.
- **Cache/rate limiting:** no distributed service is currently verified. Keep application behavior correct without cache; before multi-instance exposure use a shared atomic rate-limit/queue backend or document verified platform limits.

## Production URLs and transport
Use deployment configuration `PUBLIC_APP_URL` for canonical links; keep API calls same-origin unless there is a tested need otherwise. Domain/TLS/DNS are owner/provider changes, not code constants. Require HTTPS, Secure cookies, HTTPS redirect at the edge, and add HSTS only after certificate/domain/subdomain policy is verified. Current app headers omit CSP and HSTS pending compatibility testing.

## Decisions still required before implementation/deployment
1. Hosting provider/runtime/region and supported Node version.
2. PostgreSQL provider/region, connection pooler, PITR/backup retention, encryption and service limits.
3. Domain/DNS ownership and email sender domain; TLS certificate and redirect control.
4. Object-storage provider, privacy model, file retention and malware scanning capabilities.
5. Central log/error/metric service, on-call/alert destinations and data retention.
6. AI/speech/notification provider contracts, privacy terms, quotas and whether to enable them in production.
7. Cost/capacity requirements and operational RPO/RTO approval.

Until those are known, this target diagram is not a deployment plan with live resources and no claim of production readiness is made.