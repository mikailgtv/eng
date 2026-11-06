/**
 * Phase 31 — Backup, Restore & Disaster Recovery types
 * No secrets in types, only metadata
 */

export type BackupProvider = "postgres" | "sqlite" | "local-files" | "s3-files";
export type BackupStatus = "CREATED" | "VERIFYING" | "VERIFIED" | "FAILED" | "CORRUPTED" | "EXPIRED";
export type RestoreStatus = "PENDING" | "VERIFYING" | "RESTORING" | "VALIDATING" | "SUCCESS" | "FAILED";

export interface BackupManifest {
  backupId: string; // e.g., db-20261010-041000-abc123
  type: "database" | "files" | "full";
  provider: BackupProvider;
  createdAt: string; // ISO
  completedAt?: string;
  durationMs?: number;
  sizeBytes?: number;
  checksumSha256?: string;
  schemaVersion?: string;
  migrationId?: string;
  databaseUrlHash?: string; // hash of connection string host, not secret
  storageProvider?: string;
  storageBucketHash?: string; // hash of bucket name, not secret
  fileCount?: number;
  tables?: number;
  rows?: number;
  status: BackupStatus;
  verifiedAt?: string;
  verificationStatus?: "PASSED" | "FAILED" | "PENDING";
  encryption?: "none" | "at-rest" | "aes-256-gcm";
  retentionUntil?: string;
  createdBy?: string; // actorId or "system" or "manual"
  notes?: string;
  // Non-sensitive metadata only
}

export interface BackupResult {
  manifest: BackupManifest;
  path: string; // local path or remote key (not secret)
  sizeBytes: number;
  durationMs: number;
}

export interface RestoreRequest {
  backupId: string;
  target: "isolated" | "staging" | "production"; // production forbidden
  targetId?: string; // disposable target identifier
  requestedBy: string;
  reason: string;
}

export interface RestoreResult {
  restoreId: string;
  backupId: string;
  target: string;
  targetPath?: string;
  status: RestoreStatus;
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  validation?: RecoveryValidationResult;
  error?: string;
}

export interface RecoveryValidationResult {
  databaseIntegrity: "PASSED" | "FAILED" | "NOT_APPLICABLE";
  rowCountsMatch: boolean;
  foreignKeysValid: boolean;
  checksumValid: boolean;
  fileReferencesConsistent: boolean;
  orphanedRecords: number;
  missingObjects: number;
  authWorks: boolean;
  appStartup: boolean;
  details?: string;
}

export interface BackupPolicy {
  retentionDays: number;
  retentionCount: number; // keep at least N verified backups
  encryptionAtRest: boolean;
  encryptionInTransit: boolean;
  allowedRoles: string[]; // roles allowed to create/restore
  schedule?: string; // cron expression if supported
  backupDestination: string; // e.g., ./backups or s3://bucket/backups
  verifyAfterCreate: boolean;
  alertOnFailure: boolean;
}
