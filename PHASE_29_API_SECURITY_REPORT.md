# Phase 29 — API Security Report

**Runtime API requests:** NOT TESTED. `apiRoute` provides common safe error mapping/request IDs but does not itself require auth; route-level guard is necessary. Complete route/method inventory is in `PHASE_29_ROUTE_AUTHORIZATION_MATRIX.md`.

## Static findings

- 201 API route files / 258 exported handlers inventoried; route auth annotations are heuristics, not proof. Several custom flows use API keys, HMAC or worker bearer tokens. Middleware matcher covers selected route prefixes; handlers must remain self-protecting on every endpoint.
- Safe centralized error handler masks unexpected exception detail and logs only error type/requestId. Some custom routes bypass it or return helper error text; HTTP response testing not performed. No raw env/database credential output scan was shown by this phase; runtime logs/bundles unavailable.
- Input handling: Zod is used extensively; some routes cast raw JSON (`as`) and service-level validation varies. `POST /api/roles` uses unvalidated object shape and accepts target/scope fields; see CRITICAL RBAC findings.
- CORS headers are not configured in app config; default same-origin browser behavior expected, actual responses/proxy CORS NOT VERIFIED.
- `next.config.mjs` sets X-Content-Type-Options, Referrer-Policy, X-Frame-Options, Permissions-Policy. No CSP/HSTS configured there; HSTS may be reverse-proxy managed but is NOT VERIFIED.
- Open redirect: examined login middleware redirects to encoded pathname and clear-session targets fixed `/login`; no user-supplied external redirect observed in those paths. Full route runtime probes NOT RUN.
- No general rate limit middleware found.
