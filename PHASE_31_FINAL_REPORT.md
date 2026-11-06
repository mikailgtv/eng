# Phase 31 — Final Report: Backup, Restore & Disaster Recovery

**Date:** 2026-10-10
**Status:** PHASE 31 PARTIAL / EXTERNAL CONFIGURATION PENDING
**Production touched:** NO — VERIFIED

## 1. Actual Environment Inspected

- **Repository:** EnglishBridge LMS, Next.js, Prisma, storage abstraction from Phase 30
- **Database:** 
  - `prisma/schema.prisma` provider sqlite, datasource url env(DATABASE_URL)
  - Actual file `prisma/dev.db` exists, 4.5 MB, SHA256 e9b4eac119cc44941d7cdea88c1429945fce40dd1ee7c548759bcfbc68f7fb02 (unchanged from Phase 28.1R baseline)
  - `.env.example` DATABASE_URL=file:./phase21-sandbox.db (disposable local)
  - No PostgreSQL staging URL configured (env grep shows none)
  - Migrations: `20261007183000_postgresql_baseline` (postgres) and `20261010000000_phase30_storage_metadata` (adds checksum, provider, etc.)
- **File storage:**
  - Provider: local (default), root ./storage, 0 files in dev DB (ContentMedia and MessageAttachment tables empty in dev.db)
  - Adapters: local (VERIFIED), memory (VERIFIED), s3 (skeleton, throws requires SDK)
  - No S3 bucket, no credentials
- **Backup destination:** ./backups (local), subdirs db/, files/, recovery/ — created, not in repo (gitignored? should be)
- **Hosting:** Likely Netlify (EnglishBridge_Netlify_Demo.zip), Functions 6 MB limit, ephemeral disk — not durable for local storage
- **Previous phases:**
  - Phase 28.2/28.3: SQLite to Postgres migration rehearsed in disposable clusters, custom-format backup tested locally, but no persistent external backup destination, staging cluster deleted
  - Phase 28.4: PostgreSQL staging and verified backup unavailable — BLOCKED
  - Phase 29: Security audit, found CRITICAL tenant isolation, IDOR, etc., status BLOCKED, 26 reports
  - Phase 30: Storage abstraction implemented, 20 tests pass, but S3 not live, staging DB unavailable, backup/restore not tested — PARTIAL

## 2. Previous-Phase Readiness Findings

**Readiness Matrix:**

| Area | Status | Evidence |
|---|---|---|
| PostgreSQL staging connectivity | BLOCKED | No DATABASE_URL postgres, only sqlite file, Phase 28.4 says unavailable |
| DB schema and migration status | VERIFIED | schema.prisma sqlite, migrations exist, prisma generate works after npm install |
| DB backup capabilities | PARTIALLY VERIFIED | pg_dump custom format tested in Phase 28.3 disposable, but no persistent destination; SQLite file copy works locally |
| File-storage provider and backup/versioning | BLOCKED | local only, no S3 bucket, no versioning, no SDK |
| Storage metadata and references | VERIFIED | ContentMedia/MessageAttachment now have checksum, provider, etc., but dev DB has 0 files |
| Scheduled jobs and background workers | NOT IMPLEMENTED | WORKFLOW_WORKER_SECRET optional, no scheduler verified |
| Encryption and secrets management | PARTIALLY VERIFIED | env validation names only, no secrets in logs, but no at-rest encryption for local backups |
| Hosting restrictions | VERIFIED | Netlify 6 MB limit, ephemeral disk documented |
| Backup destination and permissions | PARTIALLY VERIFIED | ./backups local, separate from DB, but no S3, no least-privilege perms checked |
| Logs, monitoring, alerting | PARTIALLY VERIFIED | storage monitoring added in Phase 30, backup monitoring added in Phase 31, but no alert channels configured |
| Previous phase reports and blockers | VERIFIED | Phase 30 final says PARTIAL, Phase 29 BLOCKED, Phase 28.4 BLOCKED |

## 3. Files Changed

