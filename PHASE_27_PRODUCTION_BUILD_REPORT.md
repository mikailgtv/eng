# Phase 27 — Production Build Report

**Date:** 2026-10-07

## Result

**Optimized production build: PASS.** The production-built Next.js 15.5.27 application generated its route output successfully after the Next 15 compatibility repairs.

The successful command ran under Node 22.23.3 with `DATABASE_URL=file:/tmp/phase27-isolated-20261007-a7f1.sqlite`, telemetry disabled, and `NODE_OPTIONS=--max-old-space-size=1400`. The build script ran `prisma generate && next build`. Build output reported compilation success in about 27.8 seconds; the full command completed in about 102 seconds. The route output included 206 page-generation work units and both static and dynamic routes.

## Earlier attempt

An initial build under the default Node heap was terminated by V8 out-of-memory during the lint/type-validation stage. Raising the Node old-space limit to 1,400 MB resolved the memory failure. That retry then exposed legacy synchronous page `params` typing; those pages and the API route context were converted to Next 15's promised context. The final build after those repairs passed.

## Build observations

- Existing ESLint warnings remain (143 reported in the full lint run); the build completed successfully.
- Next emitted a non-fatal notice that its ESLint plugin was not detected in the flat ESLint configuration.
- No production database, `prisma/dev.db`, or backup was used. Prisma schema writes were limited to the approved `/tmp` SQLite test database.
- The built artifact started successfully with `next start` using `NODE_ENV=test` and the isolated DB. Health/readiness returned 200, login rendered, protected page access redirected to login, and an unauthenticated API request returned 401. Security headers were observed.

This is a successful production **build**, plus a constrained non-production runtime smoke. It is not evidence of a production PostgreSQL deployment or production environment preflight.