# Phase 30 — Security Findings

**Date:** 2026-10-10
**Severity:** CRITICAL/HIGH/MEDIUM/LOW/INFO — no hiding

## CRITICAL

### 1. Local disk not durable on Netlify Functions — potential data loss
- **Evidence:** `src/lib/content/media.ts` and `messages.ts` used `process.cwd()/storage` — ephemeral on Netlify, lost on deploy, not shared across instances
- **Impact:** User files lost after deploy, not available on other instances
- **Recommendation:** Use S3-compatible durable storage in staging/production, local only for dev
- **Status:** MITIGATED in code (adapter abstraction, env separation, S3 skeleton), but S3 not yet live — requires external config

### 2. ContentMedia cross-tenant / cross-teacher IDOR (from Phase 29, still present)
- **Evidence:** `readContentMedia` only checks STUDENT role blocked, not uploader, group, or organization scope; ContentMedia model has no org/group link
- **Impact:** Any teacher/admin can download any content media, even from other tenant/org
- **Recommendation:** Add organizationId/groupId to ContentMedia, enforce scope in readContentMedia, add regression tests with two orgs
- **Status:** OPEN — not fixed in Phase 30 (out of scope for storage hardening, but documented)

## HIGH

### 3. Message attachment accessible after message soft-delete
- **Evidence:** `readAttachment` checks participant, not `message.deletedAt`; message delete sets deletedAt but attachment remains downloadable
- **Impact:** Deleted message's attachment still accessible to participants (maybe intended, but should be explicit)
- **Recommendation:** Check message.deletedAt in readAttachment, or document that attachments remain after message deletion
- **Status:** OPEN — documented as gap

### 4. No S3 integration — local is not production backup
- **Evidence:** No S3 bucket, no versioning, no CRR, no backup
- **Impact:** No durable backup for files
- **Recommendation:** Create staging/prod S3 buckets with versioning, inventory, lifecycle, CRR
- **Status:** OPEN — requires external infra

## MEDIUM

### 5. Large file handling still buffers entire file in memory
- **Evidence:** `file.arrayBuffer()` → Buffer → writeFile, and download `new Uint8Array(file.bytes)` — loads full file into memory
- **Impact:** OOM for large files, exceeds Netlify 6 MB limit, no streaming
- **Recommendation:** Implement streaming upload (busboy) and streaming download (adapter.stream() or S3 signed URL)
- **Status:** OPEN — streaming interface defined but not implemented

### 6. No malware scanning
- **Evidence:** No ClamAV or similar, only magic bytes check
- **Impact:** Malicious files could be stored (though blocked extensions help)
- **Recommendation:** Document limitation (done), consider adding scanning via external service or S3 Object Lambda
- **Status:** ACKNOWLEDGED — not claimed malware-free

### 7. No rate limiting on uploads/downloads
- **Evidence:** `assertContentRate` exists for content but not for messages attachments? Check: content/media POST has `assertContentRate`, messages attachments POST does not have rate limit
- **Impact:** Abuse, cost, quota exhaustion
- **Recommendation:** Add rate limiting per user/IP for uploads and downloads, log abuse via monitoring
- **Status:** PARTIALLY OPEN — content has rate limit, messages does not

### 8. Signed URLs not implemented, but local adapter returns null — could be misused as auth
- **Evidence:** S3 adapter `generateSignedUrl` throws "requires SDK", local returns null
- **Impact:** If code ever uses signed URL as auth without checking permission first, could bypass auth
- **Recommendation:** Ensure permission checked before generating signed URL (documented in code), and never log full URL
- **Status:** MITIGATED — permission check documented, logging only prefix

## LOW

### 9. No quota monitoring / usage reporting
- **Evidence:** No tracking of total bytes per user/group/tenant
- **Impact:** No visibility into storage abuse or cost
- **Recommendation:** Implement quota tracking and `logQuotaExhausted`
- **Status:** OPEN

### 10. No retention policy documented for files
- **Evidence:** Communication settings have retention for messages/notifications but not for files
- **Impact:** Files kept forever, privacy risk
- **Recommendation:** Document retention (e.g., private files 1 year, audio 90 days, public covers indefinite) and implement cleanup with safeDeleteFile dryRun
- **Status:** OPEN

## INFO

### 11. Certificate PDFs stored as Bytes in DB — not in object storage
- **Evidence:** `Certificate.pdfBytes Bytes` — small PDFs, okay for now, but not scalable
- **Impact:** DB bloat if many certificates
- **Recommendation:** Keep as is for now (small, needs transaction with metadata), or move to S3 with DB pointer later
- **Status:** ACKNOWLEDGED — not a vulnerability, but scalability note

### 12. No idempotency for uploads — retry creates duplicate
- **Evidence:** secureUpload generates new random key each time, no idempotency key
- **Impact:** Duplicate files on retry
- **Recommendation:** Add client-generated idempotency key (UUID) and server checks if already exists
- **Status:** OPEN

## Summary

- **CRITICAL:** 2 (1 mitigated in code but requires S3, 1 still open from Phase 29)
- **HIGH:** 2 (1 open, 1 requires infra)
- **MEDIUM:** 4
- **LOW:** 2
- **INFO:** 2

**No unresolved critical storage security issue that is newly introduced in Phase 30 remains — but existing CRITICAL from Phase 29 (tenant isolation) still open and requires fix before READY.**

**Production not touched — VERIFIED (no prod env, no prod storage modified)**
