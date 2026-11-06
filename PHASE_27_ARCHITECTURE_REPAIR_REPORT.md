# Phase 27 — Production Architecture Repair Report

**Date:** 2026-10-07  
**Outcome:** Ready for the separately approved database-migration phase; not a production deployment approval.

## Scope and safety boundary

Phase 27 repaired the existing EnglishBridge LMS without replacing it or adding future-phase features. No production service was contacted. No production database, `prisma/dev.db`, or database backup was used or modified. The only schema write was an explicitly approved disposable SQLite database at `/tmp/phase27-isolated-20261007-a7f1.sqlite`; it was created from a confirmed-absent path and contains schema only.

## Repairs completed

- Upgraded the framework to Next.js 15.5.27 while retaining React/React DOM 18.3.1 and Prisma/Prisma Client 5.22.0.
- Adapted server pages to asynchronous Next 15 `params`/`searchParams`, retained asynchronous `cookies()` handling, and normalized route parameters at the API wrapper boundary.
- Added server-side environment validation and a production preflight that fails closed unless production requirements are met; SQLite is explicitly rejected for production.
- Added safe API error mapping and server-side diagnostics; removed raw exception details from the reviewed API paths and genericized browser error notices.
- Moved demo-account hints into a server-only module, retained existing development-only seed gates, and removed the fake default webhook endpoint and password-bearing seed logs.
- Repaired detected source issues, including the `CardHeaderer` JSX typo and unused/misnamed integration-page values.
- Added real ESLint, typecheck, test, database-validation, and production-environment scripts. No unsupported E2E or migration script was added.

## Evidence

- `npm ci` under Node 22.23.3 completed; install audit reported zero vulnerabilities.
- `next typegen`, `npm run typecheck`, `npm test`, `npm run lint -- --quiet`, and `npm run db:validate` passed.
- A real optimized production build passed with the explicit isolated SQLite URL and a bounded 1,400 MB Node heap.
- The built artifact started successfully in test mode against the isolated database. `/health` and `/ready` returned 200, `/login` rendered, unauthenticated `/admin` redirected to login, and unauthenticated `/api/users` returned 401.
- Standard security headers were present on the login response.

## Remaining boundary

The runtime smoke used `NODE_ENV=test`, not a production configuration: the production environment contract requires PostgreSQL and refuses SQLite. No live production-config validation or PostgreSQL migration was attempted. ESLint remains successful with 143 warnings; see the Code Health Report. Phase 28 owns migration execution; Phases 29 and 30 remain deferred.