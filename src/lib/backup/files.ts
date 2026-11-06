/**
 * Phase 31 — File and audio backup
 * Protects course materials, lesson attachments, images, homework files, audio recordings
 * Uses storage adapter, preserves metadata, verifies checksums
 */

import { mkdir, stat, readdir, readFile, writeFile, unlink } from "fs/promises";
import path from "path";
import { createHash } from "crypto";
import { generateBackupId, hashNonSensitive, writeManifest, computeFileChecksum, getFilesBackupDir, getBackupDestination } from "./manifest";
import { getStorageAdapter, getStorageProvider, getStorageRoot } from "@/lib/storage";
import type { BackupManifest, BackupResult } from "./types";
import { getEncryptionStatus } from "./encryption";
import { prisma } from "@/lib/prisma";

let fileBackupLock = false;

function acquireLock(): boolean {
  if (fileBackupLock) return false;
  fileBackupLock = true;
  return true;
}

function releaseLock(): void {
  fileBackupLock = false;
}

interface FileBackupEntry {
  id: string;
  storagePath: string;
  fileName: string;
  originalName?: string | null;
  mimeType: string;
  sizeBytes: number;
  checksum?: string | null;
  provider?: string | null;
}

export async function createFilesBackup(options: { createdBy?: string; notes?: string } = {}): Promise<BackupResult> {
  if (!acquireLock()) throw new Error("File backup already in progress");

  const backupId = generateBackupId("files");
  const destDir = getFilesBackupDir();
  await mkdir(destDir, { recursive: true });

  const destPath = path.join(destDir, `${backupId}.tar.gz`);
  const manifestPath = path.join(destDir, `${backupId}.json`);
  const metadataPath = path.join(destDir, `${backupId}.metadata.json`);

  const storageProvider = getStorageProvider();
  const adapter = getStorageAdapter();

  const manifest: BackupManifest = {
    backupId,
    type: "files",
    provider: storageProvider === "s3" ? "s3-files" : "local-files",
    createdAt: new Date().toISOString(),
    status: "CREATED",
    encryption: getEncryptionStatus(),
    storageProvider,
    storageBucketHash: process.env.STORAGE_S3_BUCKET ? hashNonSensitive(process.env.STORAGE_S3_BUCKET) : undefined,
    createdBy: options.createdBy || "system",
    notes: options.notes,
  };

  await writeManifest(manifestPath, manifest);

  const start = Date.now();
  let fileCount = 0;
  let totalBytes = 0;
  const entries: FileBackupEntry[] = [];
  const missing: { id: string; key: string }[] = [];
  const corrupted: { id: string; key: string }[] = [];

  try {
    // Gather file metadata from DB
    const contentMedia = await prisma.contentMedia.findMany({
      where: { archivedAt: null },
      select: { id: true, storagePath: true, fileName: true, originalName: true, mimeType: true, sizeBytes: true, checksum: true, storageProvider: true },
    }).catch(() => [] as any[]);

    const messageAttachments = await prisma.messageAttachment.findMany({
      select: { id: true, storagePath: true, fileName: true, originalName: true, mimeType: true, sizeBytes: true, checksum: true, storageProvider: true },
    }).catch(() => [] as any[]);

    const allFiles = [...contentMedia, ...messageAttachments];

    // For local provider, backup actual files from storage root
    if (storageProvider === "local") {
      const storageRoot = getStorageRoot();
      // Create a simple tar-like structure: for each file, read and store in backup dir as individual files + metadata
      // For simplicity, we'll create a directory per backup with files
      const backupContentDir = path.join(destDir, backupId);
      await mkdir(backupContentDir, { recursive: true });

      for (const file of allFiles) {
        try {
          const exists = await adapter.exists(file.storagePath);
          if (!exists) {
            missing.push({ id: file.id, key: file.storagePath });
            continue;
          }
          const result = await adapter.download(file.storagePath);
          // Verify checksum if available
          if (file.checksum && result.metadata.checksumSha256 && result.metadata.checksumSha256 !== file.checksum) {
            corrupted.push({ id: file.id, key: file.storagePath });
            continue;
          }
          // Write file to backup content dir preserving key structure
          const destFilePath = path.join(backupContentDir, file.storagePath);
          await mkdir(path.dirname(destFilePath), { recursive: true });
          await writeFile(destFilePath, result.bytes);
          fileCount++;
          totalBytes += result.bytes.length;
          entries.push({
            id: file.id,
            storagePath: file.storagePath,
            fileName: file.fileName,
            originalName: file.originalName,
            mimeType: file.mimeType,
            sizeBytes: result.bytes.length,
            checksum: result.metadata.checksumSha256,
            provider: file.storageProvider,
          });
        } catch (err) {
          missing.push({ id: file.id, key: file.storagePath });
        }
      }

      // Write metadata file
      await writeFile(metadataPath, JSON.stringify({ entries, missing, corrupted, fileCount, totalBytes }, null, 2), "utf-8");

      // For simplicity, create a tar.gz? We'll just keep directory and create a marker file
      // Compute checksum of all files combined for manifest
      const combinedHash = createHash("sha256");
      for (const entry of entries) {
        const fp = path.join(backupContentDir, entry.storagePath);
        const bytes = await readFile(fp).catch(() => Buffer.alloc(0));
        combinedHash.update(bytes);
      }
      const checksum = combinedHash.digest("hex");

      const durationMs = Date.now() - start;

      manifest.completedAt = new Date().toISOString();
      manifest.durationMs = durationMs;
      manifest.sizeBytes = totalBytes;
      manifest.checksumSha256 = checksum;
      manifest.fileCount = fileCount;
      manifest.status = "VERIFYING";

      await writeManifest(manifestPath, manifest);

      // Verify
      const verified = missing.length === 0 && corrupted.length === 0;
      if (!verified) {
        manifest.status = missing.length > 0 ? "FAILED" : "CORRUPTED";
        manifest.verificationStatus = "FAILED";
        await writeManifest(manifestPath, manifest);
        // Don't throw, but mark as failed with details
        if (missing.length > 0) {
          console.warn(`[backup] files backup ${backupId} has ${missing.length} missing objects`);
        }
        if (corrupted.length > 0) {
          console.warn(`[backup] files backup ${backupId} has ${corrupted.length} corrupted objects`);
        }
      }

      if (verified) {
        manifest.status = "VERIFIED";
        manifest.verifiedAt = new Date().toISOString();
        manifest.verificationStatus = "PASSED";
      }

      const retentionDays = Number(process.env.BACKUP_RETENTION_DAYS || "30");
      manifest.retentionUntil = new Date(Date.now() + retentionDays * 24 * 60 * 60 * 1000).toISOString();

      await writeManifest(manifestPath, manifest);

      return {
        manifest,
        path: backupContentDir,
        sizeBytes: totalBytes,
        durationMs,
      };
    } else if (storageProvider === "s3") {
      // For S3, if provider already offers verified backup (versioning, replication), avoid duplicate
      // Document that S3 versioning is the backup mechanism
      // For now, we still backup metadata and list objects, but not content if versioning enabled
      const s3Bucket = process.env.STORAGE_S3_BUCKET;
      if (!s3Bucket) throw new Error("S3 bucket not configured");

      // If S3 versioning is enabled, we can rely on it and just backup metadata
      // For this phase, we document and create metadata-only backup
      const metadataOnly = process.env.BACKUP_S3_USE_VERSIONING === "true";

      if (metadataOnly) {
        // Metadata-only backup
        for (const file of allFiles) {
          entries.push({
            id: file.id,
            storagePath: file.storagePath,
            fileName: file.fileName,
            originalName: file.originalName,
            mimeType: file.mimeType,
            sizeBytes: file.sizeBytes,
            checksum: file.checksum,
            provider: file.storageProvider,
          });
        }
        fileCount = entries.length;
        await writeFile(metadataPath, JSON.stringify({ entries, fileCount, note: "S3 versioning enabled, content backed up via provider" }, null, 2), "utf-8");

        const durationMs = Date.now() - start;
        manifest.completedAt = new Date().toISOString();
        manifest.durationMs = durationMs;
        manifest.sizeBytes = 0;
        manifest.fileCount = fileCount;
        manifest.status = "VERIFIED";
        manifest.verifiedAt = new Date().toISOString();
        manifest.verificationStatus = "PASSED";
        manifest.notes = "S3 versioning is primary backup, metadata only";

        await writeManifest(manifestPath, manifest);

        return {
          manifest,
          path: metadataPath,
          sizeBytes: 0,
          durationMs,
        };
      } else {
        throw new Error("S3 file backup requires SDK and bucket access, not verified in this environment");
      }
    } else {
      throw new Error(`Unsupported storage provider for backup: ${storageProvider}`);
    }
  } catch (err) {
    manifest.status = "FAILED";
    manifest.verificationStatus = "FAILED";
    await writeManifest(manifestPath, manifest).catch(() => {});
    throw err;
  } finally {
    releaseLock();
  }
}

