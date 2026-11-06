# Phase 30 — Storage Architecture Audit

**Date:** 2026-10-10
**Environment inspected:** local repository, `src/lib/content/media.ts`, `src/lib/communication/messages.ts`, `prisma/schema.prisma`, `src/lib/server-env.ts`, `src/app/api/content/media/*`, `src/app/api/messages/attachments/*`, `src/lib/voice/*`, `src/lib/certificates/service.ts`
**Status:** VERIFIED (static code + filesystem inspection)

## Existing Implementation

### Local filesystem dependencies
- **Direct `fs/promises` usage found in:**
  - `src/lib/content/media.ts`: `mkdir`, `readFile`, `writeFile` with `path.join(process.cwd(), "storage", "content")`
  - `src/lib/communication/messages.ts`: same pattern with `storage/messages`
- **No storage abstraction** before Phase 30; business logic directly coupled to disk path
- **No provider configuration** (S3, GCS, etc.) — only local disk
- **Hardcoded paths:** `storage/content`, `storage/messages` under `process.cwd()`
- **Static public directory:** `public/` contains 15 assets, but no uploaded user files are stored there (good)

### Upload and download endpoints
- `POST /api/content/media` — teacher/admin, formData file, saves via `saveContentMedia`
- `GET /api/content/media/[id]` — authenticated, role check STUDENT blocked, reads file
- `POST /api/messages/attachments` — authenticated, message owner, formData
- `GET /api/messages/attachments/[id]` — authenticated, conversation participant check
- `GET /api/certificates/download/[token]` — authenticated, download token (unguessable), PDF from DB Bytes, not file storage
- `GET /api/certificates/transcript` — similar, transcript PDF from DB Bytes
- Voice: `POST /api/voice/transcribe`, `POST /api/voice/speak` — no file upload, base64 audio in JSON (max 2M chars), transcripts only

### Prisma models related to files and media
- `ContentMedia`: id, contentItemId?, kind, fileName, mimeType, sizeBytes, storagePath, altText, uploadedById, archivedAt, createdAt — **lacked checksum, originalName, provider, bucket, accessLevel, processingStatus, version**
- `MessageAttachment`: id, messageId, fileName, mimeType, sizeBytes, storagePath, createdAt — same gaps
- `Certificate`: pdfBytes Bytes, pdfSha256, downloadToken (unguessable), snapshot JSON — stored in DB, not object storage
- `AudioAsset`: title, transcript, url? (optional URL, not storagePath), createdById — no storage metadata
- `VoiceSession`, `VoiceMessage`, `SpeechAttempt`: transcripts only, comment "Raw audio is not stored unless an admin turns storage on"
- `AssignmentSubmission`: textResponse only, no file attachment model
- `Book`: coverStoragePath? String, no checksum

### Course, book, lesson, assignment, submission attachments
- Course/lesson materials: via ContentMedia library, not directly linked to Course/Lesson except via ContentItem
- Book cover: coverStoragePath, no validation pipeline
- Lesson assets: via ContentMedia, kind IMAGE/AUDIO/VIDEO/DOCUMENT
- Assignment submissions: text only, no file attachment (gap)
- Teacher feedback: text only
- Certificates: DB Bytes
- Audio: not stored, only transcripts

### Audio, speech recognition, text-to-speech integrations
- STT: external provider via STT_API_KEY + STT_BASE_URL, fallback to browser/typed
- TTS: external via TTS_API_KEY + TTS_BASE_URL, fallback to browser
- `externalTranscribe` does fetch with 20s timeout, no audio storage
- `externalSpeak` returns audioBase64 or fallback message
- Voice settings: enabled, dailyMinutes, monthlyMinutes, maxAudioSec (5-60), teacherTranscripts, requireConsent, storeAudio (false by default)
- No file storage for recordings before Phase 30; `storeAudio` flag existed but not implemented with file persistence

### Certificate generation and storage
- PDF generated via `renderCertificatePdf`, stored as Bytes in `Certificate.pdfBytes` + sha256
- Download via unguessable token, not predictable URL
- Verification via publicId, not token
- No object storage for certificates — DB storage, which is acceptable for small PDFs but not scalable for large files

### Existing storage providers and environment variables
- **None** — no STORAGE_* vars in `server-env.ts` before Phase 30
- No S3, GCS, Azure Blob, or Netlify Blobs configuration
- `.env.example` had no storage vars

### File metadata and ownership relationships
- ContentMedia: uploadedById -> User, contentItemId -> ContentItem?, no org/tenant scope, no group scope
- MessageAttachment: messageId -> Message -> Conversation -> participants, ownership via message sender
- No versioning, no replacement relationship, no retention policy, no soft-delete except archivedAt for ContentMedia

### File deletion and retention behavior
- No delete endpoint for ContentMedia (only archive via archivedAt)
- MessageAttachment: no delete, only message soft-delete (deletedAt)
- No orphan detection, no missing-object detection, no retention policy documented

### Maximum request and upload sizes
- Content: maxMediaBytes from ContentSetting, default 8,000,000 (8 MB)
- Messages: maxAttachmentBytes from CommunicationSetting, default 5,000,000 (5 MB)
- Voice transcribe: audioBase64 max 2,000,000 chars (~1.5 MB binary)
- TTS: text max 400 chars
- No platform request-size limit check (Netlify default 6 MB for functions? Not verified)

### Deployment platform restrictions
- Next.js app, likely Netlify (from `EnglishBridge_Netlify_Demo.zip` and scripts)
- Netlify Functions: request body limit ~6 MB, execution time 10s default, 26s max, no persistent disk (ephemeral `/tmp` only)
- Local `storage/` directory is **not durable** on Netlify — will be lost on deploy, not shared across instances
- **Finding:** local disk is not production-suitable; need S3-compatible durable storage

### Existing tests and staging configuration
- No storage tests found (`find` for *.test.ts returned empty)
- No staging storage bucket configured
- `STORAGE_PROVIDER` not defined — defaults to local, which is unsuitable for production

## Security gaps found (pre-Phase 30)
- Direct filesystem access without abstraction
- No checksum verification on download
- No original filename preservation
- No provider/boundary separation (dev/staging/prod all use same `storage/` folder if not configured)
- ContentMedia GET only checks STUDENT role, not uploader, group, or tenant scope
- No signed URL support, but also no short-lived URL mechanism
- No path traversal protection beyond `path.join` (which is insufficient alone)
- No file type policy per resource category (single ALLOWED set)
- No audit of storage path (only fileName)
- No orphan/missing detection

## Conclusion
Existing architecture is **local-only, non-durable, and not production-ready**. Phase 30 must implement storage abstraction, secure upload pipeline, env separation, metadata hardening, and reliability checks.

**Evidence:**
- `grep -RIn "from \"fs" src` → 2 files
- `grep -RIn "path.join.*storage" src` → 2 files
- `prisma/schema.prisma` ContentMedia and MessageAttachment definitions
- `src/lib/server-env.ts` had no STORAGE vars
