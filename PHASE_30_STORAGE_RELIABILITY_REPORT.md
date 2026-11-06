# Phase 30 — Storage Reliability Report

**Date:** 2026-10-10
**Status:** VERIFIED (code) / NOT VERIFIED (live reliability against staging bucket)

## Object Existence Checks

- Implemented in adapters: `exists(key)` uses `stat` (local) or Map.has (memory)
- Used in `secureUpload` after upload, in `generateReliabilityReport`, in download paths
- **Status:** VERIFIED (unit tests)

## Checksum Verification

- SHA256 computed via `createHash("sha256")`
- On upload: compute before, verify after write (read back and compare)
- On download: if file has stored checksum, compare with computed
- `verifyChecksum(key, expected)` method in adapters
- **Status:** VERIFIED (unit tests for checksum mismatch)

## Orphaned-File Detection

- `checkContentMediaIntegrity()` and `checkMessageAttachmentIntegrity()` list all DB records, check existence, report missing
- Orphaned-file detection (files on disk/S3 not in DB) NOT IMPLEMENTED — would require listing bucket/directory and comparing to DB
- **Current:** only missing-object detection (DB record without file), not orphaned files (file without DB record)
- **Status:** PARTIALLY VERIFIED (missing detection coded, orphan detection NOT IMPLEMENTED)

## Missing-Object Detection

- Implemented in reliability.ts: `generateReliabilityReport()` returns missingObjects arrays for content and messages
- Logs via `logMissingObject()` with fileId and keyPrefix (no secrets)
- **Status:** VERIFIED (code)

## Failed-Upload Recovery

- `secureUpload()`:
  - If storage succeeds but DB fails: compensating delete of object, log, throw 500
  - If verification fails after upload: delete + 500
  - If upload fails: log and throw 500, no DB record created
- **Status:** VERIFIED (code)

## Retry Policy

- `getRetryPolicy()`: maxRetries 3, baseDelay 200ms, maxDelay 2000ms, backoffFactor 2, retryableErrors list
- `withRetry()` implements exponential backoff
- **Status:** VERIFIED (code), but NOT USED in upload/download routes yet — should be integrated

## Safe Deletion Policy

- `safeDeleteFile()` with dryRun option: if dryRun true, only logs orphaned metadata, does not delete
- Actual delete via adapter.delete()
- **Requirement:** Do not automatically delete objects merely because DB record appears orphaned — generate report and require safe retention process before destructive cleanup
- **Implementation:** `safeDeleteFile` has dryRun, reliability report lists missing, but no auto-delete of orphans — manual review required
- **Status:** VERIFIED (code has dryRun)

## Storage Quota Monitoring

- No quota monitoring implemented — no storage usage tracking per user/group/tenant
- `logQuotaExhausted()` exists in monitoring.ts but not called anywhere
- **Status:** NOT IMPLEMENTED

## File Retention Policy

- ContentMedia has `archivedAt` for soft-delete, but no retention policy (e.g., keep 365 days, then archive)
- MessageAttachment has no retention
- Communication settings have `retentionDaysNotifications` and `retentionDaysMessages` but not for files
- **Status:** NOT IMPLEMENTED — should document retention policy (e.g., keep private files 1 year, public covers indefinite, audio recordings 90 days unless consent)

## Storage Usage Reporting

- No usage reporting (total bytes per user, per group, per bucket)
- Could be added via `prisma.contentMedia.aggregate({ sum: { sizeBytes } })` + S3 bucket metrics
- **Status:** NOT IMPLEMENTED

## Changes Made

- Created `src/lib/storage/reliability.ts` with:
  - `checkContentMediaIntegrity()`, `checkMessageAttachmentIntegrity()`, `generateReliabilityReport()`, `safeDeleteFile()`, `getRetryPolicy()`, `withRetry()`
- Added checksum indexes in migration
- Added checksum field to models

## Verification

- Unit tests for exists, checksum, delete pass
- Integration test against real S3 bucket NOT VERIFIED (no bucket)
- Orphaned file detection (disk/S3 listing) NOT VERIFIED (not implemented)

## Remaining

- Implement orphaned file detection via S3 listObjectsV2 or fs readdir + DB comparison
- Implement quota monitoring and usage reporting
- Document retention policy
- Wire withRetry into upload/download flows
- Run reliability report against staging
