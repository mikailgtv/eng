# Phase 31 — Restore Runbook

**Date:** 2026-10-10
**Audience:** Platform operator / admin
**Safety:** Staging-only, never production, isolated disposable targets

## Prerequisites

- Verify backup exists and is VERIFIED (status VERIFIED, verificationStatus PASSED)
- Verify manifest integrity via `verifyManifestIntegrity` (size + checksum)
- Ensure isolated recovery environment available (disk space, separate DB)
- Ensure `BACKUP_RECOVERY_DIR` is set and is under `backups/recovery` (not active DB)
- For Postgres: `BACKUP_RECOVERY_DATABASE_URL` must be set to disposable DB, not active `DATABASE_URL`
- ADMIN role required
- Never restore into production or active staging DB

## Procedures

### 1. Running a manual database backup

**Via API (ADMIN):**
```bash
curl -X POST https://staging.example.com/api/admin/backups/database \
  -H "Content-Type: application/json" \
  -H "Cookie: session=..." \
  -d '{"reason":"Manual backup before content import"}'
```
**Response:** backupId, status, size, duration, verified

**Via code (local dev):**
```ts
import { createDatabaseBackup } from "@/lib/backup/database";
const result = await createDatabaseBackup({ createdBy: "admin-id", notes: "Manual" });
console.log(result.manifest.backupId, result.manifest.status);
```

**Checks:**
- Manifest status VERIFIED
- Checksum present
- Size >0
- Duration recorded

### 2. Running a manual files backup

**Via API:**
```bash
curl -X POST https://staging.example.com/api/admin/backups/files \
  -H "Content-Type: application/json" \
  -H "Cookie: session=..." \
  -d '{"reason":"Before course update"}'
```

**Via code:**
```ts
import { createFilesBackup } from "@/lib/backup/files";
const result = await createFilesBackup({ createdBy: "admin-id" });
```

### 3. Checking latest backup status

**Via API:**
```bash
curl https://staging.example.com/api/admin/backups/status -H "Cookie: session=..."
```

**Via UI:**
- Navigate to `/admin/backups` (ADMIN only) — shows latest DB/files backup time, status, total, last verified, incidents

**Via code:**
```ts
import { listDatabaseBackups, listFilesBackups } from "@/lib/backup/database/files";
const dbs = await listDatabaseBackups();
console.log(dbs[0]);
```

### 4. Verifying backup integrity

**Database:**
```ts
import { getDatabaseBackupDir, verifyManifestIntegrity } from "@/lib/backup/manifest";
import path from "path";
const manifestPath = path.join(getDatabaseBackupDir(), `${backupId}.json`);
const dataPath = path.join(getDatabaseBackupDir(), `${backupId}.dump`);
const res = await verifyManifestIntegrity(manifestPath, dataPath);
console.log(res.valid ? "PASSED" : `FAILED: ${res.reason}`);
```

**Files:**
```ts
import { verifyFilesBackup } from "@/lib/backup/files";
const res = await verifyFilesBackup(backupId);
console.log(res);
```

### 5. Performing an isolated restore drill

**Safety checks before every restore:**
- Validate target identity: must be under `BACKUP_RECOVERY_DIR`, must not be active `DATABASE_URL`, must not be production
- Function `validateRestoreTarget("isolated", targetPath)` enforces

**Via API (ADMIN):**
```bash
curl -X POST https://staging.example.com/api/admin/backups/restore-drill \
  -H "Content-Type: application/json" \
  -H "Cookie: session=..." \
  -d '{
    "databaseBackupId": "db-20261010-041000-abc123",
    "filesBackupId": "files-20261010-041200-def456",
    "reason": "Quarterly restore drill"
  }'
```

**Response:** restoreId, databaseRestore status, filesRestore, validation, cleanupRequired

**Via code:**
```ts
import { createIsolatedRecoveryDb, restoreFilesBackup, runRecoveryValidation } from "@/lib/backup/recovery";

const dbRestore = await createIsolatedRecoveryDb(backupId, userId, "drill");
if (dbRestore.status === "SUCCESS") {
  const filesRestore = await restoreFilesBackup(filesBackupId, `${dbRestore.target}-files`);
  const validation = await runRecoveryValidation(dbRestore.targetPath, backupId);
  console.log(validation);
}
```

