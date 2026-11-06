# Phase 28.3 — Authentication and Role Validation

**Result:** PASS for tested synthetic accounts on disposable `phase28_3_repeat`.

- STUDENT, TEACHER, ADMIN password login: HTTP **200**; session cookies were consumed in memory only and not logged or written to reports.
- MFA setup was not required by the observed test organization policy.
- Student `/admin` access: redirect **307**; teacher `/admin`: redirect **307**.
- Student `GET /api/users`: **403**; teacher/admin `GET /api/users`: **200**.
- Anonymous `GET /api/users`: **401**.
- Expired signed JWT to `/student`: redirect **307** to login.
- Admin logout: **200**; reuse of the logged-out cookie redirected **307** to session clearing.

No real account, password, token, or database URL is included here. `ensureIdentity` can update/seed access data, so all auth attempts were isolated to the repeat database.
