import { createHash } from "crypto";
import { readFile } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api";
import type { SessionUser } from "@/types";
import { contentSettings } from "./settings";
import { getStorageAdapter, getStorageProvider, getStorageRoot } from "@/lib/storage";
import { secureUpload } from "@/lib/storage/service";
import { validateObjectKey } from "@/lib/storage/keys";
import { getPolicy } from "@/lib/storage/policies";

/**
 * Phase 30 — Content media now uses storage abstraction
 * Preserves backward compatibility with legacy files stored under storage/content/<random>-<name>
 * New uploads use secure pipeline with checksum, provider tracking, and audit.
 */

function kindFromExtension(ext: string): string {
  const e = ext.toLowerCase();
  if (["mp3", "wav", "m4a", "ogg"].includes(e)) return "AUDIO";
  if (["mp4", "webm"].includes(e)) return "VIDEO";
  if (["pdf", "docx"].includes(e)) return "DOCUMENT";
  return "IMAGE";
}

export async function saveContentMedia(actor: SessionUser, file: { name: string; type: string; bytes: Buffer }, altText?: string) {
  const settings = await contentSettings();
  if (file.bytes.length > settings.maxMediaBytes) throw new ApiError(400, "That file is larger than the allowed size.");

  // Use secure upload pipeline - category content_media
  let uploaded;
  try {
    uploaded = await secureUpload({
      actorId: actor.id,
      category: "content_media",
      file,
      resourceType: "content",
      resourceId: null,
      auditAction: "CONTENT_MEDIA_ADDED",
      auditEntityType: "CONTENT",
    });
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(400, err instanceof Error ? err.message : "Upload failed");
  }

  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  const kind = kindFromExtension(extension);
  const provider = getStorageProvider();

  // Save metadata only after storage succeeds (with compensating cleanup on failure)
  // Derive organizationId from actor for tenant isolation
  const actorUser = await prisma.user.findUnique({ where: { id: actor.id }, select: { organizationId: true } });
  let row;
  try {
    row = await prisma.contentMedia.create({
      data: {
        kind,
        fileName: uploaded.fileName,
        originalName: uploaded.originalName,
        mimeType: uploaded.mimeType || file.type || "application/octet-stream",
        sizeBytes: uploaded.sizeBytes,
        storagePath: uploaded.key,
        checksum: uploaded.checksumSha256,
        storageProvider: provider,
        storageBucket: uploaded.bucket || null,
        accessLevel: uploaded.accessLevel,
        processingStatus: "READY",
        version: 1,
        altText: altText || null,
        uploadedById: actor.id,
        organizationId: actorUser?.organizationId || null,
      },
    });
  } catch (err) {
    // Compensating action: delete orphaned object if DB fails
    const adapter = getStorageAdapter();
    await adapter.delete(uploaded.key).catch(() => {});
    console.error(`[storage] content_media metadata save failed, orphan cleaned key=${uploaded.key}`);
    throw new ApiError(500, "Failed to save file metadata");
  }

  return { id: row.id, fileName: uploaded.fileName, kind, url: `/api/content/media/${row.id}` };
}

export async function readContentMedia(viewer: { id: string; role: string; organizationId?: string | null }, id: string) {
  const file = await prisma.contentMedia.findUnique({ where: { id } });
  if (!file || file.archivedAt) throw new ApiError(404, "File not found.");
  // Private file access must be protected by server-side authorization
  if (viewer.role === "STUDENT") throw new ApiError(404, "File not found.");

  // Tenant isolation: check organization scope.
  // Fail closed for records whose tenant could not be established: a NULL
  // organisationId must not become a universal read grant in a multi-tenant
  // deployment (legacy rows the Phase 32 backfill could not resolve safely).
  const viewerOrg = viewer.organizationId || (await prisma.user.findUnique({ where: { id: viewer.id }, select: { organizationId: true } }))?.organizationId;
  const crossTenant = file.organizationId ? viewerOrg !== file.organizationId : (await prisma.organization.count()) > 1;
  if (crossTenant) {
    const { grantsFor } = await import("@/lib/identity/permissions");
    const grants = await grantsFor(viewer.id);
    const isSuperAdmin = grants.some(g => g.roleKey === "SUPER_ADMIN");
    if (!isSuperAdmin) {
      throw new ApiError(404, "File not found.");
    }
  }

  const adapter = getStorageAdapter();
  const provider = file.storageProvider || "local";

  // New path: use adapter if key looks like new secure key (contains /) or provider is set
  // Legacy fallback: old files stored as <random>-<safeName> directly under storage/content
  let bytes: Buffer;
  try {
    if (file.storagePath.includes("/") || provider !== "local" || file.checksum) {
      // Validate key to prevent traversal even from DB
      try {
        validateObjectKey(file.storagePath);
      } catch {
        throw new ApiError(404, "File not found.");
      }
      const result = await adapter.download(file.storagePath);
      bytes = result.bytes;
      // Verify checksum if stored
      if (file.checksum && result.metadata.checksumSha256 && result.metadata.checksumSha256 !== file.checksum) {
        console.error(`[storage] checksum mismatch on read id=${file.id} key=${file.storagePath}`);
        throw new ApiError(500, "File integrity check failed");
      }
    } else {
      // Legacy: direct filesystem read for backward compatibility
      const legacyRoot = path.join(getStorageRoot(), "content");
      const legacyPath = path.join(legacyRoot, path.basename(file.storagePath));
      // Extra traversal guard
      if (!legacyPath.startsWith(legacyRoot)) throw new ApiError(404, "File not found.");
      bytes = await readFile(legacyPath);
    }
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(404, "File not found.");
  }

  const hash = createHash("sha256").update(bytes).digest("hex");
  return { bytes, fileName: file.fileName, mimeType: file.mimeType, hash };
}
