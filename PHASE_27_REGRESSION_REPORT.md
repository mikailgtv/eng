# Phase 27 — Regression Report

**Date:** 2026-10-07

## Passed

- Node 22.23.3 TypeScript typecheck after `next typegen`.
- All configured `npm test` suites: session rules, book import preview, synthetic production environment, runtime environment schema, and API/error-log safety.
- ESLint quiet run: zero errors; warning backlog remains (143 warnings in full lint output).
- Prisma schema validation and Tailwind v4/PostCSS standalone compilation.
- Optimized Next.js 15.5.27 production build using the approved isolated SQLite URL.
- Runtime smoke of the production-built artifact in `NODE_ENV=test`: `/health` 200 and healthy; `/ready` 200; `/login` 200 and rendered; `/admin` 307 to login without a session; `/api/users` 401 without a session.
- Login response included `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: SAMEORIGIN`, and the configured Permissions Policy.
- Focused client-bundle check found no extracted demo fixture literals or server-only demo module marker in the emitted JS chunks.

## Failures corrected before the final pass

The first optimized build attempt exceeded the default Node heap. A later build identified synchronous route props incompatible with Next 15. The heap was bounded at 1,400 MB for the final build, and page/API contexts were updated to promised props. The final build and subsequent typecheck passed.

## Not tested / deferred

No production database, production service, external AI/speech/email/SMS endpoint, SMTP delivery, E2E browser suite, PostgreSQL migration, restore rehearsal, or full penetration/security assessment was exercised. Those omissions are intentional scope boundaries, not passing results.