-- Phase 33C SQLite variant of 20261010000000_phase30_storage_metadata.
-- Source of truth (PostgreSQL original): prisma/migrations.postgresql/20261010000000_phase30_storage_metadata/migration.sql
-- Original sha256: fa484a84f5f7cd821894a2d94e58f8010902573d71fd663df707fdc52f14fc1a
-- DELTA: content_media.updatedAt non-constant default; message_attachments.updatedAt non-constant default
-- Every other statement is unchanged. Applies to SQLite only.

-- Phase 30: Storage metadata hardening
-- Add checksum, originalName, provider, bucket, accessLevel, processingStatus, version to file tables

ALTER TABLE "content_media" ADD COLUMN "originalName" TEXT;
ALTER TABLE "content_media" ADD COLUMN "checksum" TEXT;
ALTER TABLE "content_media" ADD COLUMN "storageProvider" TEXT DEFAULT 'local';
ALTER TABLE "content_media" ADD COLUMN "storageBucket" TEXT;
ALTER TABLE "content_media" ADD COLUMN "accessLevel" TEXT DEFAULT 'RESTRICTED';
ALTER TABLE "content_media" ADD COLUMN "processingStatus" TEXT DEFAULT 'READY';
ALTER TABLE "content_media" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "content_media" ADD COLUMN "replacedById" TEXT;
-- Phase 33 SQLite repair: a non-constant DEFAULT (CURRENT_TIMESTAMP) is rejected by
-- SQLite ADD COLUMN as soon as "content_media" contains a row, so the column is added
-- nullable, backfilled from createdAt, and made NOT NULL by the Phase 33 rebuild.
ALTER TABLE "content_media" ADD COLUMN "updatedAt" DATETIME;
UPDATE "content_media" SET "updatedAt" = COALESCE("createdAt", CURRENT_TIMESTAMP) WHERE "updatedAt" IS NULL;

ALTER TABLE "message_attachments" ADD COLUMN "originalName" TEXT;
ALTER TABLE "message_attachments" ADD COLUMN "checksum" TEXT;
ALTER TABLE "message_attachments" ADD COLUMN "storageProvider" TEXT DEFAULT 'local';
ALTER TABLE "message_attachments" ADD COLUMN "storageBucket" TEXT;
ALTER TABLE "message_attachments" ADD COLUMN "accessLevel" TEXT DEFAULT 'PRIVATE';
ALTER TABLE "message_attachments" ADD COLUMN "processingStatus" TEXT DEFAULT 'READY';
ALTER TABLE "message_attachments" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;
-- Phase 33 SQLite repair: a non-constant DEFAULT (CURRENT_TIMESTAMP) is rejected by
-- SQLite ADD COLUMN as soon as "message_attachments" contains a row, so the column is added
-- nullable, backfilled from createdAt, and made NOT NULL by the Phase 33 rebuild.
ALTER TABLE "message_attachments" ADD COLUMN "updatedAt" DATETIME;
UPDATE "message_attachments" SET "updatedAt" = COALESCE("createdAt", CURRENT_TIMESTAMP) WHERE "updatedAt" IS NULL;

CREATE INDEX "content_media_checksum_idx" ON "content_media"("checksum");
CREATE INDEX "message_attachments_checksum_idx" ON "message_attachments"("checksum");
