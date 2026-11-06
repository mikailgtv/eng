/**
 * Phase 31 — Monitoring and operational runbooks
 * Alerts for missed backups, failures, integrity checks, capacity, restore drills
 */

export type BackupAlertType =
  | "MISSED_BACKUP"
  | "FAILED_BACKUP"
  | "INTEGRITY_FAILED"
  | "STORAGE_NEAR_CAPACITY"
  | "MISSING_ARTIFACT"
  | "RESTORE_DRILL_FAILED"
  | "FILE_BACKUP_FAILED";

export interface BackupAlert {
  type: BackupAlertType;
  backupId?: string;
  message: string;
  timestamp: string;
  severity: "WARNING" | "CRITICAL";
}

function logAlert(alert: BackupAlert): void {
  // Safe logging, no secrets
  console.log(`[backup:${alert.type}] ${alert.severity} ${alert.message} id=${alert.backupId || "none"} ts=${alert.timestamp}`);
}

export function alertMissedBackup(expectedTime: string): BackupAlert {
  const alert: BackupAlert = {
    type: "MISSED_BACKUP",
    message: `Expected backup missed, expected at ${expectedTime}`,
    timestamp: new Date().toISOString(),
    severity: "WARNING",
  };
  logAlert(alert);
  return alert;
}

export function alertFailedBackup(backupId: string, reason: string): BackupAlert {
  const alert: BackupAlert = {
    type: "FAILED_BACKUP",
    backupId,
    message: `Backup failed: ${reason.slice(0, 200)}`,
    timestamp: new Date().toISOString(),
    severity: "CRITICAL",
  };
  logAlert(alert);
  return alert;
}

export function alertIntegrityFailed(backupId: string, reason: string): BackupAlert {
  const alert: BackupAlert = {
    type: "INTEGRITY_FAILED",
    backupId,
    message: `Integrity check failed: ${reason.slice(0, 200)}`,
    timestamp: new Date().toISOString(),
    severity: "CRITICAL",
  };
  logAlert(alert);
  return alert;
}

export function alertStorageNearCapacity(usagePercent: number): BackupAlert {
  const alert: BackupAlert = {
    type: "STORAGE_NEAR_CAPACITY",
    message: `Backup storage near capacity: ${usagePercent}% used`,
    timestamp: new Date().toISOString(),
    severity: usagePercent > 90 ? "CRITICAL" : "WARNING",
  };
  logAlert(alert);
  return alert;
}

export function alertMissingArtifact(backupId: string): BackupAlert {
  const alert: BackupAlert = {
    type: "MISSING_ARTIFACT",
    backupId,
    message: `Backup artifact missing for ${backupId}`,
    timestamp: new Date().toISOString(),
    severity: "CRITICAL",
  };
  logAlert(alert);
  return alert;
}

export function alertRestoreDrillFailed(backupId: string, reason: string): BackupAlert {
  const alert: BackupAlert = {
    type: "RESTORE_DRILL_FAILED",
    backupId,
    message: `Restore drill failed for ${backupId}: ${reason.slice(0, 200)}`,
    timestamp: new Date().toISOString(),
    severity: "CRITICAL",
  };
  logAlert(alert);
  return alert;
}

export function alertFileBackupFailed(backupId: string, reason: string): BackupAlert {
  const alert: BackupAlert = {
    type: "FILE_BACKUP_FAILED",
    backupId,
    message: `File backup failed: ${reason.slice(0, 200)}`,
    timestamp: new Date().toISOString(),
    severity: "CRITICAL",
  };
  logAlert(alert);
  return alert;
}

export function getMonitoringStatus(): { configured: boolean; channels: string[] } {
  // Check if real notification channels configured
  const channels: string[] = [];
  if (process.env.BACKUP_ALERT_WEBHOOK_URL) channels.push("webhook");
  if (process.env.BACKUP_ALERT_EMAIL) channels.push("email");
  if (process.env.BACKUP_ALERT_SLACK) channels.push("slack");
  
  return {
    configured: channels.length > 0,
    channels,
  };
}
