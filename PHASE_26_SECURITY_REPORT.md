# Phase 26 — Production Security Report

**Status: BLOCKED. No penetration test, production environment, or complete authorization certification was performed.**

## Positive controls observed
- Custom HS256 session token uses `HttpOnly`, `SameSite=Lax`, `Secure` in production; auth revalidates user/session state against DB. Passwords use bcryptjs hashes. Password/reset and identity operations have rate-limit hooks.
- Server-side role/group/organization checks are distributed across guards and domain services; teacher-only notes use a private visibility field.
- `assertSameOrigin` exists on many mutation routes; existing API wrapper returns request IDs and safe generic errors.
- `next.config.mjs` emits nosniff, referrer policy, frame and permissions headers and disables `X-Powered-By`.
- DB/seed safety scripts refuse deployment contexts and only allow an explicit disposable SQLite target. Phase 26 did not use protected DB or secrets.
- New `.gitignore` patterns exclude `.env.*` (except `.env.example`) and local `storage/`/`uploads/` paths. New production preflight rejects SQLite/local DB URLs, non-HTTPS app URL, short session secret, demo hints not explicitly false, enabled demo-seed flag, and secret-like public env names; it prints names only.
- Certificate link origin in production now requires valid HTTPS `PUBLIC_APP_URL` and ignores caller-controlled forwarded Host headers; local fallback remains development-only.

## Findings / release risks
1. **Critical — dependency supply chain:** current `npm audit` reports 1 critical + 6 high. Direct Next.js finding is in an affected version range; direct Tailwind 3 and transitive PostCSS/tooling findings remain. Audit's suggested fixes include major framework/CSS changes. No upgrade made; a reviewed fix and regression suite are required.
2. **Critical — environment/data separation:** no verified separate staging/prod DB, provider secret stores, domain contexts or deploy privileges. Current Prisma target is SQLite; existing local DB has a prior data-safety incident and cannot be used as a test target.
3. **High — migrations:** no versioned Prisma migration history; `db push` is not a production migration strategy. SQLite-to-Postgres semantics are untested.
4. **High — tenant/IDOR:** Phase 21 report records no complete endpoint authorization matrix; no Phase 26 role/tenant integration tests were run.
5. **High — storage:** content media uses local filesystem writes; no durable private object store, signed URLs, malware scan or backup/restore chain. Content media route denies students; production media-access policy requires review.
6. **High — uploads/audio:** file type/extension/magic checks and max-size setting exist, but there is no malware scanning, interrupted-upload test, end-to-end large-file/security test, or proven private object ACL. Speech providers receive audio payloads; size/privacy/provider controls were not tested.
7. **High — observability/jobs/rate limits:** in-memory limiters are not cross-instance; worker endpoint lacks verified scheduler heartbeat/alerting; no centralized error tracking/alerting. Phase21 lists incomplete mutation atomicity/idempotency and route-wide CSRF audit.
8. **Medium — headers/transport:** CSP/HSTS and actual HTTP→HTTPS redirect/TLS certificate are not verified; SameSite/Origin policies require endpoint-wide validation.
9. **Medium — environment leak prevention:** `.env.*` pattern was tightened locally, but repository hosting/Git remote/protection rules were unavailable; do not assume existing history is clean. Secret scanning must run on actual Git history/CI.

## Auth/recovery status
- Current auth code uses `SESSION_SECRET`, a 7-day signed cookie and DB session records; reset/revocation flows exist in source. No actual production login/logout/password reset/session expiration/multidevice test was executed.
- `scripts/production/check-env.mjs` is configuration-only; it does not connect, verify secret provenance, or confirm Staging/Production values.
- No provider-owned MFA requirement, WAF, backup access separation, external penetration test or incident tabletop is evidenced.

**Go-live gate:** patch critical/high findings; provision isolated environments; complete route/tenant/IDOR matrix; verify actual transport/secret scopes; establish file/database protection; and run staging auth, concurrency and recovery tests. Do not advertise security certification based on static analysis.