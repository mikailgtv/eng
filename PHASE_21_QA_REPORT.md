# Phase 21 — QA Report

**Final status:** **BLOCKED**

## Verified passes

| Check | Result | Evidence / scope |
|---|---|---|
| Prisma schema validation | PASS | `npx prisma validate`; no DB write. |
| Prisma Client generation | PASS | `npx prisma generate`; generated client only, no schema push. |
| TypeScript | PASS | `NODE_OPTIONS=--max-old-space-size=2048 npm run typecheck`. A run without an explicit heap cap terminated with V8 OOM; rerun passed. |
| Production build | PASS (final constrained run) | `NODE_OPTIONS=--max-old-space-size=1536 npm run build`; Next 14.2.35 compiled and generated 223 pages/routes after limiting build workers to one. This proves compilation, not live staging. |
| Local SQLite integrity | PASS | Current DB and post-change snapshot: `PRAGMA integrity_check=ok`, zero `foreign_key_check` violations, 213 tables. Read-only checks. |
| Backup restore / DB client | PASS (local only) | `scripts/ops/verify-sqlite-backup.py ... --prisma --app-health`: temp restore row counts match; Prisma reads users 87, courses 4, lessons 39, progress 5. Temporary directory and server deleted. |
| App liveness after local restore | PASS (narrow) | Next production server pointed at temporary restored copy; `/health` returned HTTP 200 `{"status":"healthy"}`. |
| Anonymous API gate | PASS (narrow) | Unauthenticated `GET /api/books` returned 401 `HTTP_401` and an `x-request-id` on the restored local copy. This does not test an authenticated role matrix. |
| Security response headers | PASS (narrow) | Restored-app `/health` response had `nosniff`, `strict-origin-when-cross-origin`, and `SAMEORIGIN` headers. No CSP/HSTS claim. |
| Phase 20 fixture/access checks | PASS (local fixture script, limited) | Earlier `scripts/testing/verify-phase20.ts` verified four labeled demo learner course levels/progress/XP, explicit higher-level preview, and a temporary cross-tenant denial; it cleaned its temporary assignment/org/course rows. Not a deployed test. |
| Backup integrity | PASS (snapshot only) | SQLite integrity/FK checks and file-level restore passed. Snapshot is unencrypted, post-change, local, and not a pre-incident backup. |
| Environment/DB writer safety | PASS (refusal tests) | `db:reset` refused; `db:push` refused `DATABASE_URL=file:./dev.db` even with the explicit confirmation. No schema/data writer was allowed to proceed and no DB was written in Phase 21. |

## Findings / failures

- `npm audit`: **7 vulnerabilities total (6 high, 1 critical)**. `npm audit --omit=dev`: **2 vulnerabilities (1 high, 1 critical)**. Next.js is a direct critical item in the audit output; automatic remediation proposes major framework/Tailwind upgrades and must be tested deliberately.
- A fresh `npm ci --ignore-scripts` initially left Prisma Client ungenerated, so typecheck failed with missing Prisma exports; `npx prisma generate` corrected this without touching a DB. A typecheck process without `NODE_OPTIONS` also OOMed; with 2 GB it passed. One later build attempt spawned a memory-heavy Next worker and timed out; limiting `experimental.cpus` to one and rerunning with a 1.5 GB heap passed.
- The first restore harness attempt used the wrong table name for progress; the harness was corrected to `student_lesson_progress` and the complete restore test passed afterward.
- Critical Phase 20 data-safety incident remains unresolved: the curriculum seed, schema push and QA fixture writer wrote to the existing local DB before target isolation was established. Four tagged demo learners received fixture progress/XP. A later access test also temporarily upserted/deleted Mei's B1 assignment and created/deleted a synthetic organization/level/course; it did not establish that no inactive assignment existed before the upsert, so an inactive row may have been replaced and removed. The snapshot is post-change; no restoration/rollback was performed. Only explicitly created test rows were cleaned by the harness.

## Not run / not proven

- Staging or production deployment, staging/production DB isolation, Netlify deploy, credential separation, or external storage.
- Admin/teacher/student login with valid credentials; MFA, logout/session revocation, password reset, persistence across browser restart or new device.
- Comprehensive RBAC/IDOR/tenant matrix, including student A/B private data, teacher A/B groups, platform admin scope, certificates, messages and exports.
- Full Books/course/lesson/practice/quiz/exam/progress/XP/streak/achievement/certificate/notification/teacher override/mascot test after Phase 21 changes.
- Concurrency/idempotency/failure-injection tests for lesson completion, exam submission, XP, certificates, notifications, automation or webhooks.
- Full staging recovery simulation including authenticated student, teacher, exam, certificate and notification flows.
- Android Chrome, Samsung Internet, iPhone Safari, responsive device regression, poor-network/offline behavior, accessibility or reduced-motion review.
- Requested 100/500/1,000-student workload tests; performance capacity is unknown.
- External AI/speech/email/SMS availability, timeouts, fallback and cost tests.
- Full security scan/penetration test, distributed rate-limit behavior, CSP/XSS review, all 199 API handlers, or complete upload/storage review.

## Exit decision

Build and local restore/liveness checks pass, but these are necessary not sufficient. Critical dependency vulnerabilities, absent verified staging separation, missing managed encrypted backup/retention, no complete identity/authorization testing, and unproven transaction/idempotency guarantees prevent production readiness.
