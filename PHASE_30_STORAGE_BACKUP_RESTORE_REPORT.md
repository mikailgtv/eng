# Phase 30 — Storage Backup and Restore Report

**Date:** 2026-10-10
**Status:** NOT VERIFIED (no live bucket, no backup tested) — documentation only

## Actual Backup Capabilities of Configured Storage Provider

### Local provider (current)
- **Backup:** None — files on ephemeral disk (Netlify Functions) or local VM disk, not backed up automatically
- **Versioning:** None — overwrite creates new file with new key, old file remains but no versioning
- **Restore:** Manual copy from backup if exists, but no backup exists
- **Status:** NOT VERIFIED — no backup configured

### S3 provider (recommended, not yet live)
- **S3 backup capabilities (if configured):**
  - **Versioning:** Enable bucket versioning — keeps all versions of object, can restore previous version
  - **Cross-Region Replication (CRR):** Replicate to another region/bucket for disaster recovery
  - **Object Lock / Retention:** WORM for compliance
  - **Lifecycle policies:** Transition to Glacier for cost, expire old versions
  - **Inventory:** S3 Inventory report daily CSV of all objects
  - **Backup via:** S3 backup to another bucket, or AWS Backup service
  - **Restore:** Version recovery via S3 console/API, or restore from Glacier
- **Status:** NOT VERIFIED — no bucket exists in this environment, no S3 credentials, no SDK

### Database (for comparison)
- Database backups and object-storage backups are separate concerns — documented
- Phase 28.4 says PostgreSQL staging backup NOT VERIFIED, SQLite source preserved but not production backup
- Certificate PDFs stored as Bytes in DB would be included in DB backup, but content/media files on disk/S3 would NOT be included in DB backup alone

## Tests Required (Where Available)

- **Object inventory:** List all objects in bucket (S3 listObjectsV2) — NOT TESTED (no bucket)
- **Metadata export:** Export ContentMedia and MessageAttachment tables to CSV/JSON — NOT TESTED (no staging DB)
- **Version recovery:** Upload file, overwrite with new version, restore old version via S3 versioning — NOT TESTED
- **Restoration of representative files:** Pick 3 files (image, pdf, audio), delete, restore from backup/version — NOT TESTED
- **Checksum comparison:** After restore, verify SHA256 matches original — NOT TESTED (code for checksum exists, but no restore test)
- **Recovery of file-to-database relationships:** After restore, ensure DB storagePath still points to restored object and download works — NOT TESTED

## Destructive Restore Tests

- **We did NOT perform destructive restore tests against production** — per safety rules, never modify production storage or data
- All restore tests must be in isolated staging environment with separate bucket

## Changes Made

- Documented backup capabilities and gaps
- Added checksum field to enable verification after restore
- Added reliability report to detect missing objects (which would be needed after restore)
- Created `safeDeleteFile` with dryRun to avoid accidental deletion before backup verified

## Required External Configuration

- **For staging:**
  - Create S3 bucket `englishbridge-staging-storage` (private, versioning enabled, encryption SSE-S3 or KMS)
  - Enable S3 Inventory, lifecycle (transition to IA after 90 days)
  - Create IAM role with PutObject, GetObject, DeleteObject, ListBucket limited to bucket
  - Store credentials in staging secret store (not in repo)
  - Set `STORAGE_PROVIDER=s3`, `STORAGE_S3_BUCKET`, `STORAGE_S3_REGION`, `STORAGE_S3_ACCESS_KEY_ID`, `STORAGE_S3_SECRET_ACCESS_KEY` in staging env
  - Run integration tests: upload, download, version recovery, inventory

- **For production:**
  - Similar bucket `englishbridge-prod-storage` with versioning, CRR to backup region, Object Lock if needed
  - Separate credentials, no overlap with staging
  - Backup verification via S3 Inventory and periodic restore drill in staging (not prod)

## Known Limitations

- Local storage has no backup — must not be used in production
- S3 backup NOT VERIFIED in this environment
- No automated backup/restore tests exist yet
- Database backup does NOT cover object storage

## Recommendation

- Do not mark storage backup as working until staging bucket exists and restore tests pass
- Document backup/restore runbook in `PHASE_26_DISASTER_RECOVERY.md` style but for storage
- Add periodic reliability report cron to detect missing objects
