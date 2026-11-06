# PHASE 18 QA REPORT

**Date:** 2026-10-03  
**Implementation status:** Foundation verified; production vendor integration sign-off is not complete.  
**Test script:** `scripts/testing/verify-phase18.ts`

## Phase 18 test results

| Test area | Result | Observed coverage |
|---|---|---|
| Secret management | PASS | AES-GCM envelope, decrypt round-trip, masking. Production key configuration is enforced by code path but production deployment was not exercised. |
| SSRF literals | PASS | Rejects localhost, IPv4/IPv6 loopback (including IPv4-mapped IPv6), unique-local IPv6, cloud metadata IP, and private IPv4 literals; accepts public HTTPS URL syntax. DNS resolution/rebinding and real egress firewall testing were not performed. |
| Circuit breaker | PASS | Opens after configured failures and fast-fails while open. Cross-process state and timed recovery were not load-tested. |
| Registry / health | PASS | Creates organization-scoped disconnected placeholders; missing adapter yields a failure diagnostic, not a false success. No real provider was contacted. |
| API credentials | PASS | Bearer auth, organization association, allowed scopes, per-key in-memory throttling, revocation. Expiration and rotation APIs are present but not separately integration-tested end-to-end. |
| Webhook signatures | PASS | HMAC positive and tampered-signature negative checks. No real HTTPS receiver, retry timing, replay-window, or endpoint disablement integration test was run. |
| Directory sync | PASS | Organization-scoped normalized user provisioning and external subject link. No actual HR provider, staged review UI, pagination, or verified account-link flow. |
| Import | PASS | Row-level validation, existing account conflicts, error-batch rejection, and atomic commit of a complete 12-row batch (including records beyond UI preview limit). XLSX and non-user imports are unsupported. |
| Calendar | PASS | Authenticated user feed includes RFC 5545 envelope and emits no synthetic appointment. Only existing class sessions are included. |

Additional HTTP smoke checks confirmed: anonymous integration administration endpoints respond `403`, anonymous `/api/v1/*` endpoints respond `401`, authenticated admin registry access responds `200`, teacher registry access responds `403`, and an unconfigured provider diagnostic returns `ok: false` rather than a simulated success.

## Security findings and fixes

- **Fixed — sample integrations falsely looked connected.** Registry placeholders now remain disconnected, no mocks are registered by default, and unavailable adapters fail health checks explicitly.
- **Fixed — unsafe import partiality.** The commit path previously used the truncated preview and could report a partial batch as committed. It now uses the full stored input and rejects invalid batches; valid commits are transactional.
- **Fixed — email-only account linking.** Directory sync no longer links an existing account from a matching email; it returns a conflict requiring verified linking.
- **Fixed — inbound webhook secret/bypass.** Test-mode signature bypass and plaintext/default secret behavior were removed. Incoming messages require a configured encrypted secret, organization, timestamp, delivery ID, HMAC, size/schema validation, and idempotent receipt.
- **Fixed — webhook secret storage.** Subscription secret is encrypted at rest and shown only once on creation. Logs and GET responses omit payload/secret fields in list views.
- **Fixed — API and admin permission checks.** Integration management uses Phase 15 permission keys; external API credentials and result queries are organization-bound.
- **Fixed — redirect-based SSRF.** Outbound webhook calls refuse redirects.

## Regression runs

- **Phase 5:** 43 passed, 0 failed.
- **Phase 14:** 42 passed, 0 failed.
- **Phase 15:** all checks passed in the suite output; includes org/RBAC/security scenarios.
- **Phase 17:** 20 passed, 0 failed when executed standalone. A later combined command exceeded the command time limit while the suite was still processing; standalone execution had passed.
- **Phase 16:** all listed route checks passed after the Phase 18 changes. This is route coverage, not a real-device visual/accessibility audit.

## Failed checks and corrections during development

- Initial SMTP connection test failed because the test port was not permitted. The final architecture no longer treats a fake SMTP gateway as connected; the verification asserts safe “no production adapter configured” behavior.
- HMAC negative test initially threw on unequal buffer lengths. Verification now explicitly checks lengths before timing-safe comparison.
- HR sync initially used fields from a different user schema; it was updated to the existing first/last-name, username, employee code, role, status, and organization fields.
- Import initially assumed `completedAt` and `user` assessment fields that do not exist in this project schema; it now uses the actual `submittedAt` and `student` fields.
- A schema relation for external identity links was added so organization-scoped relation checks can run.

## Dependency/security audit

`npm audit` reported **7 total issues: 6 high and 1 critical**. `npm audit --omit=dev` reported **2 production dependency issues**: Next.js (direct, critical) and PostCSS (transitive, high). Dependencies were not force-upgraded in this phase to avoid unreviewed framework changes; a security update and regression pass are release blockers.

## Validation constraints and remaining issues

- TypeScript validation passed with `NODE_OPTIONS=--max-old-space-size=2048 ./node_modules/.bin/tsc --noEmit --pretty false` after stopping the dev server. An earlier attempt while the server was running timed out; rerunning offline completed cleanly.
- The combined regression command was time-limited; critical suites were run separately.
- No deployment or production vendor credentials were available; real provider communications were not tested.
- A development-server log during an earlier regression run contained React `Invalid hook call` / `useContext` errors associated with the existing identity-action/admin page rendering while those HTTP routes still returned 200. This was not isolated or repaired in Phase 18 and requires browser-level triage before claiming zero UI regressions.
- No automated real-browser viewport suite, screen-reader audit, keyboard audit, reduced-motion check, or physical mobile test was run for Phase 18.
- No durable integration worker/queue, scheduled sync, multi-instance shared throttling/circuit state, payload retention cleanup, or legal hold was validated.
- SSRF checks do not yet DNS-resolve/pin hostnames; production egress isolation is still required.
- OIDC/SAML login and verified linking, live email/SMS/Web Push, vendor calendar APIs, real HRIS, and LRS delivery are deferred. The interfaces are not evidence those integrations work.
- Current external API is small and read-only; the UI does not yet provide full webhook/API-client update/disable/delete/test/log management.

## Release decision

**Not production-ready for live enterprise providers.** The Phase 18 integration foundation and selected local flows are implemented and tested, but vendor-backed SSO, notification delivery, durable background processing, egress controls, retention, full browser/accessibility checks, formal migration review, and several administration surfaces remain prerequisites. Phase 19 was not started.
