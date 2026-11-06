# Phase 29 — Authentication Report

**Runtime tests:** NOT TESTED.

## Static observations

- Login performs bcrypt comparison and responds with generic invalid-credential text; login has in-memory per-IP+identifier limiter (5 failures/5 minutes) and DB account lockout/progressive delay helpers. IP attribution trusts the first `x-forwarded-for` value; proxy sanitization is NOT VERIFIED.
- Password hashing uses `bcryptjs` with 12 rounds in reset path; policy defaults seen in source are 8 chars + at least a number, settings may strengthen it. Password reuse is configurable. Common-password screening was not found.
- Password reset confirmation uses a hashed token (`codeHash`) with expiry and marks token used; its use and password update are in a transaction. Concurrent single-use behavior was not tested. Reset request/action rate limits are in-memory.
- Invitation acceptance is a public token flow with rate limiter; token expiry/one-time semantics are implemented in service code but not dynamically validated.
- MFA is optional/configurable, TOTP/email OTP/backup code support exists. **MFA verification has no rate-limit or attempt counter in `/api/mfa` / `verifyMfaCode` path**; a signed MFA cookie lasts five minutes. This is a HIGH account takeover risk requiring urgent control and test.
- No email verification/account activation test performed; report status NOT VERIFIED.

Enumeration: login invalid credentials are generic. Status-specific responses after correct password reveal lifecycle status to a party already knowing the password. Reset uses admin-issued token, not a public email existence form in inspected route. No timing/request comparison was performed.