**Steps in code (repeatable workflow):**
1. Select backup via authorized workflow (ADMIN API)
2. Verify manifest, integrity, compatibility (readManifest, verifyManifestIntegrity)
3. Create isolated recovery DB (mkdir under recovery base, copy dump or pg_restore into disposable DB)
4. Restore files (copy from backup content dir to isolated target)
5. Validate schema/migration compatibility (check file exists, size, sqlite_master count)
6. Validate references (file metadata vs objects, row counts)
7. Run app-level checks (auth, startup)
8. Record result (restoreId, duration, validation)
9. Cleanup only after evidence preserved and confirmed safe (via cleanup endpoint with confirm:true)

### 6. Responding to a failed backup

- Check manifest status FAILED/CORRUPTED, reason in logs
- Alerts: `alertFailedBackup` logs [backup:FAILED_BACKUP] CRITICAL
- Actions:
  - Check disk space, DB connectivity, pg_dump availability
  - Check for concurrent backup lock
  - Retry manual backup
  - Investigate logs (no secrets)
  - Preserve failed artifact for investigation (don't auto-delete)

### 7. Responding to corrupted backup artifacts

- Integrity check fails: size mismatch, checksum mismatch, pg_restore --list fails
- Alert: `alertIntegrityFailed`
- Actions:
  - Mark manifest as CORRUPTED
  - Do not use for restore
  - Check storage near capacity
  - Create new backup
  - Keep corrupted for investigation, then delete after new verified backup exists

### 8. Responding to missing file objects

- Reliability report lists missingObjects
- Alert: MISSING_OBJECT via monitoring
- Actions:
  - Check storage provider (local dir exists? S3 bucket accessible?)
  - Check if file was deleted manually
  - Restore from file backup if available
  - Reconcile DB references (mark as missing, not auto-delete)

### 9. Recovering after accidental deletion

- **Database record deleted:** Restore from DB backup into isolated target, extract record, re-insert into staging (manual, careful)
- **File deleted:** Restore from file backup (copy from backup content dir to storage)
- **Both:** Restore drill, then copy needed data
- Never restore full backup into active staging without approval and isolated test first

### 10. Rotating compromised backup credentials

- If BACKUP_ENCRYPTION_KEY or S3 keys compromised:
  - Rotate keys in secret store (env)
  - Old backups remain encrypted with old key until expired
  - New backups use new key
  - No need to re-encrypt old backups unless policy requires
  - Log rotation action (no secret)

### 11. Investigating a failed restore

- Preserve original backup (don't delete)
- Check restore result error field
- Check target validation (was it under recovery base? not active DB?)
- Check disk space, DB connectivity, pg_restore/sqlite3 availability
- Check manifest status (must be VERIFIED)
- Retry with same backup into new isolated target

### 12. Safely cleaning up disposable recovery environments

**Via API (ADMIN, requires confirmation):**
```bash
curl -X POST https://staging.example.com/api/admin/backups/restore-drill/cleanup \
  -H "Content-Type: application/json" \
  -H "Cookie: session=..." \
  -d '{"restoreId":"restore-20261010-041500-xyz789","confirm":true}'
```

**Via code:**
```ts
import { cleanupRecoveryEnvironment } from "@/lib/backup/recovery";
const res = await cleanupRecoveryEnvironment(restoreId);
```

**Safety:**
- Validates target under recovery base
- Only deletes after evidence preserved
- Never deletes active DB

### 13. Escalating infrastructure or provider failures

- If pg_dump not available, S3 not reachable, disk full, etc.:
  - Log alert via monitoring (FAILED_BACKUP, STORAGE_NEAR_CAPACITY, etc.)
  - Check `getMonitoringStatus()` — if no channels configured, alert is only in logs, not sent
  - Escalate to infra team with backupId, error (no secrets), timestamp
  - Document blocker in PHASE_31_BLOCKERS.md

## Alerts

- **MISSED_BACKUP:** Expected backup not created (requires scheduler)
- **FAILED_BACKUP:** Backup creation failed
- **INTEGRITY_FAILED:** Checksum/size verification failed
- **STORAGE_NEAR_CAPACITY:** Backup storage >80% (WARNING) or >90% (CRITICAL)
- **MISSING_ARTIFACT:** Backup file missing
- **RESTORE_DRILL_FAILED:** Restore drill failed
- **FILE_BACKUP_FAILED:** File backup failed

**Alert channels:** Webhook, email, slack — configured via BACKUP_ALERT_* env vars. Currently NOT CONFIGURED in this env, so alerts only in logs. Do not report alerts as active unless channel tested.

## Evidence Preservation

- After restore drill, preserve:
  - restoreId, backupId, target path (masked), duration, validation result
  - Manifests of backups used
  - Logs (no secrets)
- Only cleanup after evidence saved