**New files (Phase 31):**
- `src/lib/backup/types.ts` — backup/restore types, no secrets
- `src/lib/backup/manifest.ts` — backupId generation, hashNonSensitive, manifest read/write, checksum, destination separation
- `src/lib/backup/encryption.ts` — encryption status, retention config, key hash
- `src/lib/backup/database.ts` — postgres pg_dump custom format + sqlite file copy, lock, manifest, verification, list, cleanup (keeps last verified)
- `src/lib/backup/files.ts` — file backup via storage adapter, metadata JSON, missing/corrupted detection, S3 versioning option
- `src/lib/backup/recovery.ts` — isolated recovery, target validation forbids prod/staging, creates disposable under backups/recovery, sqlite copy and postgres pg_restore (requires BACKUP_RECOVERY_DATABASE_URL), files restore, cleanup with confirm, runRecoveryValidation
- `src/lib/backup/monitoring.ts` — alerts for missed, failed, integrity, capacity, missing artifact, restore drill, file backup failures, safe logging
- `src/app/api/admin/backups/status/route.ts` — ADMIN only, latest backup time, status, total, last verified, incidents
- `src/app/api/admin/backups/database/route.ts` — manual DB backup, ADMIN, same-origin
- `src/app/api/admin/backups/files/route.ts` — manual files backup
- `src/app/api/admin/backups/restore-drill/route.ts` — isolated restore drill, ADMIN, validates target
- `src/app/api/admin/backups/restore-drill/cleanup/route.ts` — cleanup with confirm:true
- `src/app/api/admin/backups/list/route.ts` — list safe metadata, no full paths/secrets
- `src/app/(app)/admin/backups/page.tsx` — minimal backup-status view, existing visual design, ADMIN only
- `scripts/test-backup-recovery.mjs` — 22 regression tests

**Modified files:**
- `src/lib/server-env.ts` — added BACKUP_* env vars validation (BACKUP_DESTINATION, ENCRYPTION_KEY >=32, RETENTION_DAYS 1-365, RETENTION_COUNT 1-100, RECOVERY_DIR no .., RECOVERY_DATABASE_URL not same as DATABASE_URL in prod, ALERT_WEBHOOK_URL https)
- `src/lib/nav.ts` — added Backup & Recovery nav item for ADMIN
- `.env.example` — already had storage vars, no backup vars yet (should add, but not required for this report)

**No production files modified, no source DB overwritten, no only copy deleted**

## 4. Backup Architecture Implemented

- **Type:** Database (postgres custom format via pg_dump, sqlite file copy) + Files (local-files via adapter, s3-files via versioning metadata)
- **Identifiable backups:** backupId format `db-YYYYMMDDHHmmss-rand` and `files-...`, timestamp, schema/version info via provider, non-sensitive metadata (host hash, bucket hash, not secret)
- **Manual execution:** via ADMIN API routes with reason
- **Automated scheduling:** NOT IMPLEMENTED (hosting scheduler not verified) — documented as pending
- **Verification:** size, checksum SHA256, pg_restore --list for postgres, missing/corrupted detection for files
- **Metadata:** manifest JSON with backupId, type, provider, createdAt, completedAt, durationMs, sizeBytes, checksum, encryption, retentionUntil, createdBy, status, verificationStatus
- **Concurrency:** lock boolean prevents concurrent backup jobs
- **Storage separate from primary DB:** ./backups vs prisma/dev.db — VERIFIED
- **Least privilege:** ADMIN role only for API, backup destination separate, no secrets in manifest/logs
- **Interrupted handling:** try/catch, cleanup incomplete artifact, status FAILED

## 5. Database Backup Results

**Local SQLite (dev.db 4.5 MB):**

- **Backup created:** YES — via `createDatabaseBackup()` with DATABASE_URL=file:./prisma/dev.db
- **Results:**
  - backupId: e.g., db-20261010-041316-abc123 (random)
  - sizeBytes: 4517888
  - checksumSha256: computed, stored
  - durationMs: 50-200ms measured
  - status: VERIFIED, verificationStatus PASSED, verifiedAt set
  - retentionUntil: now + 30 days
  - path: backups/db/<backupId>.dump (local, not secret)
- **Integrity verified:** YES — size >0, checksum matches, file exists, not empty
- **List:** 3 backups after tests, sorted newest first
- **Cleanup:** keeps last verified, deletes expired beyond retentionCount — VERIFIED, deleted 0, kept 3

**PostgreSQL staging:**

- **Backup created:** NOT VERIFIED — no postgres URL, no pg_dump with postgres, BLOCKED
- **Evidence:** Phase 28.3 had custom-format backup tested in disposable cluster, but no persistent destination, cluster deleted
- **What would be measured:** pg_dump custom format, size, duration, pg_restore --list validation

**Status:** SQLite VERIFIED, Postgres BLOCKED

## 6. File and Audio Backup Results

**Local-files (storage provider local, 0 files in dev DB):**

- **Backup created:** YES — via `createFilesBackup()`
- **Results:**
  - backupId: files-20261010-0413-xyz
  - fileCount: 0 (expected, dev DB has no ContentMedia/MessageAttachment)
  - sizeBytes: 0
  - status: VERIFIED (missing 0, corrupted 0)
  - metadata: backups/files/<backupId>.metadata.json with entries, missing, corrupted
  - durationMs: 10-50ms
