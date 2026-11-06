# Phase 29 — QA Report

## Environment and safety gate

- Current DB scheme: SQLite-file only; PostgreSQL STAGING NOT CONFIGURED in active workspace (configuration values withheld).
- Current STAGING backup: NOT CONFIGURED / NOT VERIFIED per Phase 28.4 backup report.
- Therefore no users/tenants/test rows were created; no writes, destructive requests, role changes, file uploads, examination tampering, or database verification were performed.
- No Production access or activity. SQLite source remains read-only; not used for PostgreSQL substitute tests.
- Node 20.20.2 does not satisfy package engine `>=22.13.0 <23`; `node_modules` and generated Prisma client absent.

## Checks actually performed

- Static inventory: 199 API route files, 245 exported HTTP method handlers, 110 app pages and 15 public assets (reports generated from source paths).
- Reviewed auth/session/permission helpers, organization/service flows, representative exam, file, certificate, messaging, AI/voice, webhook and upload paths.
- Static searches for unsafe DOM sinks, command-execution APIs, raw SQL and explicit auth signals. No runtime attack requests were made.
- Lockfile advisory audit: 0 known advisories returned at audit time.

## Test matrix

| Test family | Performed | Result | Reason / status |
|---|---:|---|---|
| Login/brute force/MFA | 0 dynamic | NOT TESTED | No staging accounts/target |
| IDOR/RBAC/privilege escalation | 0 dynamic | NOT TESTED; CRITICAL candidates found statically | No staging/backup |
| Cross-tenant access | 0 dynamic | NOT TESTED; source scope defects | No tenant fixtures |
| CSRF/XSS/SQLi | 0 dynamic | NOT TESTED | No staging/browser |
| Upload/download/path traversal | 0 dynamic | NOT TESTED | Backup gate unmet |
| AI/voice/exam/certificate | 0 dynamic | NOT TESTED | No target/test accounts |
| Headers/CORS | 0 response inspections | NOT TESTED | No staging host |
| Dependencies | 1 lockfile audit | 0 advisories reported | Lockfile only; runtime image still unverified |

**Acceptance:** FAIL / unmet. This Phase 29 status is blocked by critical source-level authorization risks plus unavailable STAGING, not a “paper PASS.”
