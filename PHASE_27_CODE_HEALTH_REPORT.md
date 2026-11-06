# Phase 27 — Code Health Report

**Date:** 2026-10-07

## Verified checks

- `npm run typecheck` under Node 22.23.3: passed after Next 15 route-parameter updates.
- `npm run lint -- --quiet`: passed with zero errors.
- Full ESLint runs report **143 warnings**, mainly existing unused bindings and explicit `any` types, plus a small number of React hook dependency warnings. Warnings are not represented as errors or as clean/warning-free lint.
- `npm test`: all configured suites passed: session rules, book-import preview, synthetic production-env checks, server environment schema checks, and API/logging safety checks.
- `next typegen`, Prisma schema validation, standalone Tailwind/PostCSS compilation, and the production build: passed.

## Focused cleanup and architectural scans

- Fixed the `CardHeaderer` JSX typo, renamed the misleading `useTemplate` callback, removed an unused `clientId`, and corrected selected unused values found during repair.
- Safe error responses and server logging are covered by synthetic API-safety tests; no raw exception text is included in the reviewed API responses.
- Inventory at audit time: 199 API route files, zero server actions, and 87 client components. Static scan found no direct Prisma/database imports in client components.
- Client output contained 20 JS chunks. A focused scan found none of the three extracted demo fixture username/password/employee-code literals in those chunks and no `dev-demo-accounts` module marker. This is a targeted regression check, not a general secret-scanning or security certification.
- Local file storage still exists under `storage/messages` and `storage/content`; static audio remains under `public/audio`. Storage migration is explicitly deferred.

## Remaining debt

The warning backlog should be reduced incrementally without broad behavioral refactors. No fake analytics/progress data was added. No E2E suite was claimed or run, and no Phase 29 full security test was performed.