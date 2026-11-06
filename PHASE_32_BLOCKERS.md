# PHASE 32 — Blockers

**Date:** 2026-10-25

Two blockers stop a staging deploy. Neither is a code vulnerability, and neither is hidden by the phase status.

## B1 — CRITICAL — Migration workflow is unusable (P3019)

- **Evidence:** `npx prisma migrate status` → `P3019: The datasource provider "sqlite" specified in your schema does not match the one specified in the migration_lock.toml, "postgresql"`.
- **Effect:** `migrate dev`, `migrate deploy` and `migrate status` all fail. No `_prisma_migrations` table exists in `prisma/dev.db`, so no migration has ever been recorded as applied.
- **Why it was not "fixed" here:** both possible edits are destructive to someone's environment — changing the lock to `sqlite` abandons the PostgreSQL baseline and any deployment that applied it; changing the schema provider to `postgresql` would point the app at a database that does not exist. `prisma db push` is forbidden by project rule.
- **Owner decision required:** choose the target provider, rebuild one baseline, then `migrate resolve --applied` where appropriate.

## B2 — CRITICAL — Real database is missing the Phase 30 + Phase 32 columns (P2022)

- **Evidence:** scalar drift audit over 213 models → only `content_media` (10 columns) and `message_attachments` (8 columns) are missing. Reproduced at runtime: `P2022 … main.content_media.originalName does not exist`.
- **Effect:** every content-media and message-attachment read/write throws against the real database. File and audio download/upload are broken until the columns exist, even though the code is correct.
- **Why it was not "fixed" here:** the source DB is read-only by instruction, and B1 prevents applying the migrations. The migrations themselves are proven safe on a disposable copy.
- **Fix when unblocked:** apply `20261010000000_phase30_storage_metadata` and `20261010000001_phase32_tenant_isolation`, then re-run the live suite.

## B3 — HIGH — PostgreSQL staging does not exist

- **Effect:** all cross-tenant results are SQLite-only. `migrate deploy`, PG constraints/index behaviour, PG restore drills and the recovery target validation have **not** been exercised on PG.
- **Not done:** no paid service, no account, no instance was provisioned.

## B4 — HIGH — No object storage (S3) configured

- **Effect:** local filesystem only. Signed-URL scope/lifetime, bucket ACLs, SSE, object listing and cross-tenant isolation of a real bucket are **NOT TESTED**. Local disk on this host is not durable production storage.
- **Mitigation applied:** the tenant boundary was tested against the local adapter with synthetic files in two tenants (D16–D19), which validates the *authorization* path, not the *provider*.

## B5 — MEDIUM — No CSP, no HSTS

- **Evidence:** live response headers contain `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, `Permissions-Policy` — and no `Content-Security-Policy` or `Strict-Transport-Security`.
- **Effect:** no injection mitigation beyond framework defaults; no downgrade protection. Best set at the hosting edge, which does not exist for staging yet.

## B6 — MEDIUM — Rate limiting is process-local

- **Effect:** login/MFA limits reset on restart and do not aggregate across instances. Acceptable for single-instance staging only.

## B7 — MEDIUM — No scheduled backups or alerting

- **Effect:** backups are manual; no failure alert is delivered. Placeholders exist (`BACKUP_SCHEDULE`, `BACKUP_ALERT_*`) but nothing runs them.

## B8 — MEDIUM — Typecheck/build was broken before this phase

- **Evidence:** `npm run typecheck` previously failed on `messages.ts:301` (syntax) plus 5 latent type errors that the syntax error masked: `storage/service.ts` audit entity typing (2), and `src/lib/storage/__tests__/storage.test.ts` importing `vitest`, which is not a dependency (3).
- **Fixed:** syntax error repaired, audit entity type narrowed, orphaned `__tests__` excluded in `tsconfig.json`. `npm run typecheck` now exits clean. **`next build` was not run end-to-end** (213-model build, no deployment target) — so the full production build remains **NOT TESTED**.

## Not blockers (closed)

- Critical cross-tenant IDOR on user profiles, classes, exams, courses, bulk operations, user creation and NULL-tenant files — all fixed and verified live (50/50).
- Role self-escalation, SUPER_ADMIN assignment by non-super-admins, backup endpoints exposed to teacher/learner — all denied live.
- Application compile failure — fixed; typecheck clean.
