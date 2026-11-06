# Phase 20 — QA Report

## Passes
- Prisma schema validated and client generated; current Phase 21 TypeScript check and Next production build pass.
- Read-only checks on local `prisma/dev.db`: SQLite integrity `ok`; 0 FK violations; selected counts 87 users, 1 organization, 5 groups, 7 levels, 4 courses, 1 Book, 39 lessons, 77 learning profiles, 23 XP rows, 647 audit rows.
- Narrow Phase 20 fixture/access script passed expected levels/course visibility and tagged progress/XP for 4 demo learners; explicit higher-level preview grant toggled access; synthetic cross-organization level/course grant was denied and temporary test rows cleaned up.
- Local restore harness copied backup to a temporary SQLite DB, validated integrity/FKs/table counts, checked Prisma reads, started built Next app against the restored copy, and verified `/health` 200 plus unauthenticated `/api/books` 401 with request ID. Temp app/DB were deleted on exit.

## Failures / incidents
- **Critical data-safety failure:** Phase 20 curriculum seed, Prisma schema push and QA fixture writer wrote into the configured existing local SQLite DB before isolation was established. Four named `@demo.example` student fixture records reported progress/XP writes. A later access test temporarily upserted/deleted Mei's B1 assignment and created/deleted a synthetic organization/level/course; it did not establish that no inactive assignment existed before the upsert, so a prior inactive row may have been replaced and removed. Do not treat this as a production or staging test.
- No pre-write backup or affected-row baseline was verified at the time. The later backup is post-change; no restoration/rollback was performed, while explicitly created temporary test rows were cleaned by the harness.
- A Prisma restore harness initially used an incorrect table name and failed; it was corrected, then the final temporary restore test passed.
- `npm audit` currently reports 6 high and 1 critical overall (1 high and 1 critical among production dependencies).

## Not run
No full authenticated student/teacher/admin journey, comprehensive tenant/RBAC matrix, device/browser, persistence-after-new-session, staging or Netlify deploy test, large load test, failure injection, exercise-to-exam/certificate path or external service test. Unit/automation workflows and mascot reaction event persistence are not end-to-end verified.

## Release decision
**Phase 20 is not certified as production-ready.** Code and narrow local tests exist, but the database target/isolation incident and untested staging/access criteria remain open. Current Phase 21 safety guard now only permits DB writers against a dedicated disposable `prisma/phase21-sandbox.db`; no further DB writes were performed during this report generation.
