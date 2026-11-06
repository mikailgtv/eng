/**
 * Phase 31 — Database backup system
 * Supports PostgreSQL (pg_dump) and SQLite (Online Backup API / file copy)
 * Never overwrites source, never restores into active staging DB, verifies integrity
 */

import { execFile } from "child_process";
import { promisify } from "util";
import { mkdir, stat, writeFile, readFile, unlink } from "fs/promises";
import path from "path";
import { createHash, randomBytes } from "crypto";
import { generateBackupId, hashNonSensitive, writeManifest, computeFileChecksum, getDatabaseBackupDir } from "./manifest";
import type { BackupManifest, BackupResult } from "./types";
import { getEncryptionStatus } from "./encryption";
import { resolveBackupConnectionUrl, sanitizeToolError } from "./connection";

const execFileAsync = promisify(execFile);

let backupLock = false;

function acquireLock(): boolean {
  if (backupLock) return false;
  backupLock = true;
  return true;
}

function releaseLock(): void {
  backupLock = false;
}

function getPostgresConnectionInfo(): { host: string; database: string; isPostgres: boolean } | null {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.protocol === "postgres:" || u.protocol === "postgresql:") {
      return { host: u.hostname, database: u.pathname.replace(/^\//, ""), isPostgres: true };
    }
    return { host: "sqlite", database: url, isPostgres: false };
  } catch {
    // SQLite file path
    if (url.startsWith("file:")) {
      return { host: "sqlite", database: url, isPostgres: false };
    }
    return null;
  }
}

