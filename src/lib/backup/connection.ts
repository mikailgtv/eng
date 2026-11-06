/**
 * Phase 36 (PG-35-03) — connection resolution for libpq tools.
 *
 * `pg_dump` / `pg_restore` / `psql` are libpq clients. They reject Prisma-only
 * URI parameters (`sslaccept`) and interpret `sslcert` as a CLIENT certificate,
 * so the application's `DATABASE_URL` cannot be handed to them directly when
 * authenticated TLS is configured.
 *
 * This module produces a libpq-compatible URL that:
 *   - verifies the server certificate and hostname (sslmode=verify-full +
 *     sslrootcert), or refuses to run at all;
 *   - is guaranteed to target the same database as DATABASE_URL unless an
 *     operator supplies an explicit, validated tooling URL;
 *   - never appears in a returned error message.
 */
import { sameTargetDatabase, toLibpqConnectionUrl } from "@/lib/db-tls";

/**
 * Connection string for pg_dump.
 * Prefers an explicitly configured libpq-flavor URL; otherwise derives one from
 * DATABASE_URL. Throws (without values) when verified TLS cannot be arranged.
 */
export function resolveBackupConnectionUrl(env: NodeJS.ProcessEnv = process.env): string {
  const explicit = (env.BACKUP_TOOLING_DATABASE_URL || "").trim();
  if (explicit) {
    const tooling = toLibpqConnectionUrl(explicit);
    if (!sameTargetDatabase(tooling, env.DATABASE_URL)) {
      throw new Error(
        "Backup configuration error: BACKUP_TOOLING_DATABASE_URL does not target the same database as DATABASE_URL",
      );
    }
    return tooling;
  }
  return toLibpqConnectionUrl(env.DATABASE_URL);
}

/**
 * Connection string for pg_restore into an isolated recovery database.
 * The recovery target must be a DIFFERENT database from the active one.
 */
export function resolveRecoveryConnectionUrl(env: NodeJS.ProcessEnv = process.env): string {
  const raw = (env.BACKUP_RECOVERY_DATABASE_URL || "").trim();
  if (!raw) {
    throw new Error(
      "Postgres recovery requires BACKUP_RECOVERY_DATABASE_URL (isolated disposable DB) - not configured, BLOCKED",
    );
  }
  const tooling = toLibpqConnectionUrl(raw);
  if (sameTargetDatabase(tooling, env.DATABASE_URL)) {
    throw new Error("Recovery configuration error: recovery target must not be the active database");
  }
  return tooling;
}

/**
 * Remove any connection URL from tool output before it reaches a log, an API
 * response, or a stored error record, and bound the length.
 */
export function sanitizeToolError(message: string): string {
  return String(message)
    .replace(/postgres(ql)?:\/\/[^\s"']+/gi, "postgresql://<redacted>")
    .slice(0, 200);
}
