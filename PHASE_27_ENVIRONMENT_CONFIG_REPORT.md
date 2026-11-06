# Phase 27 — Environment Configuration Report

**Date:** 2026-10-07

## Configuration controls added or confirmed

- `.nvmrc` pins Node **22.23.3**; `package.json` declares Node `>=22.13.0 <23.0.0` and npm `10.8.2`.
- `src/lib/server-env.ts` validates server configuration and reports invalid **variable names only**, never values.
- `scripts/production/check-env.mjs` is a non-connecting production preflight. It requires production-grade secrets, a public HTTPS app origin, `NEXT_PUBLIC_DEMO_HINTS=false`, safe seed flags, and a non-local PostgreSQL URL. SQLite is intentionally not accepted as a production database.
- Demo fixture hints remain server-only, with existing development-only seed gates preserved. No actual environment values were displayed or placed in this report.
- `.gitignore` continues to exclude `.env*`, local storage/upload paths, `prisma/dev.db`, and backups.

## Safe test/build configuration

Every schema/build/start command that could use Prisma had `DATABASE_URL=file:/tmp/phase27-isolated-20261007-a7f1.sqlite` explicitly set. `prisma db push --skip-generate` created that previously absent disposable database and synchronized its schema. The production build and smoke server also used that explicit URL. The smoke server used synthetic session/integration secrets, `NODE_ENV=test`, and demo hints disabled; the synthetic values are not disclosed here.

The Prisma CLI reported that it loaded `.env`, but the explicitly supplied process `DATABASE_URL` took precedence for the permitted schema/build/start checks. No database credentials or other `.env` values were inspected or reproduced. Tests that did not use a database were run without a database connection.

## Validation and limits

Synthetic production-environment tests and runtime environment schema tests passed. The production preflight was not run against an actual production environment; doing so would require configuration and a PostgreSQL target outside this phase's authorization. The production-built artifact was smoke-tested in test mode because the production server validator correctly rejects SQLite. This report does not certify deploy-time secrets, PostgreSQL reachability, external integrations, or live service configuration.