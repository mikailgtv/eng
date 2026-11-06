# Phase 27 — Framework Upgrade Report

**Date:** 2026-10-07

## Selected versions

- Next.js: 14.2.35 → **15.5.27**
- React / React DOM: **18.3.1 retained**
- Prisma / Prisma Client: **5.22.0 retained**
- Tailwind CSS and `@tailwindcss/postcss`: **4.3.3**
- PostCSS: **8.5.29**
- TypeScript: **5.9.3**
- Node: **22.23.3** (`.nvmrc`; npm 10.8.2 declared)

## Compatibility work

Next 15 requires asynchronous request APIs and route context. The LMS's dynamic server pages now await promised `params` and `searchParams`; the client invitation/reset pages unwrap promised route parameters with React `use`. Existing `cookies()` use is asynchronous. The `apiRoute` wrapper now accepts Next's promised route context and resolves it before invoking existing route handlers. Generated route types were refreshed using `next typegen`.

Tailwind's v4 PostCSS setup replaced the v3 plugin configuration and was separately compiled successfully. The real ESLint configuration and package scripts were added without introducing an end-to-end framework or changing the product architecture.

## Validation

- `next typegen`: passed.
- Node 22.23.3 typecheck: passed after route-context conversion.
- Production `next build`: passed, including route type validation and generation of static/dynamic route output.
- Production-built server start and smoke routes: passed in `NODE_ENV=test` with the authorized isolated SQLite database; this is not a production-environment deployment test.

The first build attempt using the runtime's default heap stopped with an out-of-memory error during lint/type validation. The successful build used `NODE_OPTIONS=--max-old-space-size=1400` and `experimental.cpus: 1` already present in the project configuration. Build warnings, including existing lint debt and a notice that the Next ESLint plugin was not detected, remain non-fatal and are documented in the Code Health and Production Build Reports.