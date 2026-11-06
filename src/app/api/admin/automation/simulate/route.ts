import { ApiError, apiRoute, assertSameOrigin, jsonOk, parseJsonBody } from "@/lib/api";
import { requireWorkflowAccess } from "@/lib/workflows/access";
import { WorkflowSimulationService, WorkflowAuditService } from "@/lib/workflows/services";

export const dynamic = "force-dynamic";
export const POST = apiRoute(async (req) => {
  assertSameOrigin(req);
  const { user, organizationId } = await requireWorkflowAccess("workflows.execute");
  const body = await parseJsonBody(req) as { definition?: unknown; subjectUserId?: string };
  if (!body.definition) throw new ApiError(400, "Workflow definition is required.");
  try {
    const result = await WorkflowSimulationService.run(organizationId, body.definition, body.subjectUserId);
    await WorkflowAuditService.record({ actorId: user.id, action: "WORKFLOW_TEST_SIMULATED", metadata: { organizationId, triggerMatched: result.triggerMatched, conditionMatched: result.conditionMatched, sideEffectsApplied: false } });
    return jsonOk(result);
  } catch {
    throw new ApiError(422, "Workflow simulation could not be completed. Review the definition and try again.");
  }
});
