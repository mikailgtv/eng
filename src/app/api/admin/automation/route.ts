import { ApiError, apiRoute, assertSameOrigin, jsonOk, parseJsonBody } from "@/lib/api";
import { requireWorkflowAccess } from "@/lib/workflows/access";
import { prisma } from "@/lib/prisma";
import { saveWorkflow } from "@/lib/workflows/engine";
import { WorkflowAuditService } from "@/lib/workflows/services";
import { hasPermission } from "@/lib/identity/permissions";
import { dayWindowInZone } from "@/lib/workflows/clock";

export const dynamic = "force-dynamic";

export const GET = apiRoute(async () => {
  const { user, organizationId } = await requireWorkflowAccess("workflows.view");
  const organization = await prisma.organization.findUnique({ where: { id: organizationId }, select: { timezone: true } });
  let dayWindow: { start: Date; end: Date };
  try { dayWindow = dayWindowInZone(new Date(), organization?.timezone || "UTC"); }
  catch { dayWindow = dayWindowInZone(new Date(), "UTC"); }
  const [workflows, runs, approvals, eventCounts, completedToday, activeWorkflows, canManage, canExecute, canApprove] = await Promise.all([
    prisma.workflow.findMany({ where: { organizationId }, orderBy: { updatedAt: "desc" }, take: 100, include: { versions: { orderBy: { version: "desc" }, take: 1 } } }),
    prisma.workflowRun.findMany({ where: { organizationId }, orderBy: { createdAt: "desc" }, take: 40, include: { workflow: { select: { name: true } }, version: { select: { version: true } }, event: { select: { eventType: true } } } }),
    prisma.workflowApproval.findMany({ where: { status: "PENDING", run: { organizationId } }, orderBy: { requestedAt: "asc" }, take: 50, include: { run: { include: { workflow: { select: { name: true } }, event: { select: { eventType: true, subjectUserId: true } } } } } }),
    prisma.workflowRun.groupBy({ by: ["status"], where: { organizationId }, _count: { _all: true } }),
    prisma.workflowRun.count({ where: { organizationId, status: "COMPLETED", endedAt: { gte: dayWindow.start, lt: dayWindow.end } } }),
    prisma.workflow.count({ where: { organizationId, status: "PUBLISHED" } }),
    hasPermission(user, "workflows.manage", { type: "ORGANIZATION", id: organizationId }),
    hasPermission(user, "workflows.execute", { type: "ORGANIZATION", id: organizationId }),
    hasPermission(user, "workflows.approve", { type: "ORGANIZATION", id: organizationId }),
  ]);
  return jsonOk({
    permissions: { canManage, canExecute, canApprove },
    workflows: workflows.map((row) => ({ ...row, latestVersion: row.versions[0] ? { id: row.versions[0].id, version: row.versions[0].version, status: row.versions[0].status, definition: JSON.parse(row.versions[0].definitionJson), checksum: row.versions[0].checksum } : null, versions: undefined })),
    runs: runs.map((row) => ({ id: row.id, workflowName: row.workflow.name, version: row.version.version, trigger: row.event.eventType, subjectUserId: row.subjectUserId, status: row.status, startedAt: row.startedAt, endedAt: row.endedAt, retryCount: row.retryCount, currentStep: row.currentStep, error: row.error })),
    approvals: approvals.map((row) => ({ id: row.id, runId: row.runId, stepIndex: row.stepIndex, workflowName: row.run.workflow.name, eventType: row.run.event.eventType, subjectUserId: row.run.event.subjectUserId, requestedAt: row.requestedAt, expiresAt: row.expiresAt })),
    counts: { ...Object.fromEntries(eventCounts.map((item) => [item.status.toLowerCase(), item._count._all])), completedToday, activeWorkflows },
  });
});

export const POST = apiRoute(async (req) => {
  assertSameOrigin(req);
  const { user, organizationId } = await requireWorkflowAccess("workflows.manage");
  const body = await parseJsonBody(req) as { id?: string; name?: string; description?: string; definition?: unknown };
  if (typeof body.name !== "string" || !body.definition) throw new ApiError(400, "Name and workflow definition are required.");
  try {
    const saved = await saveWorkflow({ organizationId, actorId: user.id, id: body.id, name: body.name, description: body.description, definition: body.definition });
    await WorkflowAuditService.record({ actorId: user.id, action: body.id ? "WORKFLOW_VERSION_DRAFTED" : "WORKFLOW_CREATED", entityId: saved.id, metadata: { organizationId, version: saved.currentVersion, status: "DRAFT" } });
    return jsonOk({ workflow: { id: saved.id, name: saved.name, currentVersion: saved.currentVersion, status: saved.status } }, body.id ? 200 : 201);
  } catch {
    throw new ApiError(422, "Workflow definition could not be saved. Check the fields and try again.");
  }
});
