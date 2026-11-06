# Environment separation and variables

## Environment boundaries

| Environment | Target | Required controls | Current verification |
|---|---|---|---|
| Development | Local Next.js + disposable SQLite (`prisma/phase21-sandbox.db` when using `file:./phase21-sandbox.db`) | `.env.local` only; local-only secrets; opt-in seed/schema gates; never point to a shared or production database | Existing `prisma/dev.db` is present with persistent rows; it is protected and must not be used as the disposable DB. |
| Staging | Netlify preview/deploy context + a dedicated staging database, storage, and provider credentials | Configure per-context Netlify environment variables; use a separate PostgreSQL database and separate API/webhook/VAPID keys; deny prod egress where practical | Not established in this workspace. `netlify-demo/netlify.toml` is only a small demo configuration; no verified root Netlify deployment or staging database exists here. |
| Production | Future production deployment | Separate PostgreSQL, secrets manager, storage, domains, provider accounts, backups, and alerting; no demo seed flags | Not configured or tested. |

**Hard stop:** do not run `prisma db push`, `db:reset`, the general seed, or fixture scripts against a shared/staging/production target. The local SQLite file contains existing data and already received schema/seed/fixture writes during Phase 20. The backup described in the DR report is a post-change snapshot, not a pre-incident rollback point.

## Variable inventory

`.env.example` contains placeholders only. Copy it to `.env.local` for development; never commit `.env`, `.env.local`, or provider secrets. Staging/production values belong in each environment's secret store, not source control. Only `NEXT_PUBLIC_DEMO_HINTS` is intentionally browser-visible; it must remain false outside local development.

| Variable | Purpose | Required / safe default |
|---|---|---|
| `NODE_ENV` | Framework runtime mode | Next sets this; `development` locally. Never use it as the only environment-isolation control. |
| `DATABASE_URL` | Prisma database connection | Required. Local `.env.example` targets only `file:./phase21-sandbox.db` (not the existing `dev.db`). Staging/production must use separate managed PostgreSQL URLs after provider migration and validation. |
| `PUBLIC_APP_URL` | Public base URL for certificates/links | Set to the environment's canonical HTTPS URL; local example uses localhost. |
| `BASE`, `BASE_URL` | Base origin for legacy/manual smoke scripts only | Optional; defaults to localhost. Not used as the web app's trusted origin or as an app deployment setting. |
| `NETLIFY`, `CONTEXT` | Platform-injected deploy metadata used by DB-writer guards | Do not set manually; scripts refuse production/deployment contexts. They are not secrets. |
| `SESSION_SECRET` | HS256 session/MFA signing and identity crypto | Required, unique random 32+ characters per environment; rotate only with a session invalidation plan. |
| `INTEGRATION_SECRET_KEY` | Encrypts integration credentials | Use a distinct 32-byte random key. Development fallback to `SESSION_SECRET` exists; production must set this independently. |
| `NEXT_PUBLIC_DEMO_HINTS` | Login page demo hint toggle | Public build-time value; `false` in staging and production. |
| `ORG_TIMEZONE` | Fallback time zone for date-based plans and rules | Optional; valid IANA name, defaults to UTC. Prefer organization-scoped settings where available. |
| `AI_API_KEY` | Server-side AI tutor provider credential | Optional; keep out of `NEXT_PUBLIC_*`; empty disables external provider. |
| `AI_BASE_URL` | AI-compatible API endpoint | Optional; defaults to the configured vendor endpoint. Restrict to trusted HTTPS hosts. |
| `AI_MODEL` | AI model selection | Optional; defaults in provider code. Verify availability/cost in the target account. |
| `AI_CONTENT_PROVIDER` | Content drafting mode | Optional; use `none` unless a vetted provider is configured. |
| `AI_CONTENT_WEBHOOK_URL` | Server-side content-drafting webhook | Optional; HTTPS endpoint controlled by the organization; apply outbound allowlisting/timeouts. |
| `STT_API_KEY`, `STT_BASE_URL` | Server-side speech recognition | Optional; empty leaves non-AI/typed fallback. Use trusted HTTPS endpoint and provider-specific consent/legal settings. |
| `TTS_API_KEY`, `TTS_BASE_URL` | Server-side speech synthesis | Optional; empty leaves available fallback. Use trusted HTTPS endpoint. |
| `EMAIL_PROVIDER` | Email adapter selector | `none` by default; webhook adapter only when explicitly configured. |
| `EMAIL_WEBHOOK_URL` | Email delivery webhook | Optional secret endpoint; do not log query strings or authorization data. |
| `SMS_PROVIDER` | SMS adapter selector | `none` by default. |
| `SMS_WEBHOOK_URL` | SMS delivery webhook | Optional trusted HTTPS endpoint. |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` | Web push signing | Optional pair; private key stays server-side and differs per environment. |
| `WORKFLOW_WORKER_SECRET` | Authenticates the internal workflow-worker endpoint | Optional; set only with a trusted scheduler, store server-side, rotate independently, and monitor worker heartbeat. |
| `PHASE21_SANDBOX_CONFIRM` | Explicit one-shot gate for schema/data scripts | Set to `YES` only together with `DATABASE_URL=file:./phase21-sandbox.db`; never store as a deployment secret or leave set. |
| `ALLOW_DEMO_SEED` | Legacy seed override in production | Must never be set in staging/production. Do not use to bypass safeguards. |
| `PHASE20_SEED_CONFIRM` | Explicit Phase 20 content-seed confirmation | One-off local development guard only; unset in deploy environments. |
| `PHASE20_QA_SEED_CONFIRM` | Explicit Phase 20 fixture confirmation | One-off isolated test database guard only; unset in deploy environments. |

Additional runtime names found in repository scripts: `BASE` and `BASE_URL` are optional base URLs used only by legacy/manual testing scripts under `scripts/testing`; they default to localhost and are not application configuration. `NETLIFY` and `CONTEXT` are platform-provided deployment metadata read by DB-writer safety guards; do not set them manually. They are commented/documented in `.env.example` where appropriate.

## Deployment checklist

1. Create independent DBs and credentials for development, staging, and production.
2. Set provider-specific variables in Netlify's corresponding deploy contexts; never reuse production credentials in deploy previews.
3. Make the Prisma provider/migration strategy explicit before moving from SQLite to PostgreSQL. The schema comment describes portability, but the actual provider in `prisma/schema.prisma` is SQLite and the repo has no reviewed migration chain.
4. Configure durable object storage before enabling file uploads; no external storage provider is currently wired.
5. Validate required variables at startup/deploy. The current app validates `SESSION_SECRET` when signing/verifying sessions but does not yet have a comprehensive environment schema.
6. Disable demo hints, demo seeds, test fixtures, and all demo accounts in production; do not infer that a separate deployment exists from a local `.env` file.
7. After deployment, verify `/health`, authenticated role journeys, database persistence, and secrets separation using non-production test accounts.
