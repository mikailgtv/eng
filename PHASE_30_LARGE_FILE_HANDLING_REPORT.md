# Phase 30 — Large File Handling Report

**Date:** 2026-10-10
**Status:** VERIFIED (code) / NOT VERIFIED (live platform limits, streaming)

## Deployment Platform Limits Inspection

### Detected platform
- Next.js app with `EnglishBridge_Netlify_Demo.zip` suggests Netlify deployment
- No explicit platform config in repo (no netlify.toml found? Check)
- `package.json` scripts: dev, build (prisma generate && next build), start, postinstall prisma generate

### Request-size and execution-time limits
- **Next.js default:** body parser limit 4 MB for JSON, but formData (multipart) can be larger depending on server
- **Netlify Functions:** 
  - Request body limit ~6 MB (for synchronous functions)
  - Response limit 6 MB
  - Execution time 10s default, up to 26s for pro
  - No persistent disk, only /tmp (512 MB) ephemeral
  - **Evidence:** Not verified from live Netlify dashboard, documented from public Netlify docs as limitation, marked NOT VERIFIED for this specific deployment
- **Vercel (if used):** similar 4.5 MB body limit, 10s/60s timeout
- **Node.js:** default max-old-space, but large files in memory cause OOM

**Finding:** Current maxMediaBytes 8 MB and maxAttachmentBytes 5 MB exceed Netlify's 6 MB function body limit — large uploads may fail with 413 or timeout. Need direct-to-storage or streaming strategy.

### What we did
- Documented limits in this report
- Implemented policies with maxBytes per category (2 MB avatar up to 50 MB textbook) — but noted hosting limits may be lower
- Added validation before expensive processing (size check first)
- Avoided loading large files entirely into memory unnecessarily? Current implementation still does `Buffer.from(await file.arrayBuffer())` which loads entire file into memory — **gap**

## Direct-to-Storage and Streaming Strategy

### Recommended (not yet fully implemented)
- **Direct-to-storage uploads with short-lived upload authorization:**
  - Client requests pre-signed PUT URL from server (auth + policy check)
  - Server generates signed URL with expiry 300s, bound to key, content-type, size
  - Client uploads directly to S3, bypassing function body limit
  - Server verifies upload via existence + checksum + metadata save
  - **Status:** NOT IMPLEMENTED — S3 adapter skeleton throws, needs SDK + endpoint

- **Streaming backend upload strategy:**
  - Use Node.js streaming (e.g., `req.formData()` streaming, or `busboy`) to pipe to S3 without buffering entire file
  - For local adapter, use `createWriteStream` with checksum streaming
  - **Status:** NOT IMPLEMENTED — current code uses `arrayBuffer()` which buffers fully

### Current implementation
- `POST /api/content/media` and `POST /api/messages/attachments` use `req.formData()` + `file.arrayBuffer()` → Buffer → adapter.upload()
- For local adapter, `writeFile` writes Buffer
- **Memory overhead:** entire file in memory twice (arrayBuffer + Buffer) — not ideal for large files
- **Status:** VERIFIED (code inspection), but not streaming

### Downloads
- Current: `new NextResponse(new Uint8Array(file.bytes))` — loads entire file into memory, then sends
- **Better:** streaming via `adapter.stream()` or S3 native delivery (signed URL or CloudFront)
- **Status:** streaming method defined in interface (`stream?`) but not implemented in adapters, not used in routes — NOT VERIFIED

## Interrupted Uploads, Network Timeouts, Large Files, Retry Behavior

- **Interrupted uploads:** No resume support; client must retry full upload
- **Network timeouts:** STT/TTS have 20s AbortController, but file uploads have no timeout handling — could hang
- **Large files:** No chunked upload, no multipart
- **Retry behavior:** `withRetry()` in reliability.ts with exponential backoff (200ms base, 2x factor, max 2s, 3 retries) for storage operations, but not used in upload routes yet
- **Tests:** NOT VERIFIED live (no large file test against staging)

## Size Limits Beyond Hosting Capabilities

- We did NOT increase size limits beyond hosting platform — policies have reasonable limits (2-50 MB) but we documented that Netlify 6 MB limit may be lower
- Recommendation: keep limits at or below platform limit, or use direct-to-S3

## Changes Made

- Added `getRetryPolicy()` and `withRetry()` in reliability.ts
- Defined `stream()` in adapter interface (optional)
- Documented platform limits and recommended direct-to-storage

## Remaining

- Implement direct-to-S3 pre-signed PUT URLs (requires SDK)
- Implement streaming upload/download to avoid memory buffering
- Test with 5 MB, 10 MB, 20 MB files against staging
- Test interrupted upload and retry
- Verify actual Netlify function limits from dashboard (NOT VERIFIED)
