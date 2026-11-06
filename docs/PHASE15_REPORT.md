# PHASE 15 STATUS

## Implemented

- Organization, department, team, and group hierarchy were added on top of the existing users and learning groups. Existing groups were not copied or replaced.
- User lifecycle: invite, activate, suspend, deactivate, archive, and restore. Accounts are not hard-deleted. Archived, suspended, invited, and inactive accounts cannot sign in.
- Employee code remains unique. Organization id is stored on the user. The existing user id stays the internal id.
- Password policy, history, expiry setting, and forced change. Passwords stay hashed with bcrypt. Existing passwords were not expired.
- MFA architecture: authenticator TOTP and a one-time code delivered in the notification hub. Backup codes are hashed and shown once. MFA is optional unless an administrator sets it to required.
- Server-side sessions: device, browser, IP, created time, last activity, log out one session, log out others. Changing a password revokes older sessions.
- RBAC on the existing Student, Teacher, and Admin shells. System roles: Super Admin, Organization Admin, Training Admin, Reviewer, Teacher, Assistant Teacher, Student, Viewer. Custom roles can be created.
- Permissions are scoped to organization, department, group, course, or student. Teachers see students in assigned groups on the new user API.
- Temporary permissions expire by date and are ignored after that date. Delegation is audited and time-limited.
- Invitations use a hashed one-time token. The link is shown to the administrator because email delivery is not configured.
- CSV import with validation, duplicate detection, preview, and all-or-nothing confirm. Bulk activate, suspend, group, role, course assignment, and notification require confirmation.
- Security center, dormant-account list, and access review. Automatic suspension stays off unless the organization policy is turned on and an administrator runs it.
- Content review permission is connected to the Phase 14 reviewer check. AI context strips passwords, tokens, MFA secrets, employee codes, and email.
- Notifications for invitation, password reset, role change, and security events go through the Phase 12 hub.

## Database

`prisma db push` ran without `--accept-data-loss`. Existing rows were kept.

New tables: organizations, organization_settings, departments, teams, user_profiles, user_organizations, user_departments, user_groups, permissions, roles, role_permissions, user_roles, temporary_permissions, delegations, user_invitations, user_sessions, login_attempts, account_security_events, mfa_methods, mfa_backup_codes, mfa_challenges, password_history, access_reviews, access_review_decisions, support_access_sessions, import_batches.

Optional columns were added to users and learning_groups. The Phase 1 role field remains STUDENT, TEACHER, or ADMIN so current pages and middleware keep working.

Existing administrators were mapped to Organization Admin, not Super Admin. Support access is not included. Teachers were mapped only to their assigned groups. Students were mapped to their own record.

## API

- `/api/auth/login`, `/api/auth/logout`, `/api/auth/password`, `/api/auth/password-reset`, `/api/auth/clear-session`
- `/api/users`, `/api/users/{id}`, `/api/users/{id}/lifecycle`, `/api/users/import`, `/api/users/bulk`
- `/api/organizations`, `/api/departments`, `/api/teams`, `/api/groups/hierarchy`
- `/api/roles`, `/api/permissions`, `/api/sessions`, `/api/invitations`, `/api/invitations/accept`
- `/api/mfa`, `/api/security`, `/api/security/impersonate`, `/api/access-reviews`, `/api/delegations`, `/api/account/preferences`

Mutations check the session, same-origin header, permission, and write an audit entry. Passwords, reset tokens, and MFA secrets are not written to the audit log.

## UI

- Admin: Organization, Departments, Roles, Invitations, Security, Access reviews, Identity audit. User profile shows real training counts.
- User: Security pages for student, teacher, and administrator, with password, sessions, MFA, and preferences.
- Public invitation and password-reset pages.
- A support-access banner shows while an authorized administrator is viewing as someone else.

## Security

- bcrypt hashes, httpOnly session cookie, same-site lax, secure cookie in production.
- Session id and password version are checked on every server request. Revoked or expired sessions fail.
- Login rate limit, progressive delay, and temporary lock after repeated failures.
- Default deny for new permissions. Viewing as another user is off until explicitly granted, limited to 30 minutes, and audited. It cannot change passwords, roles, or account status.
- A stale cookie after password change is cleared instead of looping between login and the home page.

## Tests

`scripts/testing/verify-phase15.ts`: all checks passed.

Covered: session required, student blocked from roles and user list, teacher scope and IDOR, department and team, group hierarchy, custom role, invitation issue/accept/reuse/expiry, weak password, account lock, archive cannot sign in, CSV duplicate preview, failed import creates nothing, bulk confirmation, impersonation denied then explicitly granted, reset token one-time, TOTP and backup codes, sessions, security center, access review, secret stripping, and the new pages.

Regression: `verify-phase5.ts` 43 passed, 0 failed. `verify-phase14.ts` 42 passed, 0 failed.

## Known Issues

- XLSX import was not added. This project has no spreadsheet library, and a new dependency was not installed. CSV import works.
- There is no email or SMS provider. Invitation links are shown once to the administrator. Sign-in codes and reset notices go to the notification hub, not to an external inbox.
- Remember-device is not a separate trust store. Active sessions can be viewed and revoked.
- Some older admin routes still allow any Phase 1 administrator. New identity routes use the permission table. A Training Admin uses the admin shell, so older routes that only check the admin role are still open to that shell.
- Older screens still label times as UTC. Identity screens show the organization timezone. The database stays UTC.
- The permission matrix is generated from stored permissions. Choosing permissions for a custom role is a comma-separated list, not a checkbox grid.
- Phase 13 has no separate analytics package in this workspace. User, status, attendance, and participation counts are real database counts. There is no ranking.

## Completion Estimate

90%

The identity, access, session, MFA, invitation, and security workflows requested for this phase are in place and tested. The remaining gap is external email/XLSX delivery and full replacement of every older admin role check.

Phase 16 was not started.
