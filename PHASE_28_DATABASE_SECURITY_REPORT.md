# Phase 28 — Database Security Report

**Audit date:** 2026-10-07

## Repository/environment evidence

- `.gitignore` excludes `.env*`, SQLite DB/backup paths, and local backup directories. Only `.env` variable **names** were reviewed; values were not read or disclosed.
- The local `.env` name inventory contained `DATABASE_URL`, `NEXT_PUBLIC_DEMO_HINTS`, and `SESSION_SECRET`. Presence/validity of PostgreSQL, TLS, pooling, migration, backup, and production credentials is **UNKNOWN / NOT VERIFIED**.
- Production preflight code requires a non-local PostgreSQL URL, public HTTPS app origin, minimum-length server secrets, demo hints disabled, and disallows demo seeding in production. The preflight was not run against a real production target.
- Prisma is a dev-global singleton and process singleton in production (`src/lib/prisma.ts`). No `DIRECT_URL`/migration URL split, explicit pool limit, or per-role connection configuration was found.
- No PostgreSQL network, firewall, TLS, service identity, role privileges, or connection logs were available for review. No target credentials were used.
- Demo seed/QA writers call a guard that refuses deployment contexts and allowlists only a confirmed disposable SQLite sandbox path. Demo fixture source exists; actual DB contents are unverified. A separate production reference-data seed plan was not found. Preserve the deny-by-default behavior and do not enable demo fixtures in production.
- A source inventory found 171 files importing the shared Prisma singleton and 177 files containing Prisma model access across the 577 TypeScript source files. Shared query helpers exist, but access is broadly distributed rather than isolated behind one repository layer; this is relevant to instrumenting query count/latency and testing provider behavior.

## Required staging/production security controls

- Require TLS with certificate validation and restrict network ingress to application/migration/backup hosts; do not expose the database publicly.
- Use a least-privilege runtime role for normal reads/writes. Use a distinct migration owner/admin role only for deploy jobs and a separate backup role with minimum required privileges, where supported. Keep secrets in the host secret manager, not the repository or chat.
- Decide whether the host supplies PgBouncer/managed pooling. Configure Prisma runtime URLs, connection limits, timeouts, and direct migration URL to match actual hosting and concurrent instances; do not guess values.
- Verify backup encryption, access logging, retention, restore permissions, and credential rotation.
- Test that all seed/demo commands refuse production and that no fake learner/teacher/progress/certificate data can be created by production workflows.

## Status

**BLOCKED / NOT VERIFIED.** No PostgreSQL target or role is configured/confirmed in this phase, and no actual production network/security settings can be inspected. No credentials or database connections were attempted.