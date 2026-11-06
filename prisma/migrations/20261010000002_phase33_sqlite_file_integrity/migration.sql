-- Phase 33C — SQLite-only schema reconciliation for the two file tables.
--
-- WHY THIS EXISTS:
--   The two preceding migrations are portable ALTER TABLE statements. On SQLite an
--   ALTER cannot (a) declare a FOREIGN KEY for the new content_media.organizationId
--   column, nor (b) match Prisma's canonical column shape for updatedAt
--   (DATETIME NOT NULL, no database default). Left as-is, `prisma migrate diff`
--   reports the database as drifted from prisma/schema.prisma, so future
--   migrations could not be generated reliably.
--
-- WHAT IT DOES:
--   Standard SQLite table rebuild (create new -> copy every row -> drop old ->
--   rename). No row is added, removed or rewritten: the INSERT..SELECT copies
--   every column that existed. No PostgreSQL syntax is used.
--
-- DATA SAFETY: no data is deleted, no user file is touched, no tenant value is
--   invented. organizationId stays NULL wherever it was NULL.
--
-- The PostgreSQL migrations are untouched in prisma/migrations.postgresql/.

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_content_media" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "contentItemId" TEXT,
    "kind" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "originalName" TEXT,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "storagePath" TEXT NOT NULL,
    "checksum" TEXT,
    "storageProvider" TEXT DEFAULT 'local',
    "storageBucket" TEXT,
    "accessLevel" TEXT DEFAULT 'RESTRICTED',
    "processingStatus" TEXT DEFAULT 'READY',
    "version" INTEGER NOT NULL DEFAULT 1,
    "replacedById" TEXT,
    "altText" TEXT,
    "uploadedById" TEXT NOT NULL,
    "organizationId" TEXT,
    "archivedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "content_media_contentItemId_fkey" FOREIGN KEY ("contentItemId") REFERENCES "content_items" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "content_media_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "content_media_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_content_media" ("accessLevel", "altText", "archivedAt", "checksum", "contentItemId", "createdAt", "fileName", "id", "kind", "mimeType", "organizationId", "originalName", "processingStatus", "replacedById", "sizeBytes", "storageBucket", "storagePath", "storageProvider", "updatedAt", "uploadedById", "version") SELECT "accessLevel", "altText", "archivedAt", "checksum", "contentItemId", "createdAt", "fileName", "id", "kind", "mimeType", "organizationId", "originalName", "processingStatus", "replacedById", "sizeBytes", "storageBucket", "storagePath", "storageProvider", "updatedAt", "uploadedById", "version" FROM "content_media";
DROP TABLE "content_media";
ALTER TABLE "new_content_media" RENAME TO "content_media";
CREATE INDEX "content_media_kind_archivedAt_idx" ON "content_media"("kind", "archivedAt");
CREATE INDEX "content_media_uploadedById_idx" ON "content_media"("uploadedById");
CREATE INDEX "content_media_checksum_idx" ON "content_media"("checksum");
CREATE INDEX "content_media_organizationId_idx" ON "content_media"("organizationId");
CREATE TABLE "new_message_attachments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "messageId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "originalName" TEXT,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "storagePath" TEXT NOT NULL,
    "checksum" TEXT,
    "storageProvider" TEXT DEFAULT 'local',
    "storageBucket" TEXT,
    "accessLevel" TEXT DEFAULT 'PRIVATE',
    "processingStatus" TEXT DEFAULT 'READY',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "message_attachments_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "messages" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_message_attachments" ("accessLevel", "checksum", "createdAt", "fileName", "id", "messageId", "mimeType", "originalName", "processingStatus", "sizeBytes", "storageBucket", "storagePath", "storageProvider", "updatedAt", "version") SELECT "accessLevel", "checksum", "createdAt", "fileName", "id", "messageId", "mimeType", "originalName", "processingStatus", "sizeBytes", "storageBucket", "storagePath", "storageProvider", "updatedAt", "version" FROM "message_attachments";
DROP TABLE "message_attachments";
ALTER TABLE "new_message_attachments" RENAME TO "message_attachments";
CREATE INDEX "message_attachments_messageId_idx" ON "message_attachments"("messageId");
CREATE INDEX "message_attachments_checksum_idx" ON "message_attachments"("checksum");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

