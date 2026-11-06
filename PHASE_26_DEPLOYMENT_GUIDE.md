# Phase 26 — Deployment Guide (Controlled, Not Yet Executed)

**Deployment status:** no verified root hosting project, staging environment, production environment, production domain, or remote deploy permission. `netlify-demo/netlify.toml` is a demo-site config, not proof that the LMS is deployed. Do not point it at the protected local SQLite file.

## Current commands and limitations
- `npm ci` installs locked dependencies; `postinstall` runs Prisma generation unless `--ignore-scripts` is used.
- `npm run build` runs `prisma generate && next build`.
- `npm start` runs `next start`.
- `npm run typecheck` checks TypeScript.
- `npm run production:check-env` is a Phase 26 non-network/non-DB preflight. It requires production Node env, a non-local PostgreSQL URL, HTTPS `PUBLIC_APP_URL`, a 32+ character `SESSION_SECRET`, `NEXT_PUBLIC_DEMO_HINTS=false`, and no demo-seed override. It prints variable names only, never values.
- DB scripts are guarded for disposable local SQLite; no production migration command exists yet.
- `next.config.mjs` currently ignores ESLint during the build. There is no CI workflow or lint script in the workspace; TypeScript and tests must be explicit pipeline steps.

## Environment preparation (operator-owned secret stores)
Create independent Development, Staging and Production contexts. Store values only in the selected platform secret manager. Never paste secret values into Git, reports, frontend `NEXT_PUBLIC_*`, issue trackers or shell logs. Inventory names in `PHASE_26_CURRENT_ARCHITECTURE.md`; configure only providers approved for that environment. Keep all demo seed flags off in Staging/Production.

## Release pipeline to implement after platform choice
1. Pull-request checks: `npm ci`, Prisma generate, `npm run typecheck`, `npm run test:session-rules`, `npm run test:book-import-preview`, schema validation and security scan.
2. Build the exact immutable artifact once; record commit/build ID. Do not build with a real production DB credential in untrusted pull requests.
3. Deploy artifact to Staging with staging-only secrets and database. Apply only reviewed, versioned migrations.
4. Run readiness/health, auth/role matrix, critical learner/teacher/admin smoke, notification/AI fallback, file/audio permissions and performance checks.
5. Record backup and restore-test evidence, migration ID, smoke output, security sign-off and rollback plan.
6. Require human Production approval. Take verified final backup; apply expand-compatible migration; deploy artifact; check `/ready`, `/health`, authenticated smoke journeys and telemetry before opening traffic.
7. Observe at 15 minutes, 30 minutes, 1 hour, 6 hours and 24 hours. Stop promotion and roll back app/forward-fix schema if critical symptoms occur.

## DNS checklist (provider records intentionally left as placeholders)
- **A/AAAA or CNAME:** publish only the record type and exact target supplied by the chosen hosting provider for the selected hostname; do not guess an IP or proxy mode.
- **TXT:** add provider domain-verification records and, if sending email from the domain, the provider's SPF/DKIM/DMARC records after sender ownership is confirmed.
- **MX:** configure only if the organization is hosting inbound mailboxes on this domain; the LMS web app alone does not require an MX record.
- Validate DNS propagation, certificate issuance, canonical host, `www`/apex redirect, HTTP→HTTPS redirect and HSTS policy before launch. Never hardcode a real domain in source.

## Required provider configuration (not yet available)
- Canonical HTTPS domain and DNS/TLS/redirect behavior.
- Runtime compatible with Node and Next route handlers (not static-only hosting).
- Staging and production PostgreSQL URLs/pooler limits.
- Durable private object storage and access policy.
- Secure worker scheduler caller with `WORKFLOW_WORKER_SECRET`.
- Error/log/metric/uptime endpoints and alert destination.
- Provider-specific AI, speech, email, SMS and web-push credentials only if approved.

## Hard stop
Do not run an app build or deployment against `prisma/dev.db`; the build can evaluate server routes/pages. Do not run `prisma db push`, reset, seed, or data migration against any shared DB. No deployment, domain, TLS, DNS or live provider configuration was performed in Phase 26.