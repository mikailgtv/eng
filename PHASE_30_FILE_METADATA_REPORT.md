# Phase 30 — File Metadata Report

**Date:** 2026-10-10
**Status:** VERIFIED (schema changes implemented, migration created, backward compatible)

## Current Schema Before Phase 30

### ContentMedia
- id, contentItemId?, kind, fileName (sanitized), mimeType, sizeBytes, storagePath (random-safeName), altText, uploadedById, archivedAt, createdAt
- Missing: originalName, checksum, provider, bucket, accessLevel, processingStatus, version, replacedBy

### MessageAttachment
- id, messageId, fileName, mimeType, sizeBytes, storagePath, createdAt
- Missing: same as above plus uploader (via message sender)

### Other file-related
- Certificate.pdfBytes Bytes + pdfSha256 + downloadToken (unguessable) — stored in DB, not object storage
- AudioAsset.url? — no storage metadata
- Book.coverStoragePath? — no checksum

## Changes Implemented (Prisma Migration)

**Migration:** `prisma/migrations/20261010000000_phase30_storage_metadata/migration.sql`

**ContentMedia added:**
- `originalName TEXT?` — original client filename before sanitization (display)
- `checksum TEXT?` — SHA256 hex
- `storageProvider TEXT? DEFAULT 'local'` — local | s3 | memory
- `storageBucket TEXT?` — bucket name if S3
- `accessLevel TEXT? DEFAULT 'RESTRICTED'` — PUBLIC | PRIVATE | RESTRICTED
- `processingStatus TEXT? DEFAULT 'READY'` — PENDING | PROCESSING | READY | FAILED
- `version INTEGER DEFAULT 1` — version number
- `replacedById TEXT?` — replacement relationship (future)
- `updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP` — for lifecycle

**MessageAttachment added:**
- Same fields except accessLevel DEFAULT 'PRIVATE', plus updatedAt

**Indexes:**
- `content_media_checksum_idx`, `message_attachments_checksum_idx` for integrity checks

**Backward compatibility:**
- All new fields nullable except version/updatedAt with defaults
- Existing rows keep working: legacy code path in `readContentMedia` and `readAttachment` checks if storagePath contains "/" or checksum exists → use adapter, else fallback to legacy `storage/content/<basename>` or `storage/messages/<basename>`
- No data deletion, no overwrite without versioning

## Metadata Design Decisions

- **Stable file ID:** existing `id` (cuid) preserved
- **Original display filename:** `originalName` (255 char max in service, stored as TEXT)
- **Internal object key:** `storagePath` now holds secure key like `content/2026/05/<group>/<random>-<safe>` instead of just random-safeName
- **MIME type:** existing `mimeType`, now validated against policy and magic bytes
- **File size:** existing `sizeBytes`, validated before expensive processing
- **Checksum:** new `checksum` SHA256, verified on upload and download
- **Upload timestamp:** existing `createdAt`
- **Uploader ID:** existing `uploadedById` (ContentMedia) and via Message sender
- **Resource type and ID:** new key structure includes resourceType/resourceId prefix; ContentMedia has contentItemId, MessageAttachment has messageId
- **Access classification:** new `accessLevel` per policy
- **Processing status:** new `processingStatus` for audio/large files
- **Version:** new `version` integer, default 1, for replacement tracking
- **Soft-deletion:** existing `archivedAt` for ContentMedia, plus future retention policy

## What We Did NOT Do

- Did NOT store file bytes in PostgreSQL (except certificates which already do and are small PDFs) — per requirement
- Did NOT duplicate metadata models unnecessarily — enhanced existing two models
- Did NOT use `prisma db push` — created versioned migration SQL
- Did NOT delete existing user files

## Verification

- `prisma/schema.prisma` contains new fields — VERIFIED
- Migration file exists — VERIFIED
- New fields have defaults, nullable where appropriate — VERIFIED
- Legacy fallback in `media.ts` and `messages.ts` — VERIFIED (code inspection)
- No secret values in migration — VERIFIED

## Remaining

- Apply migration to staging DB (requires staging PostgreSQL, currently NOT VERIFIED — Phase 28.4 says staging DB unavailable)
- Backfill checksum for existing files via reliability script (currently NOT IMPLEMENTED, would require reading legacy files)
- Book cover and AudioAsset metadata hardening (NOT IMPLEMENTED, out of scope for minimal change)
