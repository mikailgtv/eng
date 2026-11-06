import { prisma } from "@/lib/prisma";
import { getStorageReadiness } from "@/lib/storage";

export type HealthState = "HEALTHY" | "DEGRADED" | "DOWN" | "NOT_CONFIGURED";
export type HealthComponent = { name: string; status: HealthState; detail: string; latencyMs?: number };

function optionalService(name: string, configured: boolean): HealthComponent {
  return configured
    ? { name, status: "DEGRADED", detail: "Credentials/configuration exist; no external live probe was run." }
    : { name, status: "NOT_CONFIGURED", detail: "Not configured in this environment." };
}

/** Admin diagnostics intentionally report configuration state, never secret values. */
export async function getSystemHealth() {
  const checkedAt = new Date();
  const started = Date.now();
  let database: HealthComponent;
  let probeTimer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      prisma.$queryRaw`SELECT 1`,
      new Promise<never>((_, reject) => { probeTimer = setTimeout(() => reject(new Error("probe-timeout")), 2500); }),
    ]);
    database = { name: "Database", status: "HEALTHY", detail: "Query probe succeeded.", latencyMs: Date.now() - started };
  } catch {
    database = { name: "Database", status: "DOWN", detail: "Database probe failed or exceeded the 2.5 second diagnostic limit.", latencyMs: Date.now() - started };
  } finally {
    if (probeTimer) clearTimeout(probeTimer);
  }

  // Phase 36 (PG-35-04): the storage component must reflect the real, sanitized
  // state of the configured provider. It previously reported NOT_CONFIGURED
  // unconditionally, even when local storage was configured and working.
  let storage: HealthComponent;
  try {
    const readiness = await getStorageReadiness();
    storage = readiness.state === "READY"
      ? { name: "File storage", status: "HEALTHY", detail: readiness.detail }
      : { name: "File storage", status: "DOWN", detail: readiness.detail };
  } catch {
    storage = { name: "File storage", status: "DOWN", detail: "Storage provider could not be initialised." };
  }

  const email = process.env.EMAIL_PROVIDER && process.env.EMAIL_PROVIDER !== "none" && Boolean(process.env.EMAIL_WEBHOOK_URL);
  const sms = process.env.SMS_PROVIDER === "webhook" && Boolean(process.env.SMS_WEBHOOK_URL);
  const api: HealthComponent = { name: "API runtime", status: "HEALTHY", detail: "This server-side diagnostic request executed; historical error-rate telemetry is not configured.", latencyMs: Date.now() - started };
  const components: HealthComponent[] = [
    database,
    api,
    storage,
    { name: "Background automation", status: process.env.WORKFLOW_WORKER_SECRET ? "DEGRADED" : "NOT_CONFIGURED", detail: process.env.WORKFLOW_WORKER_SECRET ? "Worker secret exists; scheduler heartbeat has not been verified." : "No external workflow worker is configured." },
    optionalService("AI tutor", Boolean(process.env.AI_API_KEY)),
    optionalService("Speech recognition", Boolean(process.env.STT_API_KEY && process.env.STT_BASE_URL)),
    optionalService("Text to speech", Boolean(process.env.TTS_API_KEY && process.env.TTS_BASE_URL)),
    optionalService("Email notifications", Boolean(email)),
    optionalService("SMS notifications", Boolean(sms)),
    optionalService("Web push", Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY)),
    { name: "External integrations", status: "DEGRADED", detail: "No global external probe was performed; inspect tenant-scoped integration status in Integrations." },
  ];
  // Readiness requires BOTH a working database and a usable storage provider:
  // an application that cannot store uploads must not be sent traffic.
  const ready = database.status === "HEALTHY" && storage.status === "HEALTHY";
  return { status: ready ? "HEALTHY" as const : "DOWN" as const, checkedAt: checkedAt.toISOString(), components };
}
