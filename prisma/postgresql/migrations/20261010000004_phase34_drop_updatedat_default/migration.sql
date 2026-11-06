-- Phase 34B — PostgreSQL parity fix #2 (found by migrate diff on real PG 17).
--
-- Phase 30 introduced "updatedAt" ... NOT NULL DEFAULT CURRENT_TIMESTAMP.
-- prisma/schema.prisma declares @updatedAt with no database default, so the
-- canonical column is NOT NULL with NO default. Leaving the server default in
-- place makes every future prisma migrate diff report drift and makes
-- prisma migrate dev want to create a no-op migration forever.
--
-- @updatedAt is applied by Prisma Client on insert and update, so no row can end
-- up with a NULL/absent value. No data is changed by this statement.

ALTER TABLE "content_media" ALTER COLUMN "updatedAt" DROP DEFAULT;
ALTER TABLE "message_attachments" ALTER COLUMN "updatedAt" DROP DEFAULT;