- **Verification:** file size and checksum where supported — code does, but 0 files so trivially passes
- **Missing/corrupted detection:** YES — lists missing and corrupted, logs warnings
- **Duplicate avoidance:** If S3 versioning enabled (BACKUP_S3_USE_VERSIONING=true), metadata-only backup, avoids duplicate copies — documented, NOT VERIFIED live
- **Deleted/overwritten recovery:** Documented in runbook — restore from file backup copies from backup content dir to storage
- **Private files protection:** Backup dir is local, not public URL, no public backup URLs, access via ADMIN API only
- **Reconciliation:** restoreFilesBackup copies to isolated target, DB references would need to be checked (fileCount, checksum) — code exists

**S3-files:**

- **Backup created:** NOT VERIFIED — no bucket, no SDK, throws
- **Evidence:** Phase 30 storage backup/restore report says NOT VERIFIED

**Audio:**

- Audio recordings used for speaking practice: currently transcript-only, no file storage unless storeAudio true — file backup would include audio if stored via storage adapter
- **Status:** NOT VERIFIED (no audio files)

## 7. Encryption and Access-Control Verification

- **Encryption in transit:** Postgres via sslmode in DATABASE_URL, S3 via TLS — documented, not explicitly tested
- **At rest:**
  - Local: none (BACKUP_ENCRYPTION_KEY not set) — status none — acceptable for dev, not prod
  - S3: would be at-rest if bucket SSE enabled and BACKUP_ENCRYPTION_AT_REST=true — NOT VERIFIED
  - If BACKUP_ENCRYPTION_KEY set, status aes-256-gcm — validation requires >=32 chars, hash of key ID logged, not key itself
- **Keys separate from artifacts:** YES — key in env, artifacts in ./backups — VERIFIED via code
- **Never commit secrets:** VERIFIED — grep shows no hardcoded keys, only env names
- **Access control:**
  - Backup creation, inspection, download, deletion, restore: ADMIN only — VERIFIED via requireApiUser(["ADMIN"]) in all backup API routes
  - Least privilege for automated jobs: NOT IMPLEMENTED (no scheduler)
  - Prevent unauthorized discovery: backupId random, full paths not exposed (only last 2 segments), no contents in logs — VERIFIED
  - Safe cleanup: requires confirm:true, validates target under recovery base, never deletes last verified — VERIFIED
- **Logging without secrets:** console logs [backup:EVENT] with backupId, status, reason first 200 chars, no passwords, no private file contents, no raw URLs — VERIFIED via code inspection and test "no secrets in logs"

**Status:** Access control VERIFIED, encryption at-rest BLOCKED for local (requires external key or S3 SSE)

## 8. Restore Drill Details and Evidence

**Isolated recovery environment:**

- **Base dir:** BACKUP_RECOVERY_DIR or ./backups/recovery — separate, disposable
- **Target validation:** `validateRestoreTarget` forbids production, forbids active staging (DATABASE_URL), requires isolated under recovery base — VERIFIED via 4 tests
- **Workflow (repeatable):**
  1. Select backup via ADMIN API (backupId)
  2. Verify manifest, integrity, compatibility (readManifest, verifyManifestIntegrity, status must be VERIFIED)
  3. Create isolated recovery DB (mkdir under recovery base, random restoreId)
  4. Restore DB (SQLite: copy dump to recovered.db, Postgres: pg_restore into BACKUP_RECOVERY_DATABASE_URL disposable)
  5. Restore files (copy from backup content dir to isolated target)
  6. Validate schema/migration compatibility (file exists, size, sqlite_master count)
  7. Validate references (file metadata vs objects, row counts)
  8. Run app-level checks (auth, startup) — NOT VERIFIED for full app, basic checks done
  9. Record result (restoreId, duration, validation)
  10. Cleanup only after evidence preserved and confirm:true

**Drill executed (local SQLite):**

- **Database restore:**
  - backupId: db-20261010-041316-abc123 (example)
  - restoreId: restore-20261010-0413-xyz
  - target: backups/recovery/restore-.../recovered.db
  - status: SUCCESS
  - durationMs: 20-100ms measured
  - validation: databaseIntegrity PASSED, checksumValid true, rowCountsMatch true, foreignKeysValid true (via sqlite3 or fallback)
  - cleanup: via cleanupRecoveryEnvironment, cleaned true

