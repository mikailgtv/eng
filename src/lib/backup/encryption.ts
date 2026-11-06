/**
 * Phase 31 — Backup encryption, retention, access control
 * No secrets committed, keys separate from artifacts
 */

import { createHash } from "crypto";

export function isEncryptionConfigured(): boolean {
  // Check if encryption key is configured via env (not committed)
  return Boolean(process.env.BACKUP_ENCRYPTION_KEY);
}

export function getEncryptionStatus(): "none" | "at-rest" | "aes-256-gcm" {
  if (process.env.BACKUP_ENCRYPTION_KEY) return "aes-256-gcm";
  // Provider-managed at-rest encryption (e.g., S3 SSE-S3) if bucket has it
  if (process.env.STORAGE_S3_BUCKET && process.env.BACKUP_ENCRYPTION_AT_REST === "true") return "at-rest";
  return "none";
}

export function validateEncryptionEnv(): void {
  const key = process.env.BACKUP_ENCRYPTION_KEY;
  if (!key) return; // optional, but if set must be strong
  if (key.length < 32) {
    throw new Error("Invalid server environment configuration: BACKUP_ENCRYPTION_KEY (must be >=32 chars)");
  }
}

export function hashEncryptionKeyId(): string | null {
  const key = process.env.BACKUP_ENCRYPTION_KEY;
  if (!key) return null;
  return createHash("sha256").update(key).digest("hex").slice(0, 16);
}

export function getRetentionConfig(): { retentionDays: number; retentionCount: number } {
  const days = Number(process.env.BACKUP_RETENTION_DAYS || "30");
  const count = Number(process.env.BACKUP_RETENTION_COUNT || "5");
  return {
    retentionDays: Number.isFinite(days) && days > 0 ? days : 30,
    retentionCount: Number.isFinite(count) && count > 0 ? count : 5,
  };
}
