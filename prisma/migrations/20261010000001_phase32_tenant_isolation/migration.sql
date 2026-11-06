-- Phase 33C SQLite variant of 20261010000001_phase32_tenant_isolation.
-- Source of truth (PostgreSQL original): prisma/migrations.postgresql/20261010000001_phase32_tenant_isolation/migration.sql
-- Original sha256: 0c7883387a7e3a88c92ec94a246655e68c84782dbf53d9dbd54337b327825a0f
-- DELTA: none — byte-identical apart from this header
-- Every other statement is unchanged. Applies to SQLite only.

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
