# PHASE 28.1R — Application Database Test

**Date:** 2026-10-07 (Asia/Tehran)  
**Environment:** Temporary local PostgreSQL staging only; loopback-only. No production endpoint.

## Direct Prisma checks

Generated Prisma Client 5.22.0 from `prisma/schema.postgresql.prisma`. Against the staged PostgreSQL database:

- Connect: passed.
- Read: passed (model count query and user count query).
- Create, update, read-back, delete: passed in a transaction using one uniquely named synthetic `ContentTag` probe.
- Post-transaction table count equaled pre-test count; no probe residue remained.

## Next.js application smoke checks

Started Next.js 15.5.27 with Node 22.23.3 and the temporary PostgreSQL connection. Requests were read-only:

| Route | Result |
|---|---|
| `/health` | HTTP 200; `healthy` |
| `/ready` | HTTP 200; database `SELECT 1` succeeded |
| `/login` | HTTP 200 |
| `/admin` without session | HTTP 307 redirect to login |
| `/dashboard` without session | HTTP 307 redirect to login |
| `/api/admin/users` without session | HTTP 401 |

No valid user credentials were available or requested. Successful authenticated login, session renewal/logout, and privileged page/API behavior are therefore **not verified**. No login was attempted and no source user password/hash was examined.

## Repository checks

- `npm run typecheck`: passed.
- `npm test`: passed (session rules, book-import preview, production environment, server environment, API safety; test output confirms the relevant unit tests were synthetic/write-free).
- `npm run lint`: exited successfully with 0 errors and 140 existing warnings; no lint cleanup was in scope.

All app and DB tests used disposable local staging and synthetic test-only values; the Next.js server, PostgreSQL instance, and data directory were stopped/deleted after the tests.
