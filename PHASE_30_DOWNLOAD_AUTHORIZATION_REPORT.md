# Phase 30 — Download Authorization Report

**Date:** 2026-10-10
**Status:** VERIFIED (code) / NOT VERIFIED (live cross-user tests against staging DB)

## Download Endpoints

### Content Media `GET /api/content/media/[id]`
- **Authentication:** `requireApiUser()` — 401 if no session
- **Resource ownership:** checks `uploadedById`? Currently only role check, not owner — **limitation documented**
- **Student/teacher/admin permissions:** STUDENT blocked (404), TEACHER/ADMIN allowed (via `readContentMedia` role check)
- **Class/course scope:** NOT ENFORCED — ContentMedia has no group/course link except optional contentItemId; Phase 29 found org scope bypass, still present
- **Tenant/org scope:** NOT ENFORCED — no organizationId in ContentMedia model
- **File existence:** adapter `exists()` + download, 404 if missing, logs missing object
- **Headers:** Content-Type from DB, Content-Disposition `attachment; filename="safe"; filename*=UTF-8''encoded`, Cache-Control `private, no-store, max-age=0, must-revalidate`, X-Content-Type-Options nosniff, Content-Security-Policy default-src 'none', X-Request-Id UUID
- **Safe filename:** sanitized via `safeDispositionFileName()` — replaces unsafe chars, max 80, removes quotes, fallback "file"
- **Cache policy:** private, no-store — prevents CDN caching of private files
- **Inline execution prevention:** attachment disposition + CSP default-src 'none' + nosniff

### Message Attachment `GET /api/messages/attachments/[id]`
- **Authentication:** `requireApiUser()`
- **Ownership:** checks conversation participants via `file.message.conversation.participants.some(userId === viewer.id)` — VERIFIED in code
- **Permissions:** only participants can download, not just any authenticated user
- **Class/course scope:** via conversation membership (group message creates separate direct convos)
- **Tenant scope:** via participant check (tenant isolation depends on group assignment, not directly in file model)
- **File existence:** adapter exists + download, 404 if missing
- **Headers:** same safe disposition, private no-store, nosniff, CSP none, request ID
- **Safe filename:** same sanitization

### Certificates `GET /api/certificates/download/[token]`
- **Authentication:** `requireApiUser()`
- **Authorization:** `downloadCertificate()` checks student ownership or teacher/admin with group access (via `visibleStudent`)
- **Token:** unguessable random 32-byte hex, not publicId, not predictable
- **Headers:** application/pdf, attachment, private no-store, nosniff
- **Status:** VERIFIED in code, but cross-user tests NOT VERIFIED live

### Transcript `GET /api/certificates/transcript`
- Similar to certificate download, with audit

## Private and Public Access Classification

From `FILE_POLICIES`:

- **Public only if explicitly intended:** profile_avatar, book_cover (PUBLIC)
- **Restricted (course/group policy):** textbook_document, course_document, lesson_image, lesson_attachment, lesson_audio, listening_audio, content_media, admin_import, teacher_feedback (RESTRICTED)
- **Private:** assignment_submission, certificate, audio_recording, speaking_practice, message_attachment (PRIVATE)

**Enforcement:**
- Private objects must not be directly exposed through predictable permanent public URLs — VERIFIED: content media URL is `/api/content/media/{id}` which requires auth + role check, not direct storage URL; message attachment same; certificates use unguessable token + auth
- Server-side authorization for every read/download/replacement/deletion — VERIFIED for content and messages (role + participant), but org/group scope missing for content (documented as limitation)
- Signed URLs: where supported (S3), keep expiration short (300s default, configurable via STORAGE_SIGNED_URL_EXPIRY 1-3600), bind to object+operation, avoid logging full URL (only keyPrefix logged), not used as substitute for permission check (permission checked before generating URL) — code in `s3.ts` validates expiry, but actual generation requires SDK (NOT VERIFIED)

## Direct URL Access Tests

**Required tests (per spec):**
- Direct URL access without auth → should 401 — code has `requireApiUser()`, but NOT TESTED live
- Modified file IDs → should 404 if not owned/participant — code does, NOT TESTED live
- Cross-student access → message attachment participant check should block — code does, NOT TESTED live (needs staging DB with two students)
- Cross-teacher access → content media role check allows any teacher, not just uploader — **potential IDOR**, documented as HIGH in Phase 29, still present
- Unauthorized downloads → 401/404 — code does, NOT TESTED live

**Status:** All download security tests are NOT VERIFIED against staging because staging PostgreSQL is unavailable (Phase 28.4). Static code review shows participant check for messages is good, but content media lacks owner/group/tenant scope.

## Safe Content-Disposition

- Uses `attachment` to prevent inline execution
- Filename sanitized, max 80, no quotes, no path separators
- Includes both `filename="safe"` and `filename*=UTF-8''encoded` for RFC compliance
- Prevents header injection via regex replacement

## Cache Policy

- `private, no-store, max-age=0, must-revalidate` for all private/restricted files
- No public caching
- For public avatars/covers (future), could use `public, max-age=3600` but currently all downloads use private no-store (safe default)

## Remaining Gaps

- ContentMedia missing org/group scope check — cross-tenant exposure possible (CRITICAL candidate from Phase 29)
- No signed URL integration test (S3 SDK not installed, no bucket)
- No rate limiting on downloads (could be abused)
- No audit log for downloads (only uploads) — should add download audit for private files
