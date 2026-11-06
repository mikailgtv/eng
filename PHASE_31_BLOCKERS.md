# Phase 31 — Blockers

**Date:** 2026-10-10

## BLOCKED

### 1. PostgreSQL staging connectivity and backup

- **Blocker:** No PostgreSQL staging DATABASE_URL configured. Current DATABASE_URL is `file:./prisma/dev.db` (SQLite) or `file:./phase21-sandbox.db` in .env.example. No postgres host, no credentials.
- **Root cause:** Phase 28.4 says PostgreSQL staging and verified backup unavailable. No external provider provisioned.
- **Evidence:** `env | grep DATABASE` shows nothing, `cat .env.example` shows sqlite only, `prisma/schema.prisma` provider sqlite, `ls backups/db` has only sqlite dumps, `pg_dump` not tested with postgres URL.
- **Impact:** Cannot create real staging postgres backup, cannot test pg_dump custom format with live data, cannot measure RPO/RTO for postgres, cannot do PITR or managed snapshots.
- **What can be completed locally:** SQLite backup/restore with file copy, manifest, checksum, isolated recovery — VERIFIED (22 tests pass)
- **What requires external infra:** Provision postgres staging (e.g., Supabase, RDS, Neon), set DATABASE_URL postgres, install pg_dump/pg_restore, set BACKUP_RECOVERY_DATABASE_URL to disposable DB, run backup/restore drill.
- **Exact next action:** Provision postgres staging outside chat, configure DATABASE_URL in staging secret store, verify connectivity (`SELECT 1`), run `createDatabaseBackup` and `createIsolatedRecoveryDb` with postgres, measure durations.

### 2. File storage S3 bucket and backup

- **Blocker:** No S3 bucket configured. STORAGE_PROVIDER defaults to local, STORAGE_S3_BUCKET empty, no @aws-sdk/client-s3 in package.json, S3 adapter throws "requires SDK".
- **Root cause:** Phase 30 left S3 as skeleton, no bucket created.
- **Evidence:** `cat .env.example` shows STORAGE_S3_BUCKET empty, `src/lib/storage/s3.ts` throws, `backups/files` has only local metadata with 0 files.
- **Impact:** Cannot test file backup with real S3, cannot rely on S3 versioning as backup, cannot test signed URL, cannot test large file direct-to-S3.
- **What can be completed locally:** Local-files backup with storage adapter (0 files in dev DB) — VERIFIED, metadata JSON, missing/corrupted detection.
- **What requires external infra:** Create S3 bucket private with versioning, encryption, inventory, lifecycle, CRR; add @aws-sdk/client-s3 and implement real methods; set STORAGE_PROVIDER=s3 and BACKUP_S3_USE_VERSIONING; run file backup/restore.
- **Exact next action:** Create staging bucket `englishbridge-staging-storage`, enable versioning, set env vars in staging, implement S3 adapter methods, run `createFilesBackup` and `restoreFilesBackup`.

### 3. Automated scheduling and alerting

- **Blocker:** No reliable scheduler verified in hosting environment, no alert channels configured.
- **Root cause:** Netlify Scheduled Functions or cron not verified, BACKUP_ALERT_* env vars empty.
- **Evidence:** `getMonitoringStatus()` returns configured false, no webhook/email/slack.
- **Impact:** Cannot test automated daily backups, cannot test missed backup alerts, cannot report alerts as active.
- **What can be completed locally:** Manual backups via API, monitoring functions log to console, policy documented.
- **What requires external:** Configure scheduler (e.g., Netlify scheduled function calling backup API with ADMIN token), configure webhook/email, test missed backup alert.
- **Exact next action:** Choose scheduler (Netlify, GitHub Actions, etc.), set BACKUP_SCHEDULE, configure BACKUP_ALERT_WEBHOOK_URL, test.

## PARTIALLY VERIFIED / NOT IMPLEMENTED

### 4. ContentMedia tenant isolation IDOR (from Phase 29)

- **Status:** Still open, not fixed in Phase 31 (out of scope but blocks READY for full platform)
- **Evidence:** `readContentMedia` only checks STUDENT role, not org/group
- **Impact:** Cross-tenant file disclosure
- **Next action:** Add organizationId to ContentMedia, enforce scope, add two-org test

### 5. Large file streaming and direct-to-S3

- **Status:** NOT IMPLEMENTED
- **Evidence:** `file.arrayBuffer()` buffers full file, no streaming, no pre-signed PUT
- **Impact:** OOM, exceeds Netlify 6 MB limit
- **Next action:** Implement streaming and pre-signed URLs

## Summary

- **Critical blockers for READY:** 3 (Postgres staging, S3 bucket, scheduler/alerts)
- **Safe local implementation:** Complete, 22 tests pass, manifests, isolated recovery, no prod touched
- **External config pending:** Postgres, S3, scheduler, alerts, plus tenant isolation fix
