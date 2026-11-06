# Phase 30 — File Lifecycle and Database Consistency Report

**Date:** 2026-10-10
**Status:** VERIFIED (code review) / NOT VERIFIED (concurrent update tests)

## Review of File-Related Database Operations

### ContentMedia
- **Create:** `saveContentMedia` now uses secureUpload → storage first, then DB create; on DB failure, deletes orphan
- **Read:** `readContentMedia` downloads via adapter or legacy fallback
- **Update:** No update endpoint — replacement would create new row with version+1 and replacedById (future)
- **Delete:** No hard delete, only `archivedAt` soft-delete (existing)
- **Concurrent updates:** No locking; two simultaneous uploads for same contentItem could create two rows, last wins in UI — no optimistic locking

### MessageAttachment
- **Create:** `saveAttachment` similar: storage first, then DB, cleanup on failure
- **Read:** `readAttachment` via adapter or legacy
- **Update:** No update
- **Delete:** No delete, only message soft-delete (deletedAt) hides message but attachment file remains — **potential sensitive file still accessible via direct ID if participant**
- **Concurrent:** No locking

### Certificates
- **Create:** transaction with allocatePublicId, render PDF, create certificate + version, all in `prisma.$transaction`
- **Correct:** creates new certificate with new publicId, supersedes old, old kept
- **Revoke:** transaction update status + create revocation
- **Delete:** No delete, only status change (REVOKED, SUPERSEDED, EXPIRED)
- **Consistency:** uses transactions, good

### Audio (new)
- **Create:** `uploadAudioRecording` storage first, then caller should save DB record (not yet wired)
- **No versioning yet**

## Lifecycle Requirements

### Replacing a file does not destroy prior version unexpectedly
- **Before:** old file overwritten? No, old code used random name, so replacement created new file, old file remained orphaned on disk (no cleanup)
- **After:** new code generates new random key each time, so prior version not destroyed; `version` field and `replacedById` intended for tracking, but replacement flow NOT IMPLEMENTED — currently each upload creates new row, old row still points to old file
- **Status:** PARTIALLY VERIFIED — prior version not destroyed (good), but no explicit version chain yet

### Deleting a database record does not accidentally leave sensitive files accessible
- **ContentMedia:** soft-delete via archivedAt, file remains on disk/S3 — if archived, readContentMedia throws 404, so file not accessible via API, but file still on storage (orphan) — should be cleaned via retention process
- **MessageAttachment:** message soft-delete (deletedAt) hides message body but attachment still downloadable if participant knows ID? `readAttachment` checks participant, not message deletedAt, so attachment remains accessible even after message deleted — **gap**
- **Status:** PARTIALLY VERIFIED — soft-delete prevents API access for content, but message attachment remains accessible after message deletion

### Deleting an object does not silently corrupt a still-referenced resource
- If file deleted from storage but DB record remains, download will 404 (missing object) — reliability report detects
- No foreign key from file to storage, so DB record can point to missing object — should be flagged, not auto-deleted
- **Status:** VERIFIED (code returns 404, logs missing)

### Concurrent updates do not cause metadata to point to wrong object
- No transaction between storage and DB (can't share transaction) — compensating action used
- Concurrent uploads: each generates unique key, so no overwrite, but two DB rows could point to two different files for same logical resource — last write wins in UI, but no corruption of pointer
- **Status:** PARTIALLY VERIFIED — no wrong pointer, but no concurrency control

### Retries do not create duplicate records or uncontrolled object copies
- **Before:** retry could create duplicate DB records if first DB create succeeded but client timed out and retried
- **After:** secureUpload generates new key each time, so retry creates new object + new DB row → duplicate — should use idempotency key
- **Status:** NOT IMPLEMENTED — idempotency not handled

### Failed operations can be reconciled
- Reliability report lists missing objects and checksum mismatches
- Orphan cleanup via safeDeleteFile with dryRun
- **Status:** PARTIALLY VERIFIED — detection coded, reconciliation manual

## Compensating-Action Strategy (Where DB and Storage Cannot Share Transaction)

- **Implemented:** storage first, then DB; on DB failure, delete storage object (compensating action)
- **Not implemented:** DB first, then storage — would leave DB record pointing to missing file; we avoid this by doing storage first
- **For S3:** S3 has no transaction, so same pattern
- **For certificates:** DB Bytes stored in same transaction as metadata (since Bytes in DB), so no need for compensating action — good
- **Status:** VERIFIED (pattern implemented)

## Changes Made

- Refactored content/media.ts and communication/messages.ts to storage-first + DB + cleanup
- Added version, replacedById, updatedAt to ContentMedia, version, updatedAt to MessageAttachment
- Created reliability.ts with integrity checks and safeDeleteFile

## Remaining

- Implement replacement flow with versioning (create new row, set replacedById on old, archive old)
- Fix message attachment still accessible after message soft-delete — should check message.deletedAt in readAttachment
- Add idempotency key to upload (e.g., client-generated UUID, server checks if already exists)
- Add optimistic locking (version check) for concurrent updates
- Test concurrent uploads and retries against staging (NOT VERIFIED)
