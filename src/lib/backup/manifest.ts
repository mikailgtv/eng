import { createHash, randomBytes } from "crypto";
import { writeFile, readFile, stat } from "fs/promises";
import path from "path";
import type { BackupManifest } from "./types";

export function generateBackupId(prefix: "db" | "files" | "full"): string {
  const now = new Date();
  const ts = now.toISOString().replace(/[-:T]/g, "").slice(0, 14); // YYYYMMDDHHmmss
  const rand = randomBytes(4).toString("hex");
  return `${prefix}-${ts}-${rand}`;
}

export function hashNonSensitive(value: string): string {
  // Hash host/bucket name, not secret, for manifest without leaking
  return createHash("sha256").update(value).digest("hex").slice(0, 16);
}

export async function writeManifest(manifestPath: string, manifest: BackupManifest): Promise<void> {
  const json = JSON.stringify(manifest, null, 2);
  await writeFile(manifestPath, json, "utf-8");
}

export async function readManifest(manifestPath: string): Promise<BackupManifest> {
  const data = await readFile(manifestPath, "utf-8");
  return JSON.parse(data) as BackupManifest;
}

export async function computeFileChecksum(filePath: string): Promise<string> {
  const { createHash } = await import("crypto");
  const { readFile } = await import("fs/promises");
  const bytes = await readFile(filePath);
  return createHash("sha256").update(bytes).digest("hex");
}

export async function verifyManifestIntegrity(manifestPath: string, dataPath: string): Promise<{ valid: boolean; reason?: string }> {
  try {
    const manifest = await readManifest(manifestPath);
    const stats = await stat(dataPath).catch(() => null);
    if (!stats) return { valid: false, reason: "data file missing" };
    if (manifest.sizeBytes && stats.size !== manifest.sizeBytes) {
      return { valid: false, reason: `size mismatch: expected ${manifest.sizeBytes}, got ${stats.size}` };
    }
    if (manifest.checksumSha256) {
      const actual = await computeFileChecksum(dataPath);
      if (actual !== manifest.checksumSha256) {
        return { valid: false, reason: `checksum mismatch: expected ${manifest.checksumSha256.slice(0, 16)}..., got ${actual.slice(0, 16)}...` };
      }
    }
    if (manifest.status === "FAILED" || manifest.status === "CORRUPTED") {
      return { valid: false, reason: `manifest status is ${manifest.status}` };
    }
    return { valid: true };
  } catch (err) {
    return { valid: false, reason: err instanceof Error ? err.message : "unknown" };
  }
}

export function getBackupDestination(): string {
  // Environment separation: each env uses intended destination
  const explicit = process.env.BACKUP_DESTINATION;
  if (explicit) return explicit;
  const nodeEnv = process.env.NODE_ENV || "development";
  if (nodeEnv === "test") return path.join(process.cwd(), "backups-test");
  if (nodeEnv === "production") return process.env.BACKUP_DESTINATION_PROD || path.join(process.cwd(), "backups");
  return path.join(process.cwd(), "backups");
}

export function getDatabaseBackupDir(): string {
  return path.join(getBackupDestination(), "db");
}

export function getFilesBackupDir(): string {
  return path.join(getBackupDestination(), "files");
}
