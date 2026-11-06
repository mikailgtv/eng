# Phase 30 — Upload Security Report

**Date:** 2026-10-10
**Status:** VERIFIED (code) / NOT VERIFIED (live staging with real bucket)

## Secure Upload Pipeline (13 steps)

Implemented in `src/lib/storage/service.ts` `secureUpload()` and enforced in `content/media.ts` and `communication/messages.ts`

1. **Authenticate requester** — `actorId` required, ApiError 401 if missing; route level `requireApiUser()` checks session
2. **Authorize resource and operation** — caller checks role (TEACHER/ADMIN for content, message owner for attachments) before calling secureUpload
3. **Validate file size before expensive processing** — `validateFile()` checks `bytes.length > policy.maxBytes` first
4. **Validate extension and MIME type** — `FILE_POLICIES` per category, BLOCKED_EXTENSIONS set (exe, js, sh, html, svg, bat, cmd, msi, dll, etc.), extension must be in allowed list
5. **Inspect file signatures** — `magicOk()` checks PNG 89 50 4E 47, JPG FF D8, GIF GIF, PDF %PDF, DOCX/XLSX PK, WEBP RIFF+WEBP, WAV RIFF, MP3 ID3/FF, OGG OggS, M4A/MP4 ftyp, WEBM 1A 45
6. **Generate safe internal object key** — `generateObjectKey()` uses randomBytes(16) + sanitized name, structure `resourceType/YYYY/MM/<resourceId>/random-safeName`, max 512 chars
7. **Prevent path traversal** — `validateObjectKey()` rejects `..`, `\`, absolute, leading `/`, control chars, no-slash; `resolveSafePath()` checks resolved path starts with root
8. **Enforce allowed file types by resource category** — separate policies for 16 categories (profile_avatar, textbook_document, course_document, lesson_image, lesson_attachment, lesson_audio, assignment_submission, teacher_feedback, certificate, audio_recording, speaking_practice, listening_audio, message_attachment, content_media, admin_import, book_cover)
9. **Upload to intended private/public location** — `accessLevel` from policy, provider from env, bucket from config
10. **Verify stored object and checksum** — after upload, `exists()` + `verifyChecksum()`; on failure, compensating delete of orphaned object
11. **Save metadata only after storage succeeds, with failure-recovery** — try/catch around Prisma create, on failure delete object and log; if metadata saved but upload fails, file not treated as valid (download will 404)
12. **Record safe audit event** — `audit()` with actorId, action, entityType, fileName, size, checksum prefix (first 16 chars + ...), provider, category, keyPrefix (first 2 segments) — no raw file, no signed URL, no PII
13. **Return only fields client needs** — id, fileName, kind, url (not internal key, not checksum full, not bucket)

## File Type Policies

Defined in `src/lib/storage/policies.ts`

- **Profile avatars:** png,jpg,jpeg,webp, 2 MB, PUBLIC, magic required
- **Textbook/course docs:** pdf,docx,epub,pptx,xlsx, 20-50 MB, RESTRICTED
- **Lesson images:** png,jpg,jpeg,webp,gif, 5 MB, RESTRICTED
- **Lesson attachments:** pdf,docx,png,jpg,mp3,mp4, 15 MB, RESTRICTED
- **Lesson audio:** mp3,wav,m4a,ogg, 20 MB, RESTRICTED
- **Assignment submissions:** pdf,docx,png,jpg,mp3,wav,m4a, 10 MB, PRIVATE
- **Teacher feedback:** pdf,docx,png,jpg,mp3, 10 MB, RESTRICTED
- **Certificates:** pdf, 5 MB, PRIVATE
- **Audio recordings:** mp3,wav,m4a,ogg,webm, 10 MB, PRIVATE
- **Speaking practice:** same, 8 MB, PRIVATE
- **Message attachments:** pdf,docx,xlsx,png,jpg,jpeg,webp,gif,mp3,wav,m4a,ogg, 5 MB, PRIVATE
- **Content media:** png,jpg,jpeg,webp,gif,mp3,wav,m4a,ogg,mp4,webm,pdf,docx, 8 MB, RESTRICTED
- **Admin imports:** csv,xlsx,json, 10 MB, RESTRICTED, magic not required (text)
- **Book cover:** png,jpg,jpeg,webp, 3 MB, PUBLIC

**Blocked by default:** exe,js,sh,html,htm,svg,bat,cmd,msi,dll,app,com,scr,vbs,ps1,jar,apk,iso

**Do not trust extension or Content-Type alone:** both checked + magic bytes

**Malware scanning:** NOT IMPLEMENTED, no provider; documented as limitation, not claimed malware-free

## Size Limits Documented

- Each policy has maxBytes, documented in this report and in code
- Content setting maxMediaBytes 8 MB default, message maxAttachmentBytes 5 MB default (from DB settings)
- Voice audioBase64 max 2M chars (~1.5 MB)
- Platform limit: Netlify Functions 6 MB body limit (NOT VERIFIED, documented as risk)

## Partial Failures Handling

- If storage succeeds but DB fails: compensating delete (orphan cleanup) + error 500, file not accessible
- If DB saved but upload fails: download will 404, reliability report will flag missing object
- If checksum mismatch after upload: delete + 500
- Audit failure does not fail upload, but warns

## Tests

- Valid upload, invalid extension, MIME mismatch, oversized, empty file, malformed file, path traversal, duplicate upload, checksum mismatch, missing object, safe deletion — VERIFIED via `scripts/test-storage-regression-simple.mjs` 20 tests pass
- Unauthorized upload, cross-student, cross-teacher, resource ownership — NOT VERIFIED against live staging DB (requires staging PostgreSQL, unavailable per Phase 28.4), but code has checks
- Storage timeout, DB failure after upload — NOT VERIFIED live, but retry policy and compensating action coded

## Remaining Risks

- No malware scanning
- No S3 integration test with real bucket
- Assignment submissions still text-only, no file attachment model (policy defined but not wired)
