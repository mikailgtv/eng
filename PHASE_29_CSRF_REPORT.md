# Phase 29 — CSRF Report

**Cross-origin browser requests:** NOT TESTED against STAGING.

`assertSameOrigin` compares `Origin` host to forwarded/Host value and is included by nearly all mutation route files; automated scan found the logout POST as the mutation exception. Missing Origin is accepted by helper. Actual reverse-proxy trust, alternate Host handling and preflight behavior are NOT VERIFIED. Cookies are SameSite=Lax, but that is defense-in-depth, not proof.

**Finding P29-CSRF-01 — LOW:** logout POST and GET `/api/auth/clear-session` perform session revocation without explicit same-origin guard. Impact is forced logout, not account takeover. Regression testing requires staging browser requests from same-site and cross-site origins.

All state-changing actions (profile, grading, attendance, management, message, upload, reset and MFA) require a staging origin matrix; not executed. Do not treat the syntactic `assertSameOrigin` scan as test PASS.
