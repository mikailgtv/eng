# Phase 21 — Deployment Runbook

## Current deployment status

The workspace does not prove a configured root Netlify deployment. Only `netlify-demo/netlify.toml` was found. Current `prisma/schema.prisma` uses SQLite; no reviewed migration directory exists. Do not deploy this build as production or point Netlify at `prisma/dev.db`.

## Before a staging deployment

1. Provision a dedicated staging PostgreSQL database, separate storage bucket, DNS/URL and provider accounts. Ensure production credentials are unavailable to staging.
2. Define a provider migration plan from SQLite to PostgreSQL, including type/constraint compatibility, data copy, index creation, migration/rollback strategy and an isolated rehearsal. Do not treat the schema comment as migration evidence.
3. Configure required staging values via Netlify's staging/deploy-preview secret contexts: `DATABASE_URL`, `SESSION_SECRET`, `INTEGRATION_SECRET_KEY`, `PUBLIC_APP_URL`, and optional provider variables only when integration tests are planned. Never use `NEXT_PUBLIC_` for secrets.
4. Turn demo hints and all seed/QA flags off in deployment contexts. Keep the current local database out of Netlify.
5. Review the request/response API compatibility, CSP decision, security headers, audit scope, rate limiting and allowed outbound provider domains.
6. Confirm backups and restore test on the dedicated staging DB before applying a schema/data migration.

## Candidate CI/release checks

Run against a clean checkout with dependencies installed:

```bash
npm ci
npx prisma validate
npm run typecheck
npm run build
```

The build currently runs `prisma generate && next build`; it does **not** migrate a database. The guarded `npm run db:push` accepts only `DATABASE_URL=file:./phase21-sandbox.db` plus `PHASE21_SANDBOX_CONFIRM=YES`. `npm run db:reset` is disabled. Do not bypass these guards with direct Prisma CLI commands on a shared DB.

## Staging promotion

1. Deploy to a non-production Netlify context and confirm the deploy points only at the staging DB/storage/provider accounts.
2. Run `/health` (safe public response only), then admin System Health (configuration + local DB probe).
3. Test administrator, teacher and student logins with explicitly tagged staging identities. Verify tenant isolation and unauthorized responses.
4. Verify course/level/book/lesson/practice/progress persistence across refresh and new session; exercise exam/certificate flows only with non-production fixtures.
5. Test optional AI/speech/email/push only if secrets are configured; exercise provider outage/timeouts.
6. Run a staged backup/restore and attach actual measured results; no load or mobile support claim without tests.
7. Promote only after owner approval, database backup, compatible migration and rollback plan are recorded.

## Production change safety

- Prefer a reviewed `prisma migrate deploy` chain after migrations have been created and tested. Do not use `prisma db push --force-reset`.
- Apply additive, backwards-compatible schema changes before application code that depends on them; backfill; then enforce constraints in a later step where possible.
- Deploy the application only after migration health succeeds. Fail promotion if required variables, DB connection, migration, build, smoke test or backup verification fails.
- Keep a previous immutable app deploy for code rollback. **Do not automatically roll the database backward**; reconcile or forward-fix data/schema changes.
- Store deploy ID, migration ID, backup ID/hash, smoke-test results and a support request reference.

## Rollback

1. Freeze promotion; use Netlify's previous known-good deploy after confirming its schema compatibility.
2. If the failed deploy has not changed schema, revert app only.
3. If schema/data changed, keep the app version compatible with the new schema and perform a reviewed forward fix; restore data only after impact analysis and backup verification.
4. Re-run health and authenticated smoke checks, monitor error rates, then close the incident with a timeline.

## Current gaps

No Netlify staging deploy, staging credentials, PostgreSQL migration, durable storage, protected environment verification or production rollback test was run in this audit. Those items are release blockers, not inferred from a successful local build.
