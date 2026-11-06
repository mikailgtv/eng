import { NextResponse } from "next/server";
import { getSystemHealth } from "@/lib/system-health";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Phase 36 (PG-35-04) — READINESS.
 *
 * Reports whether this instance can safely serve traffic: the database must be
 * reachable AND the configured storage provider must be usable. A failure in
 * either returns 503 so the instance is removed from rotation.
 *
 * Do NOT use this endpoint for liveness — a database outage would otherwise
 * restart healthy processes. Use /health/live for that.
 *
 * The body is intentionally a single status word; component detail is admin-only
 * and never exposed publicly.
 */
export async function GET() {
  const health = await getSystemHealth();
  const status = health.status === "HEALTHY" ? 200 : 503;
  return NextResponse.json(
    { status: health.status === "HEALTHY" ? "healthy" : "unavailable" },
    { status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } },
  );
}
