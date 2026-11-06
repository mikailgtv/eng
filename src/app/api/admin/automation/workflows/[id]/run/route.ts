import { randomUUID } from "node:crypto";
import { ApiError, apiRoute, assertSameOrigin, jsonOk, parseJsonBody } from "@/lib/api";
import { requireWorkflowAccess } from "@/lib/workflows/access";
import { EventBus, validateDefinition } from "@/lib/workflows/engine";
import { WorkflowRateLimitService } from "@/lib/workflows/services";
import { prisma } from "@/lib/prisma";
import { WorkflowAuditService } from "@/lib/workflows/services";

export const dynamic = "force-dynamic";
type Context = { params: { id: string } };

export const POST = apiRoute<Context>(async (req, { params }) => {
  assertSameOrigin(req);
  const { user, organizationId } = await requireWorkflowAccess("workflows.execute");
  const body = await parseJsonBody(req) as { subjectUserId?: string };
  const workflow = await prisma.workflow.findFirst({ where: { id: params.id, organizationId, status: "PUBLISHED" } });
  const version = workflow ? await prisma.workflowVersion.findFirst({ where: { workflowId: workflow.id, status: "PUBLISHED" }, orderBy: { version: "desc" } }) : null;
  if (!workflow || !version) throw new ApiError(404, "Published workflow not found in your organization.");
  const definition = validateDefinition(JSON.parse(version.definitionJson));
  if (definition.trigger.type !== "MANUAL") throw new ApiError(422, "Only workflows with a manual trigger can be started manually.");
  if (body.subjectUserId) {
    const target = await prisma.user.findFirst({ where: { id: body.subjectUserId, organizationId }, select: { id: true } });
    if (!target) throw new ApiError(404, "Target user is not in your organization.");
  }
  await WorkflowRateLimitService.assertManualRunAllowed(organizationId, user.id);
  const event = await EventBus.publish({ organizationId, eventType: "MANUAL_TRIGGERED", actorId: user.id, subjectUserId: body.subjectUserId ?? null, objectType: "WORKFLOW", objectId: workflow.id, source: "AUTHORIZED_MANUAL_RUN", idempotencyKey: `manual:${randomUUID()}`, metadata: { workflowId: workflow.id, version: version.version } });
  await WorkflowAuditService.record({ actorId: user.id, action: "WORKFLOW_MANUALLY_TRIGGERED", entityId: workflow.id, metadata: { organizationId, version: version.version } });
  return jsonOk({ eventId: event?.id, status: event?.status }, 202);
});
