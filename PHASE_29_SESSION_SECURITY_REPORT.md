# Phase 29 — Session Security Report

**Live cookie/header/session tests:** NOT TESTED. No STAGING host or test accounts.

## Static evidence

- HS256 signed JWT, subject, issue/expiry, password-hash version, session ID, session version; `getSessionUser` rechecks active account, password version, version counter, session record, expiry/revocation and support-session validity on each server request (React cached per request).
- Session max age is hard-coded seven days in auth implementation; org `sessionMaxDays` setting exists but not evidently used by token creation. Validate intended policy.
- Cookie uses HttpOnly, SameSite=Lax, path `/`; `Secure` is conditional on `NODE_ENV === production`. Staging `NODE_ENV`, proxy HTTPS and actual Set-Cookie flags NOT VERIFIED.
- Logout revokes DB session and clears cookie; `POST /api/auth/logout` is the only mutation handler found without `assertSameOrigin`, so cross-site logout remains possible (LOW nuisance/availability finding).
- `/api/auth/clear-session` uses GET to clear/revoke session and redirect; CSRF logout possible.
- Session fixation/rotation and refresh-token behavior NOT TESTED. Session is JWT+DB session, not a refresh-token flow found in source.
- MFA intermediate cookie is HttpOnly/SameSite=Lax and 5-minute token; verification brute-force weakness is in Authentication report.
