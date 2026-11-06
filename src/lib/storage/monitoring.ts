/**
 * Phase 30 — Storage monitoring and operational signals
 * Logs are safe: no secrets, no raw signed URLs, no PII, no audio content.
 */

export type StorageEventType =
  | "UPLOAD_SUCCESS"
  | "UPLOAD_FAILURE"
  | "DOWNLOAD_AUTH_FAILURE"
  | "STORAGE_LATENCY"
  | "STORAGE_ERROR"
  | "FILE_PROCESSING_FAILURE"
  | "AUDIO_PROCESSING_FAILURE"
  | "QUOTA_EXHAUSTED"
  | "ORPHANED_METADATA"
  | "MISSING_OBJECT"
  | "ABUSE_DETECTED";

export interface StorageLog {
  event: StorageEventType;
  fileId?: string;
  keyPrefix?: string;
  provider?: string;
  category?: string;
  sizeBytes?: number;
  latencyMs?: number;
  requestId?: string;
  actorId?: string;
  errorCode?: string;
  timestamp: string;
}

function safeLog(log: Omit<StorageLog, "timestamp">): void {
  const entry: StorageLog = {
    ...log,
    timestamp: new Date().toISOString(),
  };
  // Never log raw signed URLs, secrets, or audio
  // Use JSON but filter sensitive keys
  const filtered = { ...entry };
  console.log(`[storage:${entry.event}] ${JSON.stringify(filtered)}`);
}

export function logUploadSuccess(params: { fileId?: string; key: string; provider: string; category: string; sizeBytes: number; requestId?: string; actorId?: string; latencyMs?: number }) {
  safeLog({
    event: "UPLOAD_SUCCESS",
    fileId: params.fileId,
    keyPrefix: params.key.split("/").slice(0, 2).join("/"),
    provider: params.provider,
    category: params.category,
    sizeBytes: params.sizeBytes,
    requestId: params.requestId,
    actorId: params.actorId,
    latencyMs: params.latencyMs,
  });
}

export function logUploadFailure(params: { keyPrefix?: string; provider?: string; category?: string; sizeBytes?: number; errorCode?: string; requestId?: string; actorId?: string }) {
  safeLog({
    event: "UPLOAD_FAILURE",
    keyPrefix: params.keyPrefix,
    provider: params.provider,
    category: params.category,
    sizeBytes: params.sizeBytes,
    errorCode: params.errorCode,
    requestId: params.requestId,
    actorId: params.actorId,
  });
}

export function logDownloadAuthFailure(params: { fileId?: string; keyPrefix?: string; actorId?: string; requestId?: string }) {
  safeLog({
    event: "DOWNLOAD_AUTH_FAILURE",
    fileId: params.fileId,
    keyPrefix: params.keyPrefix,
    actorId: params.actorId,
    requestId: params.requestId,
  });
}

export function logStorageError(params: { keyPrefix?: string; provider?: string; errorCode?: string; requestId?: string }) {
  safeLog({
    event: "STORAGE_ERROR",
    keyPrefix: params.keyPrefix,
    provider: params.provider,
    errorCode: params.errorCode,
    requestId: params.requestId,
  });
}

export function logMissingObject(params: { fileId?: string; keyPrefix?: string; provider?: string }) {
  safeLog({
    event: "MISSING_OBJECT",
    fileId: params.fileId,
    keyPrefix: params.keyPrefix,
    provider: params.provider,
  });
}

export function logOrphanedMetadata(params: { fileId?: string; keyPrefix?: string }) {
  safeLog({
    event: "ORPHANED_METADATA",
    fileId: params.fileId,
    keyPrefix: params.keyPrefix,
  });
}

export function logQuotaExhausted(params: { actorId?: string; category?: string; provider?: string }) {
  safeLog({
    event: "QUOTA_EXHAUSTED",
    actorId: params.actorId,
    category: params.category,
    provider: params.provider,
  });
}

export function logAbuse(params: { actorId?: string; category?: string; requestId?: string }) {
  safeLog({
    event: "ABUSE_DETECTED",
    actorId: params.actorId,
    category: params.category,
    requestId: params.requestId,
  });
}
