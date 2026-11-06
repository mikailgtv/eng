import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { WorkflowScheduler } from "@/lib/workflows/services";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  const expected = process.env.WORKFLOW_WORKER_SECRET;
  if (!expected || expected.length < 32) return NextResponse.json({ error: "Workflow worker is not configured." }, { status: 503 });
  const provided = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now = new Date();
  const dueApprovals = await prisma.workflowApproval.findMany({ where: { status: "PENDING", expiresAt: { lte: now } }, select: { id: true, runId: true } });
  for (const approval of dueApprovals) {
    await prisma.workflowApproval.updateMany({ where: { id: approval.id, status: "PENDING" }, data: { status: "EXPIRED", reason: "Approval window expired.", decidedAt: now } });
    await prisma.workflowRun.updateMany({ where: { id: approval.runId, status: "WAITING" }, data: { status: "CANCELLED", error: "Approval window expired.", endedAt: now, nextRunAt: null } });
  }
  const eventOrganizations = await prisma.workflowEvent.findMany({ where: { OR: [{ status: "QUEUED", nextAttemptAt: { lte: now } }, { status: "PROCESSING", lockedAt: { lt: new Date(Date.now() - 5 * 60_000) } }] }, select: { organizationId: true }, take: 200 });
  const runOrganizations = await prisma.workflowRun.findMany({ where: { OR: [{ status: "QUEUED" }, { status: { in: ["WAITING", "FAILED"] }, nextRunAt: { lte: now } }, { status: "RUNNING", startedAt: { lt: new Date(Date.now() - 5 * 60_000) } }] }, select: { organizationId: true }, take: 200 });
  const organizations = [...new Set([...eventOrganizations, ...runOrganizations].map((row) => row.organizationId))].slice(0, 10);
  const results = [];
  for (const organizationId of organizations) results.push(await WorkflowScheduler.tick(organizationId, 5));
  return NextResponse.json({ organizationsProcessed: organizations.length, expiredApprovals: dueApprovals.length, results });
}
