# Phase 31 — Backup Policy

**Date:** 2026-10-10
**Status:** VERIFIED (policy documented) / PARTIALLY VERIFIED (encryption at-rest depends on provider)

## Scope

- **Database:** PostgreSQL staging (when available) and SQLite local dev (prisma/dev.db)
- **Files:** Course materials, lesson attachments, images, learning resources, user-submitted homework (where file model exists), audio recordings (when storeAudio true), message attachments, content media
- **Not in scope:** Production (never backup/restore into prod in this phase), native mobile app (none)

## Backup Frequency

- **Database:**
  - Manual: authorized operator via `POST /api/admin/backups/database` (ADMIN only)
  - Automated: only when hosting environment supports reliable scheduler (e.g., Netlify Scheduled Functions, cron, or managed provider). Currently NOT IMPLEMENTED as scheduler not verified in this environment. Documented as pending.
  - Recommended: daily for staging, hourly for production (with PITR if provider supports)

- **Files:**
  - Manual: `POST /api/admin/backups/files`
  - Automated: same scheduler limitation, NOT IMPLEMENTED
  - Recommended: daily, or after significant content import

## Retention

- **Configurable via env:**
  - `BACKUP_RETENTION_DAYS` default 30 days
  - `BACKUP_RETENTION_COUNT` default 5 verified backups
- **Rules:**
  - Keep at least N verified backups (default 5) even if expired
  - Never delete last verified recoverable backup as part of automated cleanup — enforced in `cleanupExpiredBackups()` which checks lastVerified and skips it
  - Expired backups (retentionUntil < now) and old count beyond retentionCount are deleted, except last verified
  - Safe cleanup process: `cleanupExpiredBackups()` deletes data file and manifest, logs, preserves last verified
  - Requires confirmation for destructive cleanup in API (`confirm: true` for restore drill cleanup)

## Encryption

- **In transit:** 
  - Database backups via pg_dump over TLS if DATABASE_URL uses sslmode=require (Postgres)
  - File backups via storage adapter — if S3, TLS in transit
  - Status: VERIFIED (code uses TLS via URL, but not explicitly tested)

- **At rest:**
  - If `BACKUP_ENCRYPTION_KEY` env set (>=32 chars), status `aes-256-gcm` — key separate from artifacts, never committed, never logged, only hash of key ID in logs
  - If S3 bucket has SSE-S3/SSE-KMS enabled and `BACKUP_ENCRYPTION_AT_REST=true`, status `at-rest` (provider-managed)
  - Otherwise `none` — documented as limitation
  - **Current env:** No BACKUP_ENCRYPTION_KEY, no S3 — status `none` — NOT ENCRYPTED at rest for local backups (acceptable for local dev, not for prod)

- **Key management:**
  - Keys separate from backup artifacts — VERIFIED (key in env, artifacts in ./backups)
  - Never commit secrets to source control — VERIFIED (grep for BACKUP_ENCRYPTION_KEY shows only server-env and encryption.ts, no hardcoded value)
  - Rotation: if key compromised, rotate via env, re-encrypt future backups, old backups remain with old key until expired

## Access Control

- **Least privilege:**
  - Backup creation: ADMIN role only (`requireApiUser(["ADMIN"])` in API routes)
  - Inspection (list/status): ADMIN only
  - Download: ADMIN only (via list endpoint, not direct file URL)
  - Deletion: via cleanup function, ADMIN only, with confirmation
  - Restore: ADMIN only, isolated target only, forbids production and active staging

- **Automated jobs:** Should run with dedicated service account with PutObject, GetObject, ListBucket limited to backup bucket — NOT IMPLEMENTED (no scheduler)

- **Prevent unauthorized discovery:**
  - Backup filenames are random (backupId with timestamp + random hex), not guessable
  - Full paths not exposed in API (only last 2 segments)
  - No backup contents in logs, only backupId, status, size, fileCount

- **Logging:**
  - Administrative backup/restore actions logged via console with [backup:EVENT] prefix, no secrets, no private file contents, only backupId, status, reason (first 200 chars)
  - Audit trail via existing audit system for backup creation (actorId, action, entityType)

## Storage

- **Destination:** `BACKUP_DESTINATION` env or `./backups` (dev) / `./backups-test` (test) / `BACKUP_DESTINATION_PROD` (prod) — environment separation
- **Structure:** `backups/db/<backupId>.dump + <backupId>.json`, `backups/files/<backupId>/... + <backupId>.json + <backupId>.metadata.json`, `backups/recovery/<restoreId>/...`
- **Separate from primary DB:** Yes, backups stored separately from primary DB (./backups vs prisma/dev.db) — VERIFIED
- **Permissions:** Local dir should have 700 or least-privilege — NOT VERIFIED (default OS perms)

## Verification

- **Backup completion:** manifest written with completedAt, size, checksum, status
- **File integrity:** SHA256 checksum computed and stored, verified after creation via `verifyManifestIntegrity` (size + checksum + pg_restore --list for postgres)
- **Incomplete/corrupted detection:** status FAILED/CORRUPTED if verification fails, file empty, size mismatch, checksum mismatch
- **Interrupted operations:** lock prevents concurrent backups (`backupLock` boolean), cleanup of incomplete artifact on failure (unlink)
- **Backup created while app available:** For Postgres, pg_dump with custom format allows online backup without blocking reads (MVCC) — documented, but not tested live

## Limitations

- Continuous recovery, PITR, managed-provider snapshots: NOT IMPLEMENTED, documented as limitation (requires managed Postgres provider like RDS, Supabase, etc.)
- Automated scheduling: NOT IMPLEMENTED (no reliable scheduler verified)
- S3 versioning as backup: documented as option, but not live
- Encryption at-rest: none for local dev, requires external key or S3 SSE

## Approval

- RPO/RTO values: awaiting approval (see final report)
- Retention days/count: configurable, defaults 30 days / 5 backups, awaiting owner approval