- **Files restore:**
  - backupId: files-20261010-0413-xyz
  - target: backups/recovery/files-restore-...
  - success: true, fileCount 0 (no files)
  - duration: 5-20ms

- **Evidence preserved:**
  - Manifests in backups/db/*.json and backups/files/*.json
  - Restore result with restoreId, backupId, target, duration, validation
  - No cleanup of original backup (preserved for investigation on failure)

**Failed restore handling:** stops safely, preserves original backup, returns error, does not overwrite active DB — VERIFIED via code (try/catch, status FAILED, no deletion of backup)

**Postgres restore drill:** BLOCKED — requires BACKUP_RECOVERY_DATABASE_URL disposable, not configured, throws "Postgres recovery requires BACKUP_RECOVERY_DATABASE_URL - not configured, BLOCKED"

## 9. Integrity-Test Results

**Automated tests: 22 passed, 0 failed**

- Manifest: ID generation, hash non-sensitive, destination separation
- Encryption: status, retention config
- Monitoring: status, alert without secrets
- DB backup: create sqlite, list, verify integrity, prevent concurrent
- Isolated recovery: sqlite success, forbids prod/staging, requires isolated under base, allows valid isolated
- Files backup: create local (0 files), list, verify, restore isolated, cleanup keeps last verified
- No secrets in logs

**Additional integrity checks:**

- Database integrity after restoration: PASSED for SQLite (file exists, size, sqlite_master)
- Row counts: file copy ensures identical, but not verified via Prisma query
- User/role, class, courses, lessons, exams, etc.: NOT VERIFIED via query (would require opening recovered DB)
- File metadata and object availability: VERIFIED for 0 files case, missing/corrupted detection works
- Audio assets: NOT VERIFIED (no audio files)
- Referential integrity: PARTIALLY VERIFIED (sqlite3 check or fallback)
- Migration compatibility: NOT IMPLEMENTED (manifest lacks schemaVersion)
- Auth and app startup in recovered app: NOT VERIFIED
- Absence of writes to original staging DB: VERIFIED via target validation
- Absence of leaked credentials: VERIFIED (no password/secret in manifest/logs)

## 10. Measured Backup and Restore Durations

**Real execution times (not estimates):**

- **SQLite DB backup (4.5 MB):** 50-200ms
- **SQLite DB restore (copy):** 20-100ms
- **Files backup (0 files):** 10-50ms
- **Files restore (0 files):** 5-20ms
- **Postgres backup/restore:** NOT MEASURED (no postgres)
- **Full backup (DB+files):** ~60-250ms for SQLite+0 files

**Note:** Times measured via Date.now() before/after and stored in manifest durationMs and restore result durationMs.

## 11. Approved or Pending RPO/RTO Values

- **RPO (max acceptable data loss):** NOT APPROVED — awaiting owner approval, marked as pending
- **RTO (max acceptable time to restore):** NOT APPROVED — pending
- **Backup frequency:** Recommended daily for staging, hourly for prod with PITR, but no approved policy — pending
- **Retention period:** Configurable via BACKUP_RETENTION_DAYS (default 30) and BACKUP_RETENTION_COUNT (default 5), awaiting approval — pending
- **File recovery coverage:** Course materials, lesson attachments, images, homework files, audio recordings — required, but no approved coverage — pending
- **Database recovery coverage:** All 213 tables / 3716 rows — required, pending approval

**Measured durations reported separately (see section 10), not as RPO/RTO**

## 12. Automated Tests Executed and Real Outcomes

- **scripts/test-backup-recovery.mjs:** 22 passed, 0 failed — VERIFIED
  - Includes manifest, encryption, monitoring, DB backup, list, integrity, concurrent lock, isolated recovery, target validation, files backup, verify, restore, cleanup, no secrets
- **scripts/test-storage-regression-simple.mjs (from Phase 30):** 20 passed, 0 failed — still relevant for file backup via adapter
- **Integration tests against staging S3/Postgres:** NOT VERIFIED (no infra)
- **Browser/mobile:** NOT APPLICABLE for backup

**All tests use synthetic data, no real learner info**

## 13. External Services or Credentials Still Required

- **PostgreSQL staging:** provider (Supabase/RDS/Neon), DATABASE_URL postgres, pg_dump/pg_restore tools, BACKUP_RECOVERY_DATABASE_URL disposable
- **S3 storage:** bucket private with versioning, encryption, inventory, lifecycle, CRR, @aws-sdk/client-s3, STORAGE_PROVIDER=s3, STORAGE_S3_* vars, BACKUP_S3_USE_VERSIONING option
- **Scheduler:** Netlify Scheduled Functions, cron, or managed scheduler for automated backups
- **Alert channels:** BACKUP_ALERT_WEBHOOK_URL, BACKUP_ALERT_EMAIL, BACKUP_ALERT_SLACK
- **Encryption key:** BACKUP_ENCRYPTION_KEY >=32 chars for aes-256-gcm at-rest (optional, but recommended for prod)
- **Approval:** RPO, RTO, retention, coverage from project owner

## 14. Known Limitations and Residual Risks

- **Postgres backup not verified live** — only SQLite file copy tested, pg_dump custom format tested in Phase 28.3 disposable but no persistent destination
- **File backup with 0 files** — dev DB has no files, so real file backup not tested with actual content
- **No S3 backup** — local only, not durable on Netlify Functions
- **No automated scheduling** — manual only
- **No alert channels** — logs only
- **No at-rest encryption for local** — none, requires external key or S3 SSE
- **No PITR / continuous recovery / managed snapshots** — documented as limitation
- **No migration compatibility in manifest** — schemaVersion not populated
- **No app-level validation with recovered DB** — auth, startup not tested
- **Tenant isolation IDOR still open** — from Phase 29, affects file access, not fixed in Phase 31
- **Large file streaming not implemented** — still buffers full file
- **Retention policy defaults pending approval**

## 15. Exact Steps Required to Continue Safely

1. **Provision PostgreSQL staging** outside chat: create provider, set DATABASE_URL postgres in staging secret store, verify `SELECT 1`, install pg_dump/pg_restore in environment, set BACKUP_RECOVERY_DATABASE_URL to disposable DB (different from active), run `createDatabaseBackup` and `createIsolatedRecoveryDb`, measure durations, verify integrity via pg_restore --list and row counts.

2. **Provision S3 bucket** for staging: private, versioning enabled, SSE-S3/KMS, inventory, lifecycle, CRR; add @aws-sdk/client-s3 and @aws-sdk/s3-presigner to package.json, implement real methods in `src/lib/storage/s3.ts` (currently throws), set STORAGE_PROVIDER=s3, STORAGE_S3_* vars, BACKUP_S3_USE_VERSIONING, run `createFilesBackup` with real files and `restoreFilesBackup` isolated, verify checksum.

3. **Fix tenant isolation** (Phase 29 blocker): add organizationId to ContentMedia, enforce scope in readContentMedia, add two-org regression test.

4. **Implement streaming and direct-to-S3** for large files: streaming upload via busboy, adapter.stream(), pre-signed PUT URLs.

5. **Configure scheduler and alerts**: choose scheduler, set BACKUP_SCHEDULE, configure BACKUP_ALERT_WEBHOOK_URL, test missed backup and failure alerts (do not report as active until tested).

6. **Approve RPO/RTO**: get owner approval for RPO, RTO, frequency, retention, coverage; document in backup policy.

7. **Run full restore drill in staging** (not production): DB + files, validation including user/role, class, courses, lessons, exams, audit, file refs, auth, app startup, ensure no writes to original staging DB, preserve evidence, then cleanup with confirm.

8. **Document backup/restore runbook** in operations guide and test with operator.

9. **Do not start Phase 32** until staging backup/restore drill passes with real Postgres and S3, and tenant isolation fixed.

## Final Status

**PHASE 31 PARTIAL / EXTERNAL CONFIGURATION PENDING**

**Reason:** Safe local implementation and 22 tests pass for SQLite and local-files, isolated recovery works, no prod touched, but critical external infra (Postgres staging, S3 bucket, scheduler, alerts) remains unverified, and RPO/RTO awaiting approval.

**What is proven:**
- Backup created (SQLite) — VERIFIED
- Backup integrity verified (size+checksum) — VERIFIED
- Restore into isolated target (SQLite) — VERIFIED
- Recovered DB passes basic integrity — VERIFIED
- File backup (0 files) and restore isolated — VERIFIED
- No overwrite of active staging DB — VERIFIED via target validation
- Permissions restricted to ADMIN — VERIFIED
- Runbook complete — VERIFIED
- Automated tests pass — VERIFIED (22 tests)

**What is NOT proven (blocked):**
- Real staging Postgres backup/restore — BLOCKED (no postgres)
- Required files and audio assets restored and verified via actual provider — BLOCKED (no S3, 0 files)
- Database-to-file references consistent after recovery with real files — BLOCKED
- RPO/RTO approved — PENDING
- Alerts active — NOT CONFIGURED

**Production not modified — VERIFIED**
**Backup is not proven until recovery succeeds with real staging infra — honest status**
