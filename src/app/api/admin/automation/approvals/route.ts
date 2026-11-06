import { ApiError, apiRoute, assertSameOrigin, jsonOk, parseJsonBody } from "@/lib/api";
import { requireWorkflowAccess } from "@/lib/workflows/access";
import { prisma } from "@/lib/prisma";
import { WorkflowApprovalError } from "@/lib/workflows/approvals";
import { WorkflowApprovalService } from "@/lib/workflows/services";
import { WorkflowAuditService } from "@/lib/workflows/services";

export const dynamic = "force-dynamic";
export const GET = apiRoute(async () => {
  const { organizationId } = await requireWorkflowAccess("workflows.view");
  const approvals = await prisma.workflowApproval.findMany({ where: { status: "PENDING", run: { organizationId } }, orderBy: { requestedAt: "asc" }, take: 100, include: { run: { include: { workflow: { select: { name: true } }, event: { select: { eventType: true, subjectUserId: true } } } } } });
  return jsonOk({ approvals: approvals.map((item) => ({ id: item.id, runId: item.runId, workflow: item.run.workflow.name, eventType: item.run.event.eventType, subjectUserId: item.run.event.subjectUserId, requestedAt: item.requestedAt, expiresAt: item.expiresAt })) });
});

export const POST = apiRoute(async (req) => {
  assertSameOrigin(req);
  const { user, organizationId } = await requireWorkflowAccess("workflows.approve");
  const body = await parseJsonBody(req) as { approvalId?: string; decision?: string; reason?: string };
  if (!body.approvalId || !["APPROVE", "REJECT"].includes(body.decision ?? "")) throw new ApiError(400, "Approval ID and APPROVE or REJECT decision are required.");
  let result;
  try { result = await WorkflowApprovalService.decide({ organizationId, approvalId: body.approvalId, actorId: user.id, decision: body.decision as "APPROVE" | "REJECT", reason: body.reason }); }
  catch (error) { if (error instanceof WorkflowApprovalError) throw new ApiError(error.status, error.message); throw error; }
  await WorkflowAuditService.record({ actorId: user.id, action: result.status === "APPROVED" ? "WORKFLOW_APPROVAL_APPROVED" : "WORKFLOW_APPROVAL_REJECTED", entityId: body.approvalId, metadata: { organizationId, workflowId: result.workflowId, decision: result.status } });
  return jsonOk({ status: result.status });
});
