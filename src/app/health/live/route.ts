import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Phase 36 (PG-35-04) — LIVENESS.
 *
 * Answers exactly one question: is the application process able to respond?
 * It deliberately performs NO database, storage, or network I/O, so a database
 * outage cannot make a healthy process look dead.
 *
 * Use THIS endpoint for container/process liveness probes and restart policy.
 * Use /health for readiness (traffic routing).
 *
 * Returning 200 here after a restart clears a crash-loop; if the process is
 * genuinely wedged the request will time out at the probe level instead.
 */
export async function GET() {
  return NextResponse.json(
    { status: "alive" },
    { status: 200, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } },
  );
}
