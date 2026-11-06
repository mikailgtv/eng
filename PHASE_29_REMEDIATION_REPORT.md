# Phase 29 — Remediation Report

**Changes made:** none. Source code, database, users, roles, fixtures, configuration and public assets were not modified. Production was not accessed.

## Prioritized corrective work

1. **CRITICAL:** Fix organization permission matching: organization grants must match the exact requested organization ID; missing scope must not authorize scoped grants.
2. **CRITICAL:** Bind organization list/update and role assignment to the actor's authorized organization. Validate target user, role, scope ID and permission ceiling; prohibit tenant admins from assigning `SUPER_ADMIN`/core ADMIN.
3. **HIGH:** Scope assessment GET/PATCH/question replacement to the assigned group/course/tenant; strip correct-answer keys outside authorized staff contexts.
4. **HIGH:** Add rate limits and atomic one-time consumption/attempt ceilings for MFA/OTP verification; use shared infrastructure under multi-instance deployments.
5. **HIGH candidate:** Restrict content-media downloads by publication/owner/group/tenant and validate MIME from content.
6. **MEDIUM:** shared rate limit quotas for AI/STT/TTS/messaging/upload; limit request bodies and provider spend.
7. **MEDIUM:** add CSP and establish HTTPS/HSTS at verified edge; validate actual response headers.
8. Add CSRF guard to logout and define whether GET clear-session is permitted.

No remediation was applied because Phase 29 requires STAGING and the current backup is not verified; without environment and validation, a security change could break access or tenant behavior.
