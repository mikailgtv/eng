-- Phase 34B — PostgreSQL parity fix (found by offline analysis, not by running PG).
--
-- The archived Phase 32 PostgreSQL migration adds "content_media"."organizationId"
-- and its index, but never the FOREIGN KEY. The baseline could not add it either,
-- because the column did not exist when the baseline ran. Result: a PostgreSQL
-- database built from the archive is missing
--   content_media_organizationId_fkey
-- and therefore does not match prisma/schema.prisma.
--
-- This is an ADDITIVE migration in the PostgreSQL workspace only. No archived
-- file is modified; the SQLite history is untouched (SQLite needed a table
-- rebuild instead, which is migration 20261010000002 in prisma/migrations).
--
-- Safety: the constraint can only fail to validate if some row already points at
-- a deleted organization. On a fresh staging database there are no rows. On an
-- existing database, run
--   SELECT count(*) FROM "content_media" c LEFT JOIN "organizations" o
--     ON o."id" = c."organizationId"
--    WHERE c."organizationId" IS NOT NULL AND o."id" IS NULL;
-- first; a non-zero result must be remediated, never force-validated.

ALTER TABLE "content_media"
  ADD CONSTRAINT "content_media_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
