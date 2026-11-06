# Phase 30 — Storage Test Report

**Date:** 2026-10-10
**Environment tested:** local dev, memory adapter, local adapter with temp dir
**Staging storage provider:** NOT VERIFIED (no S3 bucket/creds)

## Automated Tests Added

### Unit tests (memory adapter)
Location: `src/lib/storage/__tests__/storage.test.ts` (vitest style) and `scripts/test-storage-regression-simple.mjs` (plain Node, runnable with tsx)

**Tests implemented:**

- **Valid upload** — memory adapter upload + download, checksum present — VERIFIED (pass)
- **Invalid extension** — evil.exe rejected — VERIFIED (pass)
- **MIME mismatch** — magic bytes check fails — VERIFIED (pass)
- **Oversized upload** — exceeds policy maxBytes — VERIFIED (pass)
- **Empty file** — rejected — VERIFIED (pass)
- **Malformed file** — fake PNG (text) rejected — VERIFIED (pass)
- **Path traversal attempt** — `../../etc/passwd` rejected in key validation and adapter — VERIFIED (pass)
- **Unauthorized upload** — concept documented, code has actorId check, but live test NOT VERIFIED (requires staging DB)
- **Unauthorized download** — concept, participant check in code, NOT VERIFIED live
- **Cross-student file access** — participant check should block, code has it for messages, NOT VERIFIED live
- **Cross-teacher file access** — content media allows any teacher, not just uploader — potential IDOR, documented
- **Resource ownership validation** — message attachment checks sender, content checks role — VERIFIED in code, NOT VERIFIED live
- **Signed URL expiration** — S3 adapter rejects 0 and >3600 sec — VERIFIED (pass)
- **Duplicate upload request** — overwrites with new version, last wins — VERIFIED (pass)
- **Storage timeout** — NOT VERIFIED live (requires S3 timeout simulation)
- **Database failure after upload** — compensating delete coded, NOT VERIFIED live (requires DB failure injection)
- **Missing object** — exists returns false, download throws — VERIFIED (pass)
- **Checksum mismatch** — verifyChecksum false, download logs mismatch — VERIFIED (pass)
- **Safe deletion** — delete + exists false, dryRun logs only — VERIFIED (pass)
- **Audio upload and processing states** — duration validation, NOT VERIFIED live (no file upload endpoint for audio yet)
- **Staging/production environment separation** — validates env vars, rejects memory in prod, requires S3 vars — VERIFIED (pass)

**Test results:**
- `npx tsx scripts/test-storage-regression-simple.mjs` → 20 passed, 0 failed — VERIFIED

### Integration tests against configured staging storage provider
- **Status:** NOT VERIFIED — no staging S3 bucket, no credentials, no SDK
- **What would be tested:**
  - Upload to real S3 bucket, download, checksum, exists, delete, copy, signed URL generation, expiry
  - Requires `STORAGE_PROVIDER=s3`, bucket, region, keys, endpoint, SDK
  - Must be in isolated staging env, not production

### Distinction mocked vs actual provider tests
- **Mocked (memory):** 20 tests — VERIFIED
- **Actual provider (local temp dir):** 2 tests (upload+checksum, traversal) — VERIFIED
- **Actual provider (S3):** 0 tests — NOT VERIFIED (no bucket)

## Manual Tests (Browser)

- File picker, upload progress, retry after failure, validation messages, audio playback, responsive controls, session expiration during upload, network interruption — NOT VERIFIED (no browser test, but mobile report covers)

## Coverage Gaps

- No test for assignment submission file upload (model doesn't exist)
- No test for book cover upload
- No test for certificate PDF storage (DB Bytes, not object storage)
- No test for large file streaming (stream() not implemented)
- No test for quota exhaustion, abuse detection
- No test for orphaned file detection (requires S3 listing)

## Regression Tests Exist?

- **Yes** for storage abstraction, validation, keys, policies, env separation — 20 tests
- **No** for full upload/download flow with DB and auth (requires staging DB, which is unavailable per Phase 28.4)

## How to Run

```bash
npx tsx scripts/test-storage-regression-simple.mjs
# For vitest style (if vitest installed):
# npx vitest run src/lib/storage/__tests__/storage.test.ts
```

## Known Limitations

- Tests use memory adapter, not real S3 — integration tests pending external config
- No browser-based upload/download tests
- No concurrent update or idempotency tests
