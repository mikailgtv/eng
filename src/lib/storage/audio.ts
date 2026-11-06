/**
 * Phase 30 — Audio and speaking infrastructure
 * Handles private audio recordings with duration, format validation, and processing states.
 */

import { getStorageAdapter, getStorageProvider } from "./index";
import { generateObjectKey } from "./keys";
import { validateFile } from "./validation";
import type { ResourceCategory } from "./policies";
import { ApiError } from "@/lib/api-errors";

export type AudioProcessingState = "PENDING" | "PROCESSING" | "READY" | "FAILED";

export interface AudioUploadInput {
  actorId: string;
  category: ResourceCategory;
  file: { name: string; type: string; bytes: Buffer };
  durationSec?: number;
  resourceType: string;
  resourceId?: string;
}

export interface AudioUploadResult {
  key: string;
  checksum: string;
  sizeBytes: number;
  durationSec?: number;
  provider: string;
  processingStatus: AudioProcessingState;
}

const MAX_AUDIO_DURATION_SEC = 120; // 2 minutes max per recording
const MIN_AUDIO_DURATION_SEC = 1;

export function validateAudioDuration(durationSec?: number): void {
  if (durationSec === undefined) return; // optional
  if (!Number.isFinite(durationSec) || durationSec < MIN_AUDIO_DURATION_SEC || durationSec > MAX_AUDIO_DURATION_SEC) {
    throw new ApiError(400, `Audio duration must be between ${MIN_AUDIO_DURATION_SEC} and ${MAX_AUDIO_DURATION_SEC} seconds`);
  }
}

export async function uploadAudioRecording(input: AudioUploadInput): Promise<AudioUploadResult> {
  const { actorId, category, file, durationSec, resourceType, resourceId } = input;
  if (!actorId) throw new ApiError(401, "Authentication required");
  validateAudioDuration(durationSec);

  let validated;
  try {
    validated = validateFile({ category, fileName: file.name, mimeType: file.type, bytes: file.bytes });
  } catch (err) {
    throw new ApiError(400, err instanceof Error ? err.message : "Invalid audio file");
  }

  const key = generateObjectKey({ resourceType, resourceId, originalName: file.name });
  const adapter = getStorageAdapter();
  const provider = getStorageProvider();

  const checksum = (await import("crypto")).createHash("sha256").update(file.bytes).digest("hex");

  try {
    await adapter.upload({
      key,
      bytes: file.bytes,
      mimeType: validated.safeMime,
      accessLevel: "PRIVATE",
      originalName: file.name,
      checksumSha256: checksum,
    });
  } catch (err) {
    console.error(`[storage] audio upload failed category=${category} error=${err instanceof Error ? err.message : "unknown"}`);
    throw new ApiError(500, "Audio upload failed");
  }

  // Verify
  try {
    const exists = await adapter.exists(key);
    if (!exists) throw new Error("Missing after upload");
    const ok = await adapter.verifyChecksum(key, checksum);
    if (!ok) throw new Error("Checksum mismatch");
  } catch {
    await adapter.delete(key).catch(() => {});
    throw new ApiError(500, "Audio verification failed");
  }

  return {
    key,
    checksum,
    sizeBytes: file.bytes.length,
    durationSec,
    provider,
    processingStatus: "READY",
  };
}

export async function getAudioDownloadUrl(key: string, expiresInSeconds = 300): Promise<{ url: string | null; expiresAt: Date | null; requiresAuth: boolean }> {
  const adapter = getStorageAdapter();
  try {
    const signed = await adapter.generateSignedUrl({ key, expiresInSeconds, operation: "GET" });
    if (signed) {
      return { url: signed.url, expiresAt: signed.expiresAt, requiresAuth: false };
    }
  } catch {
    // Fall through to auth-required streaming
  }
  return { url: null, expiresAt: null, requiresAuth: true };
}

export function getAudioFallbackMessage(): string {
  return "Audio is unavailable. You can still practice by typing your answer.";
}
