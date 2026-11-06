# Phase 21 — Security Hardening Report

**Status:** partial hardening only; a comprehensive security certification is not possible from the local workspace.

## Positive controls observed

- Auth uses signed JWTs in `HttpOnly`, `SameSite=Lax` cookies and `Secure` cookies when `NODE_ENV=production`; server requests revalidate user status, password version, session revocation/expiry and session version against the DB (`src/lib/auth.ts`).
- Middleware is documented as a first gate; server page/API guards remain authoritative.
- API wrapper maps validation and common Prisma errors to safe user messages and generic 500 responses; secret/stack disclosure was not observed in its client response path.
- Login uses bcrypt verification, a generic bad-credential message and a rate limiter; security events/login attempts are stored. Password-reset and identity operations have rate-limit calls in reviewed routes.
- Cross-origin protection helper exists (`assertSameOrigin`); its use still needs endpoint-wide verification.
- External integration webhooks have a URL/SSRF validation and retry/circuit-breaker path in the integration subsystem (not all provider paths were audited).
- Role/tenant-specific services exist for Phase 20 learner/catalog/Book features; Phase 20 verification exercised level/course access and one cross-organization denial on a temporary local fixture. This is not a full IDOR proof.
- No application upload endpoint or durable object storage adapter was identified in the route/file scan; media features must not be assumed to have safe production upload storage.

## Phase 21 changes

1. Added baseline response headers in `next.config.mjs`: `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: SAMEORIGIN`, and `Permissions-Policy` denying camera/geolocation while allowing microphone only from same origin. No restrictive CSP was enabled without testing inline/app behavior.
2. Wrapped API responses now carry `x-request-id`; errors include additive `success:false`, `errorCode`, and `requestId` fields while preserving the legacy `error` string and `fieldErrors`. Logs avoid recording request bodies, passwords, tokens, raw exceptions and database error text.
3. Added an admin-only System Health page and a public `/health` endpoint with a minimal status response. Optional services are not contacted from a public health check.
4. Added `global-error.tsx` with retry/home recovery and an opaque digest reference only.
5. Added safe environment placeholders, backup ignore rules and strict disposable-sandbox gates to package DB/seed commands; `db:reset` now refuses to run.

## High/critical risks remaining

| Severity | Finding | Exact area | Required fix |
|---|---|---|---|
| CRITICAL | Existing local DB was modified by demo seed, schema push and named fixture writes before target isolation was verified. | `prisma/dev.db`, `prisma/phase20-demo-curriculum.ts`, `prisma/phase20-qa-fixtures.ts`, prior direct Prisma CLI commands | Preserve current and earlier snapshots; identify source-of-truth/pre-incident snapshot; owner-reviewed diff/reconciliation before any cleanup. |
| HIGH | Shared-secret or provider isolation cannot be confirmed for an actual staging/production host; no root Netlify project/settings were inspected. | deployment/secret manager | Create separate contexts/accounts and verify at runtime; staging must not reach production DB/provider credentials. |
| HIGH | Several limiters use in-memory maps; serverless instances bypass shared quotas and lose counters on restart. | `src/lib/rate-limit.ts`, `src/lib/identity/security.ts`, `src/lib/content/access.ts`, integration auth | Move to a shared atomic limiter (Redis/managed equivalent) with trusted-proxy IP extraction and `Retry-After`. |
| HIGH | A complete route-by-route tenant/IDOR authorization audit has not been run. 199 API route files exist. | `src/app/api/**`, services | Build an actor/resource/tenant matrix; test student A/B and teacher/org A/B across progress, notes, answers, certificates, messages, exports and admin endpoints. |
| HIGH | No uniform proof that critical lesson/XP/streak/achievement, exam/score/analytics and certificate/audit operations commit atomically or resist concurrent retry. | learning/gamification/assessment/certificate services | Transaction and idempotency integration tests using concurrent retry and injected failure; add keys/constraints only after schema rehearsal. |
| HIGH | Local backup is unencrypted and contains user records/password hashes; not suitable for external storage. | `backups/phase20-local-dev-db-post-change-20261005.sqlite` | Keep local permissions/ignore, do not commit/share; implement encrypted managed backups with external key management. |
| CRITICAL | `npm audit` reports a direct Next.js vulnerability, with advisories covering denial-of-service and other app-router/middleware surfaces in the affected range. | `next` resolved to 14.2.35 under `package.json` `^14.2.5` | Plan and test a framework upgrade to a currently patched release; it is a major-version change according to npm audit and must be regression-tested. Do not use blind `--force`. |
| HIGH | `npm audit` reports 6 high and 1 critical overall; production dependency audit reports 1 high and 1 critical. Other packages include PostCSS and Tailwind/tooling transitive chains; automatic fixes request major Tailwind/Next changes. | lockfile/dependencies | Review advisory reachability, update in a dedicated tested dependency change, rerun build and app regression tests. |
| MEDIUM | No CSP, HSTS or Permissions-Policy test against deployed HTTPS/app integrations. HSTS is intentionally not set globally in local config. | `next.config.mjs`, hosting headers | Add CSP in report-only first; configure HSTS at verified HTTPS edge after domain validation. |
| MEDIUM | `assertSameOrigin` permits requests without an Origin header for non-browser clients; all mutation routes need an explicit policy. | `src/lib/api.ts` and hand-coded handlers | Require auth/API credentials for no-Origin clients and audit SameSite/CSRF behavior endpoint by endpoint. |
| MEDIUM | Public API/middleware response envelopes and request-ID behavior are not yet uniform across all hand-coded handlers. | 199 API routes, `src/middleware.ts` | Migrate gradually with client compatibility tests; add request IDs at edge and metrics. |

## Tests not performed

No external penetration test; no full CSRF/XSS/SSRF/file-upload review; no brute-force or rate-limit distributed test; no production dependency SCA rerun; no organization-wide authorization matrix; no MFA/session-revocation full test; no credential leak/failure injection; no test against a live Netlify context. Do not claim these are passed.
