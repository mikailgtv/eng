import "server-only";
import { z } from "zod";
import { auditPostgresTls, describeTlsProblem } from "@/lib/db-tls";

const serverEnvironmentSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1),
  SESSION_SECRET: z.string().min(32),
  PUBLIC_APP_URL: z.string().optional(),
  INTEGRATION_SECRET_KEY: z.string().optional(),
  NEXT_PUBLIC_DEMO_HINTS: z.string().optional(),
  ALLOW_DEMO_SEED: z.string().optional(),
  AI_API_KEY: z.string().optional(),
  AI_BASE_URL: z.string().optional(),
  STT_API_KEY: z.string().optional(),
  STT_BASE_URL: z.string().optional(),
  TTS_API_KEY: z.string().optional(),
  TTS_BASE_URL: z.string().optional(),
  EMAIL_PROVIDER: z.string().optional(),
  EMAIL_WEBHOOK_URL: z.string().optional(),
  SMS_PROVIDER: z.string().optional(),
  SMS_WEBHOOK_URL: z.string().optional(),
  VAPID_PUBLIC_KEY: z.string().optional(),
  VAPID_PRIVATE_KEY: z.string().optional(),
  WORKFLOW_WORKER_SECRET: z.string().optional(),
  STORAGE_PROVIDER: z.enum(["local", "s3", "memory"]).optional(),
  STORAGE_LOCAL_ROOT: z.string().optional(),
  STORAGE_STAGING_ROOT: z.string().optional(),
  STORAGE_S3_BUCKET: z.string().optional(),
  STORAGE_S3_REGION: z.string().optional(),
  STORAGE_S3_ENDPOINT: z.string().optional(),
  STORAGE_S3_ACCESS_KEY_ID: z.string().optional(),
  STORAGE_S3_SECRET_ACCESS_KEY: z.string().optional(),
  STORAGE_S3_FORCE_PATH_STYLE: z.string().optional(),
  STORAGE_SIGNED_URL_EXPIRY: z.string().optional(),
  BACKUP_DESTINATION: z.string().optional(),
  BACKUP_DESTINATION_PROD: z.string().optional(),
  BACKUP_ENCRYPTION_KEY: z.string().optional(),
  BACKUP_ENCRYPTION_AT_REST: z.string().optional(),
  BACKUP_RETENTION_DAYS: z.string().optional(),
  BACKUP_RETENTION_COUNT: z.string().optional(),
  BACKUP_RECOVERY_DIR: z.string().optional(),
  BACKUP_RECOVERY_DATABASE_URL: z.string().optional(),
  BACKUP_TOOLING_DATABASE_URL: z.string().optional(),
  BACKUP_S3_USE_VERSIONING: z.string().optional(),
  BACKUP_ALERT_WEBHOOK_URL: z.string().optional(),
  BACKUP_ALERT_EMAIL: z.string().optional(),
  BACKUP_ALERT_SLACK: z.string().optional(),
  BACKUP_SCHEDULE: z.string().optional(),
}).passthrough().superRefine((env, ctx) => {
  const production = env.NODE_ENV === "production";
  const add = (key: string, message = "invalid configuration") => {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: [key], message });
  };
  const parseUrl = (key: string, value: string | undefined, requireHttps: boolean) => {
    if (!value) return null;
    try {
      const url = new URL(value);
      if (requireHttps && url.protocol !== "https:") add(key);
      if (production && ["localhost", "127.0.0.1", "::1"].includes(url.hostname)) add(key);
      return url;
    } catch {
      add(key);
      return null;
    }
  };

  if (production) {
    const appUrl = parseUrl("PUBLIC_APP_URL", env.PUBLIC_APP_URL, true);
    if (!env.PUBLIC_APP_URL || !appUrl) add("PUBLIC_APP_URL");
    const databaseUrl = parseUrl("DATABASE_URL", env.DATABASE_URL, false);
    if (!databaseUrl || !["postgres:", "postgresql:"].includes(databaseUrl.protocol)) add("DATABASE_URL");
    if (!env.INTEGRATION_SECRET_KEY || env.INTEGRATION_SECRET_KEY.length < 32) add("INTEGRATION_SECRET_KEY");
    if (env.NEXT_PUBLIC_DEMO_HINTS !== "false") add("NEXT_PUBLIC_DEMO_HINTS");
    if (env.ALLOW_DEMO_SEED === "true") add("ALLOW_DEMO_SEED");

    // Phase 36 (PG-35-01): a PostgreSQL production/staging deployment must
    // authenticate the server certificate. Prisma silently ignores `sslmode`
    // for verification, so `sslaccept=strict` + `sslcert` is required. Without
    // this, TLS is encrypted but unauthenticated and a MITM is accepted.
    const tlsAudit = auditPostgresTls(env.DATABASE_URL);
    if (tlsAudit.isPostgres) {
      for (const problem of tlsAudit.problems) add("DATABASE_URL", describeTlsProblem(problem));
    }
  }

  if (env.AI_BASE_URL) parseUrl("AI_BASE_URL", env.AI_BASE_URL, production);
  if (Boolean(env.STT_API_KEY) !== Boolean(env.STT_BASE_URL)) add("STT_API_KEY");
  if (env.STT_BASE_URL) parseUrl("STT_BASE_URL", env.STT_BASE_URL, production);
  if (Boolean(env.TTS_API_KEY) !== Boolean(env.TTS_BASE_URL)) add("TTS_API_KEY");
  if (env.TTS_BASE_URL) parseUrl("TTS_BASE_URL", env.TTS_BASE_URL, production);
  if (env.EMAIL_PROVIDER === "webhook") {
    const url = parseUrl("EMAIL_WEBHOOK_URL", env.EMAIL_WEBHOOK_URL, production);
    if (!url) add("EMAIL_WEBHOOK_URL");
  }
  if (env.SMS_PROVIDER === "webhook") {
    const url = parseUrl("SMS_WEBHOOK_URL", env.SMS_WEBHOOK_URL, production);
    if (!url) add("SMS_WEBHOOK_URL");
  }
  if (Boolean(env.VAPID_PUBLIC_KEY) !== Boolean(env.VAPID_PRIVATE_KEY)) add("VAPID_PUBLIC_KEY");
  if (env.WORKFLOW_WORKER_SECRET && env.WORKFLOW_WORKER_SECRET.length < 32) add("WORKFLOW_WORKER_SECRET");

  const storageProvider = (env.STORAGE_PROVIDER as string) || "local";
  if (!["local", "s3", "memory"].includes(storageProvider)) add("STORAGE_PROVIDER");

  // Phase 36 (PG-35-02): the S3-compatible adapter is a stub whose every
  // operation throws (upload, download, exists, getMetadata, signed URLs,
  // delete, copy, verifyChecksum). It must never pass validation, because the
  // application would report itself healthy and then fail on the first upload.
  if (storageProvider === "s3") {
    add(
      "STORAGE_PROVIDER",
      "S3 storage is not implemented in this release; use STORAGE_PROVIDER=local with a persistent volume",
    );
  }

  // NOTE: per-variable S3 checks are intentionally omitted while the provider is
  // rejected above — listing STORAGE_S3_* as "missing" would imply that supplying
  // them would make S3 usable. Restore those checks together with a real adapter.
  if (storageProvider === "local" && env.STORAGE_LOCAL_ROOT) {
    if (env.STORAGE_LOCAL_ROOT.includes("..")) add("STORAGE_LOCAL_ROOT");
  }
  if (env.STORAGE_SIGNED_URL_EXPIRY) {
    const n = Number(env.STORAGE_SIGNED_URL_EXPIRY);
    if (!Number.isFinite(n) || n <= 0 || n > 3600) add("STORAGE_SIGNED_URL_EXPIRY");
  }
  if (production && storageProvider === "memory") add("STORAGE_PROVIDER");
  if (production && env.STORAGE_STAGING_ROOT) add("STORAGE_STAGING_ROOT");

  if (env.BACKUP_ENCRYPTION_KEY && env.BACKUP_ENCRYPTION_KEY.length < 32) add("BACKUP_ENCRYPTION_KEY");
  if (env.BACKUP_RETENTION_DAYS) {
    const n = Number(env.BACKUP_RETENTION_DAYS);
    if (!Number.isFinite(n) || n <= 0 || n > 365) add("BACKUP_RETENTION_DAYS");
  }
  if (env.BACKUP_RETENTION_COUNT) {
    const n = Number(env.BACKUP_RETENTION_COUNT);
    if (!Number.isFinite(n) || n <= 0 || n > 100) add("BACKUP_RETENTION_COUNT");
  }
  if (env.BACKUP_DESTINATION && env.BACKUP_DESTINATION.includes("..")) add("BACKUP_DESTINATION");
  if (env.BACKUP_RECOVERY_DIR && env.BACKUP_RECOVERY_DIR.includes("..")) add("BACKUP_RECOVERY_DIR");
  // Phase 36 (PG-35-03): optional libpq-flavor connection used by pg_dump.
  // Validated as a PostgreSQL URL; TLS strength is enforced at use time by
  // toLibpqConnectionUrl(), which refuses to run tools without verified TLS.
  if (env.BACKUP_TOOLING_DATABASE_URL) {
    const toolingUrl = parseUrl("BACKUP_TOOLING_DATABASE_URL", env.BACKUP_TOOLING_DATABASE_URL, false);
    if (!toolingUrl || !["postgres:", "postgresql:"].includes(toolingUrl.protocol)) add("BACKUP_TOOLING_DATABASE_URL");
  }
  if (env.BACKUP_RECOVERY_DATABASE_URL) {
    // Must not be same as active DATABASE_URL in production
    if (production && env.BACKUP_RECOVERY_DATABASE_URL === env.DATABASE_URL) add("BACKUP_RECOVERY_DATABASE_URL");
  }
  if (env.BACKUP_ALERT_WEBHOOK_URL) parseUrl("BACKUP_ALERT_WEBHOOK_URL", env.BACKUP_ALERT_WEBHOOK_URL, production);
});

/**
 * Fail fast with variable names and static guidance only.
 * Values, connection URLs, hostnames and credentials are never included.
 */
export function validateServerEnvironment(environment: NodeJS.ProcessEnv = process.env): void {
  const result = serverEnvironmentSchema.safeParse(environment);
  if (result.success) return;
  const details = [...new Set(
    result.error.issues.map((issue) => {
      const name = String(issue.path[0] ?? "environment");
      const message = issue.message && issue.message !== "invalid configuration" ? `: ${issue.message}` : "";
      return `${name}${message}`;
    }),
  )].sort();
  throw new Error(`Invalid server environment configuration: ${details.join("; ")}`);
}
