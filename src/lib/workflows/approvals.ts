import { prisma } from "@/lib/prisma";

export class WorkflowApprovalError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export async function decideWorkflowApproval(input: { organizationId: string; approvalId: string; actorId: string; decision: "APPROVE" | "REJECT"; reason?: string }) {
  const approval = await prisma.workflowApproval.findFirst({ where: { id: input.approvalId, status: "PENDING", run: { organizationId: input.organizationId } }, include: { run: { select: { id: true, status: true, currentStep: true, workflowId: true } } } });
  if (!approval) throw new WorkflowApprovalError(404, "Pending approval not found in this organization.");
  const approved = input.decision === "APPROVE";
  const reason = (input.reason ?? "").trim().slice(0, 500);
  await prisma.$transaction(async (tx) => {
    const claimed = await tx.workflowApproval.updateMany({ where: { id: approval.id, status: "PENDING" }, data: { status: approved ? "APPROVED" : "REJECTED", decidedById: input.actorId, reason: reason || null, decidedAt: new Date() } });
    if (!claimed.count) throw new WorkflowApprovalError(409, "This approval was already decided.");
    await tx.workflowRunStep.updateMany({ where: { runId: approval.runId, stepIndex: approval.stepIndex, status: "WAITING" }, data: { status: approved ? "SUCCEEDED" : "SKIPPED", outputJson: JSON.stringify({ decision: approved ? "APPROVED" : "REJECTED", decidedById: input.actorId, reason: reason || null }), endedAt: new Date() } });
    await tx.workflowRun.updateMany({ where: { id: approval.runId, organizationId: input.organizationId, status: "WAITING" }, data: approved ? { status: "QUEUED", nextRunAt: null, error: null } : { status: "CANCELLED", nextRunAt: null, endedAt: new Date(), error: `Approval rejected${reason ? `: ${reason}` : "."}` } });
  });
  return { status: approved ? "APPROVED" as const : "REJECTED" as const, workflowId: approval.run.workflowId };
}
