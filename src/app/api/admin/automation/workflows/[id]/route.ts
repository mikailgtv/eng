import { ApiError, apiRoute, assertSameOrigin, jsonOk, parseJsonBody } from "@/lib/api";
import { requireWorkflowAccess } from "@/lib/workflows/access";
import { prisma } from "@/lib/prisma";
import { publishWorkflow } from "@/lib/workflows/engine";
import { WorkflowAuditService } from "@/lib/workflows/services";

export const dynamic = "force-dynamic";
type Context = { params: { id: string } };

export const PATCH = apiRoute<Context>(async (req, { params }) => {
  assertSameOrigin(req);
  const { user, organizationId } = await requireWorkflowAccess("workflows.manage");
  const body = await parseJsonBody(req) as { status?: string };
  if (!body.status || !["PUBLISHED", "PAUSED", "ARCHIVED"].includes(body.status)) throw new ApiError(400, "Choose PUBLISHED, PAUSED, or ARCHIVED.");
  const current = await prisma.workflow.findFirst({ where: { id: params.id, organizationId } });
  if (!current) throw new ApiError(404, "Workflow not found in your organization.");
  let result;
  if (body.status === "PUBLISHED") {
    try { result = await publishWorkflow(organizationId, current.id); }
    catch { throw new ApiError(422, "Workflow could not be published. Review the configuration and try again."); }
  } else {
    result = await prisma.workflow.update({ where: { id: current.id }, data: { status: body.status } });
  }
  await WorkflowAuditService.record({ actorId: user.id, action: `WORKFLOW_${body.status}`, entityId: current.id, metadata: { organizationId, version: current.currentVersion } });
  return jsonOk({ workflow: { id: result.id, name: result.name, status: result.status, currentVersion: current.currentVersion } });
});
