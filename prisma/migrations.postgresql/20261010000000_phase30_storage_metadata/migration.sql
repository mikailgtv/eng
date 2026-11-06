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
ALTER TABLE "content_media" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "message_attachments" ADD COLUMN "originalName" TEXT;
ALTER TABLE "message_attachments" ADD COLUMN "checksum" TEXT;
ALTER TABLE "message_attachments" ADD COLUMN "storageProvider" TEXT DEFAULT 'local';
ALTER TABLE "message_attachments" ADD COLUMN "storageBucket" TEXT;
ALTER TABLE "message_attachments" ADD COLUMN "accessLevel" TEXT DEFAULT 'PRIVATE';
ALTER TABLE "message_attachments" ADD COLUMN "processingStatus" TEXT DEFAULT 'READY';
ALTER TABLE "message_attachments" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "message_attachments" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX "content_media_checksum_idx" ON "content_media"("checksum");
CREATE INDEX "message_attachments_checksum_idx" ON "message_attachments"("checksum");
