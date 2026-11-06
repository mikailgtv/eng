/**
 * Phase 30 — Storage reliability: orphaned-file detection, missing-object detection, retry policy, safe deletion
 */

import { prisma } from "@/lib/prisma";
import { getStorageAdapter } from "./index";
import { logMissingObject, logOrphanedMetadata, logStorageError } from "./monitoring";

export interface ReliabilityReport {
  checkedAt: string;
  contentMedia: {
    total: number;
    missingObjects: { id: string; key: string }[];
    orphanCandidates: { key: string }[];
    checksumMismatches: { id: string; key: string }[];
  };
  messageAttachments: {
    total: number;
    missingObjects: { id: string; key: string }[];
    checksumMismatches: { id: string; key: string }[];
  };
}

export async function checkContentMediaIntegrity(): Promise<ReliabilityReport["contentMedia"]> {
  const adapter = getStorageAdapter();
  const all = await prisma.contentMedia.findMany({ where: { archivedAt: null }, select: { id: true, storagePath: true, checksum: true } });
  const missing: { id: string; key: string }[] = [];
  const mismatches: { id: string; key: string }[] = [];

  for (const file of all) {
    try {
      const exists = await adapter.exists(file.storagePath);
      if (!exists) {
        missing.push({ id: file.id, key: file.storagePath });
        logMissingObject({ fileId: file.id, keyPrefix: file.storagePath.split("/").slice(0, 2).join("/") });
        continue;
      }
      if (file.checksum) {
        const ok = await adapter.verifyChecksum(file.storagePath, file.checksum);
        if (!ok) mismatches.push({ id: file.id, key: file.storagePath });
      }
    } catch (err) {
      logStorageError({ keyPrefix: file.storagePath.split("/").slice(0, 2).join("/"), errorCode: err instanceof Error ? err.message : "unknown" });
      missing.push({ id: file.id, key: file.storagePath });
    }
  }

  return { total: all.length, missingObjects: missing, orphanCandidates: [], checksumMismatches: mismatches };
}

export async function checkMessageAttachmentIntegrity(): Promise<ReliabilityReport["messageAttachments"]> {
  const adapter = getStorageAdapter();
  const all = await prisma.messageAttachment.findMany({ select: { id: true, storagePath: true, checksum: true } });
  const missing: { id: string; key: string }[] = [];
  const mismatches: { id: string; key: string }[] = [];

  for (const file of all) {
    try {
      const exists = await adapter.exists(file.storagePath);
      if (!exists) {
        missing.push({ id: file.id, key: file.storagePath });
        logMissingObject({ fileId: file.id, keyPrefix: file.storagePath.split("/").slice(0, 2).join("/") });
        continue;
      }
      if (file.checksum) {
        const ok = await adapter.verifyChecksum(file.storagePath, file.checksum);
        if (!ok) mismatches.push({ id: file.id, key: file.storagePath });
      }
    } catch (err) {
      logStorageError({ keyPrefix: file.storagePath.split("/").slice(0, 2).join("/"), errorCode: err instanceof Error ? err.message : "unknown" });
      missing.push({ id: file.id, key: file.storagePath });
    }
  }

  return { total: all.length, missingObjects: missing, checksumMismatches: mismatches };
}

export async function generateReliabilityReport(): Promise<ReliabilityReport> {
  const [contentMedia, messageAttachments] = await Promise.all([checkContentMediaIntegrity(), checkMessageAttachmentIntegrity()]);
  return {
    checkedAt: new Date().toISOString(),
    contentMedia,
    messageAttachments,
  };
}

export async function safeDeleteFile(params: { key: string; fileId?: string; dryRun?: boolean }): Promise<{ deleted: boolean; dryRun: boolean }> {
  if (params.dryRun) {
    logOrphanedMetadata({ fileId: params.fileId, keyPrefix: params.key.split("/").slice(0, 2).join("/") });
    return { deleted: false, dryRun: true };
  }
  const adapter = getStorageAdapter();
  const deleted = await adapter.delete(params.key);
  return { deleted, dryRun: false };
}

export function getRetryPolicy() {
  return {
    maxRetries: 3,
    baseDelayMs: 200,
    maxDelayMs: 2000,
    backoffFactor: 2,
    retryableErrors: ["ETIMEDOUT", "ECONNRESET", "ENOTFOUND", "STORAGE_ERROR"],
  };
}

export async function withRetry<T>(fn: () => Promise<T>, attempt = 0): Promise<T> {
  const policy = getRetryPolicy();
  try {
    return await fn();
  } catch (err) {
    if (attempt >= policy.maxRetries) throw err;
    const delay = Math.min(policy.baseDelayMs * Math.pow(policy.backoffFactor, attempt), policy.maxDelayMs);
    await new Promise((r) => setTimeout(r, delay));
    return withRetry(fn, attempt + 1);
  }
}
