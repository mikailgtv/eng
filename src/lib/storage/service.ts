import { createHash } from "crypto";
import { ApiError } from "@/lib/api-errors";
import { audit } from "@/lib/audit";
import { getStorageAdapter, getStorageProvider } from "./index";
import { generateObjectKey, sanitizeFileName } from "./keys";
import { validateFile } from "./validation";
import type { ResourceCategory } from "./policies";
import { getPolicy } from "./policies";

/**
 * Secure upload pipeline (Phase 30)
 * Steps:
 * 1. Authenticate (caller)
 * 2. Authorize (resource/operation - done by caller)
 * 3. Validate size before expensive processing
 * 4. Validate extension and MIME
 * 5. Inspect file signatures
 * 6. Generate safe internal object key
 * 7. Prevent path traversal
 * 8. Enforce allowed types by resource category
 * 9. Upload to private/public location
 * 10. Verify stored object and checksum
 * 11. Save metadata only after storage succeeds (caller handles DB, with cleanup on failure)
 * 12. Audit event
 * 13. Return only needed fields
 */

export interface SecureUploadInput {
  actorId: string;
  category: ResourceCategory;
  file: { name: string; type: string; bytes: Buffer };
  resourceType: string;
  resourceId?: string | null;
  auditAction: string;
  auditEntityType: import("@/lib/audit").AuditEntityType;
  auditEntityId?: string;
}

export interface SecureUploadResult {
  key: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  checksumSha256: string;
  provider: string;
  bucket?: string | null;
  accessLevel: string;
}

export async function secureUpload(input: SecureUploadInput): Promise<SecureUploadResult> {
  const { actorId, category, file, resourceType, resourceId, auditAction, auditEntityType, auditEntityId } = input;

  if (!actorId) throw new ApiError(401, "Authentication required");
  if (!file.bytes || file.bytes.length === 0) throw new ApiError(400, "Empty file not allowed");

  const policy = getPolicy(category);

  // Step 3 & 4 & 5 & 8: validate size, extension, MIME, magic
  let validated;
  try {
    validated = validateFile({ category, fileName: file.name, mimeType: file.type, bytes: file.bytes });
  } catch (err) {
    throw new ApiError(400, err instanceof Error ? err.message : "Invalid file");
  }

  // Step 6 & 7: safe key generation, traversal prevention
  const originalName = file.name.slice(0, 255);
  const safeName = sanitizeFileName(file.name);
  const key = generateObjectKey({
    resourceType,
    resourceId,
    originalName: safeName,
    extension: validated.extension,
  });

  const checksum = createHash("sha256").update(file.bytes).digest("hex");

  const adapter = getStorageAdapter();
  const provider = getStorageProvider();

  // Step 9: upload
  let uploadResult;
  try {
    uploadResult = await adapter.upload({
      key,
      bytes: file.bytes,
      mimeType: validated.safeMime || file.type || "application/octet-stream",
      accessLevel: policy.accessLevel,
      originalName,
      checksumSha256: checksum,
    });
  } catch (err) {
    // Log safe operational signal (no secrets)
    console.error(`[storage] upload failed provider=${provider} category=${category} size=${file.bytes.length} error=${err instanceof Error ? err.message : "unknown"}`);
    throw new ApiError(500, "Storage upload failed");
  }

  // Step 10: verify
  try {
    const exists = await adapter.exists(key);
    if (!exists) throw new Error("Object not found after upload");
    const ok = await adapter.verifyChecksum(key, checksum);
    if (!ok) throw new Error("Checksum mismatch after upload");
  } catch (err) {
    // Compensating action: delete orphaned object
    await adapter.delete(key).catch(() => {});
    console.error(`[storage] verification failed key=${key} error=${err instanceof Error ? err.message : "unknown"}`);
    throw new ApiError(500, "Stored object verification failed");
  }

  // Step 12: audit (safe, no raw file content, no signed URLs)
  try {
    await audit({
      actorId,
      action: auditAction,
      entityType: auditEntityType,
      entityId: auditEntityId || key,
      metadata: {
        fileName: safeName,
        originalName,
        sizeBytes: file.bytes.length,
        checksum: checksum.slice(0, 16) + "...",
        provider,
        category,
        keyPrefix: key.split("/").slice(0, 2).join("/"),
      },
    });
  } catch {
    // Audit failure should not fail upload, but log
    console.warn(`[storage] audit failed for upload ${key}`);
  }

  return {
    key,
    fileName: safeName,
    originalName,
    mimeType: validated.safeMime,
    sizeBytes: validated.sizeBytes,
    checksumSha256: checksum,
    provider,
    bucket: uploadResult.bucket || null,
    accessLevel: policy.accessLevel,
  };
}

export async function secureDownload(input: {
  actorId: string;
  key: string;
  expectedChecksum?: string | null;
}): Promise<{ bytes: Buffer; mimeType: string; checksum: string }> {
  if (!input.actorId) throw new ApiError(401, "Authentication required");
  const adapter = getStorageAdapter();
  try {
    const result = await adapter.download(input.key);
    if (input.expectedChecksum && result.metadata.checksumSha256 !== input.expectedChecksum) {
      console.error(`[storage] checksum mismatch on download key=${input.key}`);
      throw new ApiError(500, "File integrity check failed");
    }
    return { bytes: result.bytes, mimeType: result.metadata.mimeType, checksum: result.metadata.checksumSha256 || "" };
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(404, "File not found");
  }
}

export async function secureDelete(input: { actorId: string; key: string; auditAction: string; entityType: import("@/lib/audit").AuditEntityType; entityId: string }): Promise<void> {
  if (!input.actorId) throw new ApiError(401, "Authentication required");
  const adapter = getStorageAdapter();
  const deleted = await adapter.delete(input.key);
  if (!deleted) {
    console.warn(`[storage] delete failed or not found key=${input.key}`);
  }
  try {
    await audit({
      actorId: input.actorId,
      action: input.auditAction,
      entityType: input.entityType,
      entityId: input.entityId,
      metadata: { keyPrefix: input.key.split("/").slice(0, 2).join("/") },
    });
  } catch {
    console.warn(`[storage] audit failed for delete ${input.key}`);
  }
}