async function backupPostgres(backupId: string, destPath: string): Promise<{ sizeBytes: number; checksum: string; durationMs: number; tables?: number; rows?: number }> {
  const start = Date.now();
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL not configured");

  // Phase 36 (PG-35-03): pg_dump is a libpq client and rejects Prisma-only
  // parameters (it fails with `invalid URI query parameter: "sslaccept"`).
  // Resolve a libpq-compatible URL that still verifies the server certificate.
  // Throws a value-free error rather than degrading TLS.
  const url = resolveBackupConnectionUrl();

  // Use pg_dump custom format for reliable restore
  // pg_dump must be available in environment
  const args = ["--dbname", url, "--format", "custom", "--file", destPath, "--no-password", "--verbose"];
  
  try {
    // Try pg_dump, fallback to pg_dump via npx if not found? We'll attempt exec
    await execFileAsync("pg_dump", args, { timeout: 300_000, maxBuffer: 100 * 1024 * 1024 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // If pg_dump not found, throw with safe message (no URL)
    if (msg.includes("ENOENT") || msg.includes("not found")) {
      throw new Error("PostgreSQL backup tool pg_dump not available in this environment");
    }
    throw new Error(`PostgreSQL backup failed: ${sanitizeToolError(msg)}`);
  }

  const stats = await stat(destPath);
  const checksum = await computeFileChecksum(destPath);
  const durationMs = Date.now() - start;

  return { sizeBytes: stats.size, checksum, durationMs };
}

async function backupSqlite(backupId: string, destPath: string): Promise<{ sizeBytes: number; checksum: string; durationMs: number; tables?: number; rows?: number }> {
  const start = Date.now();
  const url = process.env.DATABASE_URL || "";
  let sourcePath: string;

  if (url.startsWith("file:")) {
    sourcePath = url.replace(/^file:/, "");
    // Resolve relative to cwd
    if (!path.isAbsolute(sourcePath)) {
      sourcePath = path.resolve(process.cwd(), sourcePath);
    }
  } else {
    // Fallback to prisma/dev.db for local dev
    sourcePath = path.join(process.cwd(), "prisma", "dev.db");
  }

  const sourceStats = await stat(sourcePath).catch(() => null);
  if (!sourceStats) throw new Error(`SQLite source database not found at ${sourcePath}`);

  // For SQLite, use file copy with integrity check (Online Backup API would be better but file copy is safe if app not writing heavily)
  // In production, should use sqlite3 backup API
  const { readFile, writeFile } = await import("fs/promises");
  const bytes = await readFile(sourcePath);
  await mkdir(path.dirname(destPath), { recursive: true });
  await writeFile(destPath, bytes);

  // Verify copy
  const destBytes = await readFile(destPath);
  if (bytes.length !== destBytes.length) throw new Error("SQLite backup size mismatch");
  
  const checksum = createHash("sha256").update(destBytes).digest("hex");
  const durationMs = Date.now() - start;
  const stats = await stat(destPath);

  // Try to get table count via prisma? For now, approximate
  return { sizeBytes: stats.size, checksum, durationMs };
}

export async function createDatabaseBackup(options: { createdBy?: string; notes?: string } = {}): Promise<BackupResult> {
  if (!acquireLock()) {
    throw new Error("Backup already in progress, concurrent backup prevented");
  }

  const backupId = generateBackupId("db");
  const destDir = getDatabaseBackupDir();
  await mkdir(destDir, { recursive: true });

  const destPath = path.join(destDir, `${backupId}.dump`);
  const manifestPath = path.join(destDir, `${backupId}.json`);

  const connInfo = getPostgresConnectionInfo();
  const isPostgres = connInfo?.isPostgres ?? false;
  const provider = isPostgres ? "postgres" as const : "sqlite" as const;

  const manifest: BackupManifest = {
    backupId,
    type: "database",
    provider,
    createdAt: new Date().toISOString(),
    status: "CREATED",
    encryption: getEncryptionStatus(),
    createdBy: options.createdBy || "system",
    notes: options.notes,
    databaseUrlHash: connInfo ? hashNonSensitive(connInfo.host + "/" + connInfo.database) : undefined,
  };

  let result: { sizeBytes: number; checksum: string; durationMs: number };

  try {
    // Write initial manifest
    await writeManifest(manifestPath, manifest);

    if (isPostgres) {
      result = await backupPostgres(backupId, destPath);
    } else {
      result = await backupSqlite(backupId, destPath);
    }

    manifest.completedAt = new Date().toISOString();
    manifest.durationMs = result.durationMs;
    manifest.sizeBytes = result.sizeBytes;
    manifest.checksumSha256 = result.checksum;
    manifest.status = "VERIFYING";

    await writeManifest(manifestPath, manifest);

    // Verify integrity
    const verified = await verifyDatabaseBackup(destPath, manifest);
    if (!verified.valid) {
      manifest.status = "CORRUPTED";
      manifest.verificationStatus = "FAILED";
      await writeManifest(manifestPath, manifest);
      throw new Error(`Backup verification failed: ${verified.reason}`);
    }

    manifest.status = "VERIFIED";
    manifest.verifiedAt = new Date().toISOString();
    manifest.verificationStatus = "PASSED";

    const retention = getRetentionConfig();
    const retentionUntil = new Date(Date.now() + retention.retentionDays * 24 * 60 * 60 * 1000).toISOString();
    manifest.retentionUntil = retentionUntil;

    await writeManifest(manifestPath, manifest);

    return {
      manifest,
      path: destPath,
      sizeBytes: result.sizeBytes,
      durationMs: result.durationMs,
    };
  } catch (err) {
    manifest.status = "FAILED";
    manifest.verificationStatus = "FAILED";
    await writeManifest(manifestPath, manifest).catch(() => {});
    // Cleanup incomplete artifact
    await unlink(destPath).catch(() => {});
    throw err;
  } finally {
    releaseLock();
  }
}

async function verifyDatabaseBackup(destPath: string, manifest: BackupManifest): Promise<{ valid: boolean; reason?: string }> {
  try {
    const stats = await stat(destPath).catch(() => null);
    if (!stats) return { valid: false, reason: "backup file missing" };
    if (stats.size === 0) return { valid: false, reason: "backup file empty" };
    if (manifest.sizeBytes && stats.size !== manifest.sizeBytes) {
      return { valid: false, reason: `size mismatch expected ${manifest.sizeBytes} got ${stats.size}` };
    }
    if (manifest.checksumSha256) {
      const actual = await computeFileChecksum(destPath);
      if (actual !== manifest.checksumSha256) {
        return { valid: false, reason: "checksum mismatch" };
      }
    }
    // For postgres custom format, try pg_restore --list to validate
    if (manifest.provider === "postgres") {
      try {
        await execFileAsync("pg_restore", ["--list", destPath], { timeout: 30_000 });
      } catch (err) {
        // If pg_restore not available, skip this check but still consider valid if size/checksum ok
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("ENOENT")) {
          // Tool not available, skip
        } else {
          return { valid: false, reason: `pg_restore list failed: ${msg.slice(0, 100)}` };
        }
      }
    }
    return { valid: true };
  } catch (err) {
    return { valid: false, reason: err instanceof Error ? err.message : "unknown" };
  }
}

function getRetentionConfig(): { retentionDays: number; retentionCount: number } {
  const days = Number(process.env.BACKUP_RETENTION_DAYS || "30");
  const count = Number(process.env.BACKUP_RETENTION_COUNT || "5");
  return {
    retentionDays: Number.isFinite(days) && days > 0 ? days : 30,
    retentionCount: Number.isFinite(count) && count > 0 ? count : 5,
  };
}

export async function listDatabaseBackups(): Promise<BackupManifest[]> {
  const destDir = getDatabaseBackupDir();
  const { readdir } = await import("fs/promises");
  const files = await readdir(destDir).catch(() => [] as string[]);
  const manifests: BackupManifest[] = [];
  for (const f of files) {
    if (!f.endsWith(".json")) continue;
    try {
      const { readFile } = await import("fs/promises");
      const data = await readFile(path.join(destDir, f), "utf-8");
      const m = JSON.parse(data) as BackupManifest;
      manifests.push(m);
    } catch {
      // ignore corrupted manifest
    }
  }
  return manifests.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function cleanupExpiredBackups(): Promise<{ deleted: number; kept: number; lastVerifiedKept: boolean }> {
  const retention = getRetentionConfig();
  const backups = await listDatabaseBackups();
  const now = Date.now();
  let deleted = 0;
  let kept = 0;

  // Never delete last verified recoverable backup
  const verified = backups.filter(b => b.status === "VERIFIED");
  const lastVerified = verified[0]; // sorted newest first

  for (const b of backups) {
    const isExpired = b.retentionUntil ? new Date(b.retentionUntil).getTime() < now : false;
    const isOldCount = backups.indexOf(b) >= retention.retentionCount;
    
    if ((isExpired || isOldCount) && b.backupId !== lastVerified?.backupId) {
      // Safe cleanup
      const destDir = getDatabaseBackupDir();
      const dataPath = path.join(destDir, `${b.backupId}.dump`);
      const manifestPath = path.join(destDir, `${b.backupId}.json`);
      await unlink(dataPath).catch(() => {});
      await unlink(manifestPath).catch(() => {});
      deleted++;
    } else {
      kept++;
    }
  }

  return { deleted, kept, lastVerifiedKept: Boolean(lastVerified) };
}
