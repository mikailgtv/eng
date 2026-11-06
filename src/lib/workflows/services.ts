import { ApiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { decideWorkflowApproval } from "@/lib/workflows/approvals";
import {
  ActionExecutor,
  ConditionEvaluator,
  EventBus,
  RuleEngine,
  WorkflowLoopProtectionService,
  WorkflowRetryService,
  processWorkflowQueue,
  simulateWorkflow,
  validateDefinition,
  type EmitEventInput,
  type WorkflowDefinition,
} from "@/lib/workflows/engine";

export { ActionExecutor, ConditionEvaluator, EventBus, RuleEngine, WorkflowLoopProtectionService, WorkflowRetryService };

export class WorkflowValidationService {
  static validate(input: unknown) { return validateDefinition(input); }
}

export class WorkflowQueue {
  static enqueue(event: EmitEventInput) { return EventBus.publish(event); }
  static drain(organizationId: string, limit = 5) { return processWorkflowQueue(organizationId, limit); }
}

export class WorkflowScheduler {
  /** Polls persisted due events/waits. Calendar recurrence generation is not implemented. */
  static tick(organizationId: string, batchSize = 5) { return WorkflowQueue.drain(organizationId, batchSize); }
}

export class EventDispatcher {
  static dispatch(organizationId: string, batchSize = 5) { return WorkflowQueue.drain(organizationId, batchSize); }
}

export class WorkflowEngine {
  static emit(event: EmitEventInput) { return WorkflowQueue.enqueue(event); }
  static process(organizationId: string, batchSize = 5) { return WorkflowScheduler.tick(organizationId, batchSize); }
  static simulate(organizationId: string, definition: unknown, subjectUserId?: string) { return simulateWorkflow(organizationId, definition, subjectUserId); }
}

export class WorkflowRunTracker {
  static list(organizationId: string, take = 40) {
    return prisma.workflowRun.findMany({ where: { organizationId }, orderBy: { createdAt: "desc" }, take: Math.min(100, Math.max(1, take)), include: { workflow: { select: { name: true } }, version: { select: { version: true } }, event: { select: { eventType: true } }, steps: { orderBy: { stepIndex: "asc" } } } });
  }
  static async get(organizationId: string, runId: string) {
    const run = await prisma.workflowRun.findFirst({ where: { id: runId, organizationId }, include: { steps: { orderBy: { stepIndex: "asc" } }, approvals: true, event: { select: { eventType: true, occurredAt: true, source: true, objectType: true, objectId: true, subjectUserId: true } }, workflow: { select: { name: true } }, version: { select: { version: true, checksum: true } } } });
    if (!run) throw new ApiError(404, "Workflow run not found in your organization.");
    return run;
  }
}

export class WorkflowApprovalService {
  static decide = decideWorkflowApproval;
}

export class WorkflowRateLimitService {
  static async assertManualRunAllowed(organizationId: string, actorId: string) {
    const count = await prisma.workflowEvent.count({ where: { organizationId, actorId, source: "AUTHORIZED_MANUAL_RUN", createdAt: { gte: new Date(Date.now() - 60 * 60_000) } } });
    if (count >= 20) throw new ApiError(429, "Manual workflow run limit reached. Try again later.");
  }
}

export class WorkflowAuditService {
  static async record(input: { actorId: string; action: string; entityId?: string; metadata?: Record<string, unknown> }) {
    const { audit } = await import("@/lib/audit");
    return audit({ actorId: input.actorId, action: input.action, entityType: "SYSTEM", entityId: input.entityId ?? null, metadata: input.metadata ?? null });
  }
}

export class WorkflowSimulationService {
  static run(organizationId: string, definition: unknown, subjectUserId?: string) { return simulateWorkflow(organizationId, definition, subjectUserId); }
}

export type WorkflowConditionGroup = WorkflowDefinition["conditions"];