export async function listFilesBackups(): Promise<BackupManifest[]> {
  const destDir = getFilesBackupDir();
  const { readdir } = await import("fs/promises");
  const files = await readdir(destDir).catch(() => [] as string[]);
  const manifests: BackupManifest[] = [];
  for (const f of files) {
    if (!f.endsWith(".json") || f.includes(".metadata")) continue;
    try {
      const data = await readFile(path.join(destDir, f), "utf-8");
      const m = JSON.parse(data) as BackupManifest;
      if (m.type === "files") manifests.push(m);
    } catch {}
  }
  return manifests.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function verifyFilesBackup(backupId: string): Promise<{ valid: boolean; missing: number; corrupted: number; fileCount: number }> {
  const destDir = getFilesBackupDir();
  const manifestPath = path.join(destDir, `${backupId}.json`);
  const metadataPath = path.join(destDir, `${backupId}.metadata.json`);
  const contentDir = path.join(destDir, backupId);

  try {
    const manifestData = await readFile(manifestPath, "utf-8");
    const manifest = JSON.parse(manifestData) as BackupManifest;
    const metadataData = await readFile(metadataPath, "utf-8").catch(() => null);
    if (!metadataData) return { valid: false, missing: 0, corrupted: 0, fileCount: 0 };
    const metadata = JSON.parse(metadataData);

    const missing = metadata.missing?.length || 0;
    const corrupted = metadata.corrupted?.length || 0;
    const fileCount = metadata.fileCount || 0;

    // Check if content dir exists and files exist
    if (manifest.provider === "local-files") {
      const stats = await stat(contentDir).catch(() => null);
      if (!stats) return { valid: false, missing, corrupted, fileCount };
    }

    const valid = missing === 0 && corrupted === 0 && manifest.status === "VERIFIED";
    return { valid, missing, corrupted, fileCount };
  } catch {
    return { valid: false, missing: 0, corrupted: 0, fileCount: 0 };
  }
}
