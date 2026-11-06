-- Phase 32: Tenant isolation hardening
-- Add organizationId to content_media for tenant scoping
-- Fix scopeMatches already done in code, this adds DB constraint

ALTER TABLE "content_media" ADD COLUMN "organizationId" TEXT;

-- Backfill: set organizationId from uploader's organization where reliably known
-- Only backfill when uploader has single organization; uncertain records left NULL for manual remediation
-- This is safe, does not assign arbitrary tenant
UPDATE "content_media" SET "organizationId" = (
  SELECT "organizationId" FROM "users" WHERE "users"."id" = "content_media"."uploadedById"
) WHERE "organizationId" IS NULL AND EXISTS (
  SELECT 1 FROM "users" WHERE "users"."id" = "content_media"."uploadedById" AND "users"."organizationId" IS NOT NULL
);

CREATE INDEX "content_media_organizationId_idx" ON "content_media"("organizationId");
