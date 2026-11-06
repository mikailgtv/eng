# Phase 28.4 — Sensitive Data Report

**Assessment:** schema/code inventory only; database rows, encryption-at-rest configuration, provider retention and backups are NOT VERIFIED.

## Data classes observed in schema

- Identity/contact: user name, username, email, phone, employee code, organization/group membership.
- Authentication: `passwordHash`, password history, invitation/reset token hashes, login identifiers, IP/user-agent records, sessions and MFA challenge/backup-code hashes.
- MFA/credentials: `MfaMethod.secretEnc`; integration credentials and webhook signing secrets; API client secret hashes.
- Learning records: assessment answers/writing submissions, grades/reviews, attendance, progress, certificates/PDF bytes and certificate download bearer tokens.
- Communications/AI/voice: message bodies/attachments, notification bodies, AI session messages/transcripts/feedback, voice transcripts/audio references and consent.
- Audit/security: actor/action/entity/timestamp/metadata/IP, login attempts and security events.

## Controls observed

- Passwords use bcrypt (12 rounds in user creation/login paths); reset/invitation tokens are stored as hashes; MFA backup codes are hashed.
- MFA secret encryption uses AES-256-GCM with a key derived from `SESSION_SECRET` using a fixed application salt. Rotation/recovery is not documented; loss/rotation can make stored MFA secrets unreadable.
- Integration credentials use AES-256-GCM and a production-specific `INTEGRATION_SECRET_KEY` gate. The decryptor accepts legacy non-versioned values as plaintext; current data was not scanned to establish whether any exist.
- Session cookie code sets HttpOnly, SameSite=Lax, 7-day expiry, and `Secure` in production. Sessions are rechecked/revoked through database records; Phase 28.3 tested synthetic login/logout/expired JWT only.
- `logSafeError` logs event and error type, not message/stack; API error handling gives generic internal errors. Audit records are best effort. Invitation creation currently includes an email address in audit metadata (`src/lib/identity/service.ts`), so PII minimization/retention should be reviewed.
- `Certificate.downloadToken` is stored as a unique plaintext bearer value; consider storing a hash and comparing a one-time token digest.

## Integrity, sessions and audit trail

Phase 28.3 semantic row fingerprints include the `passwordHash` columns and prove those bytes/values were preserved during migration. Phase 28.3 login probes used synthetic accounts; verification of an existing real/test user’s password against its migrated hash is **NOT VERIFIED**. The prior synthetic login/logout/expired-JWT tests verified the app path at that time, but current PostgreSQL session persistence/revocation is **NOT VERIFIED**.

`AuditLog` models actor, action, entity type/id, metadata, timestamp and optional IP. Audit writes are best-effort and errors are logged without stack/message; they are not generally atomic with the business write. Invitation audit metadata includes email PII. IP comes from proxy headers and should be trusted only behind a configured proxy. Audit completeness, metadata secret-filtering and tamper resistance are **NOT VERIFIED** against live rows.

## Retention/encryption status

Database volume/disk encryption, backup encryption, voice/AI retention enforcement, audit/login-attempt purge schedule, and access-log retention are **NOT VERIFIED**. Retention settings/models exist, but an active scheduled cleanup was not validated. No actual sensitive row values were read or copied into reports.
