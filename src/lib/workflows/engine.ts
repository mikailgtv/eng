import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const WORKFLOW_EVENTS = [
  "USER_CREATED", "USER_UPDATED", "USER_DEACTIVATED", "COURSE_ENROLLED", "COURSE_STARTED", "COURSE_COMPLETED",
  "MODULE_STARTED", "MODULE_COMPLETED", "LESSON_STARTED", "LESSON_COMPLETED", "PRACTICE_COMPLETED", "QUIZ_COMPLETED",
  "EXAM_STARTED", "EXAM_COMPLETED", "EXAM_PASSED", "EXAM_FAILED", "DIAGNOSTIC_COMPLETED", "PLACEMENT_COMPLETED",
  "SPEAKING_COMPLETED", "LISTENING_COMPLETED", "WRITING_SUBMITTED", "ASSIGNMENT_CREATED", "ASSIGNMENT_SUBMITTED",
  "ASSIGNMENT_OVERDUE", "ATTENDANCE_PRESENT", "ATTENDANCE_ABSENT", "ATTENDANCE_LATE", "STREAK_STARTED", "STREAK_EXTENDED",
  "STREAK_BROKEN", "BADGE_EARNED", "MILESTONE_REACHED", "XP_EARNED", "CERTIFICATE_ELIGIBLE", "CERTIFICATE_ISSUED",
  "CERTIFICATE_REVOKED", "MESSAGE_RECEIVED", "NOTIFICATION_CREATED", "LEARNING_RECOMMENDATION_CREATED", "REVIEW_DUE",
  "INTEGRATION_SYNC_COMPLETED", "INTEGRATION_SYNC_FAILED", "MANUAL_TRIGGERED",
] as const;
export type WorkflowEventType = (typeof WORKFLOW_EVENTS)[number];

const conditionSchema = z.object({
  field: z.enum(["user.role", "user.englishLevel", "user.groupId", "event.eventType", "event.objectType", "event.source"]),
  op: z.enum(["EQ", "NE", "IN", "NOT_IN", "CONTAINS", "IS_EMPTY", "IS_NOT_EMPTY"]),
  value: z.union([z.string().max(160), z.array(z.string().max(160)).max(50)]).optional(),
}).strict();
const definitionSchema = z.object({
  trigger: z.object({ type: z.enum(["EVENT", "MANUAL"]), eventType: z.enum(WORKFLOW_EVENTS).optional() }).strict(),
  conditions: z.object({ operator: z.enum(["AND", "OR"]), rules: z.array(conditionSchema).max(20) }).strict().default({ operator: "AND", rules: [] }),
  steps: z.array(z.discriminatedUnion("type", [
    z.object({ type: z.literal("SEND_NOTIFICATION"), title: z.string().trim().min(1).max(100), body: z.string().trim().min(1).max(500), href: z.string().max(300).optional() }).strict(),
    z.object({ type: z.literal("CREATE_LEARNING_RECOMMENDATION"), title: z.string().trim().min(1).max(100), reason: z.string().trim().min(1).max(300), href: z.string().max(300), skillCode: z.string().max(50).optional(), durationMin: z.number().int().min(1).max(120).default(10) }).strict(),
    z.object({ type: z.literal("WAIT"), minutes: z.number().int().min(1).max(43_200) }).strict(),
    z.object({ type: z.literal("REQUIRE_APPROVAL"), label: z.string().trim().min(1).max(160), timeoutHours: z.number().int().min(1).max(720).default(168) }).strict(),
  ])).min(1).max(20),
}).strict();
export type WorkflowDefinition = z.infer<typeof definitionSchema>;

export function validateDefinition(input: unknown): WorkflowDefinition {
  const parsed = definitionSchema.parse(input);
  if (parsed.trigger.type === "EVENT" && !parsed.trigger.eventType) throw new Error("Event workflows require an event type.");
  for (const step of parsed.steps) {
    if ("href" in step && step.href && (!step.href.startsWith("/") || step.href.startsWith("//") || step.href.includes("\\"))) throw new Error("Workflow links must be safe internal paths.");
  }
  return parsed;
}

export type EmitEventInput = {
  organizationId: string; eventType: WorkflowEventType; actorId?: string | null; subjectUserId?: string | null;
  objectType?: string | null; objectId?: string | null; source: string; eventVersion?: number;
  metadata?: Record<string, unknown>; idempotencyKey: string;
};
const SAFE_META_KEY = /^[a-zA-Z][a-zA-Z0-9_]{0,39}$/;
function safeMetadata(input: Record<string, unknown> = {}) {
  const output: Record<string, string | number | boolean | null> = {};
  for (const [key, value] of Object.entries(input).slice(0, 30)) {
    if (!SAFE_META_KEY.test(key) || /password|secret|token|credential|email|phone|address|answer|message/i.test(key)) continue;
    if (typeof value === "string") output[key] = value.slice(0, 300);
    else if (typeof value === "number" && Number.isFinite(value)) output[key] = value;
    else if (typeof value === "boolean" || value === null) output[key] = value;
  }
  return output;
}

export class EventBus {
  static async publish(input: EmitEventInput) {
    if (!input.organizationId || !input.idempotencyKey || input.idempotencyKey.length > 180) throw new Error("Organization and bounded idempotency key are required.");
    WorkflowLoopProtectionService.assertSourceAllowed(input.source);
    if (!WORKFLOW_EVENTS.includes(input.eventType)) throw new Error("Unsupported workflow event.");
    const prior = await prisma.workflowEvent.findUnique({ where: { organizationId_idempotencyKey: { organizationId: input.organizationId, idempotencyKey: input.idempotencyKey } } });
    if (prior) return prior;
    const pending = await prisma.workflowEvent.count({ where: { organizationId: input.organizationId, status: { in: ["QUEUED", "PROCESSING"] } } });
    if (pending >= 10_000) throw new Error("Organization workflow queue is at capacity; event was not accepted.");
    try {
      return await prisma.workflowEvent.create({ data: {
        organizationId: input.organizationId, eventType: input.eventType, actorId: input.actorId ?? null,
        subjectUserId: input.subjectUserId ?? null, objectType: input.objectType?.slice(0, 80) ?? null,
        objectId: input.objectId?.slice(0, 100) ?? null, source: input.source.slice(0, 80), eventVersion: input.eventVersion ?? 1,
        metadataJson: JSON.stringify(safeMetadata(input.metadata)), idempotencyKey: input.idempotencyKey,
      } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        return prisma.workflowEvent.findUnique({ where: { organizationId_idempotencyKey: { organizationId: input.organizationId, idempotencyKey: input.idempotencyKey } } });
      }
      throw error;
    }
  }
}

type EvalContext = { user: { role: string; englishLevel: string | null; groupId: string | null }; event: { eventType: string; objectType: string | null; source: string } };
export function evaluateConditions(group: WorkflowDefinition["conditions"], context: EvalContext) {
  const get = (field: string) => field.startsWith("user.") ? context.user[field.slice(5) as keyof EvalContext["user"]] : context.event[field.slice(6) as keyof EvalContext["event"]];
  const matches = group.rules.map((rule) => {
    const actual = get(rule.field);
    const empty = actual === null || actual === undefined || actual === "";
    switch (rule.op) {
      case "IS_EMPTY": return empty;
      case "IS_NOT_EMPTY": return !empty;
      case "EQ": return String(actual ?? "") === String(rule.value ?? "");
      case "NE": return String(actual ?? "") !== String(rule.value ?? "");
      case "IN": return Array.isArray(rule.value) && rule.value.map(String).includes(String(actual ?? ""));
      case "NOT_IN": return Array.isArray(rule.value) && !rule.value.map(String).includes(String(actual ?? ""));
      case "CONTAINS": return Array.isArray(actual) ? actual.map(String).includes(String(rule.value ?? "")) : String(actual ?? "").includes(String(rule.value ?? ""));
    }
  });
  return group.operator === "OR" ? matches.some(Boolean) : matches.every(Boolean);
}

export class ConditionEvaluator {
  static evaluate(group: WorkflowDefinition["conditions"], context: EvalContext) { return evaluateConditions(group, context); }
}

export class RuleEngine {
  static matchesTrigger(definition: WorkflowDefinition, event: { eventType: string; objectType: string | null; objectId: string | null }, workflowId: string) {
    if (definition.trigger.type === "EVENT") return definition.trigger.eventType === event.eventType;
    return event.eventType === "MANUAL_TRIGGERED" && event.objectType === "WORKFLOW" && event.objectId === workflowId;
  }
}

export class WorkflowLoopProtectionService {
  static assertSourceAllowed(source: string) {
    if (/^WORKFLOW(?:_|:)/i.test(source)) throw new Error("Workflow-generated events cannot recursively re-enter the event bus.");
  }
}

export class WorkflowRetryService {
  static eventBackoff(attempt: number) { return Math.min(30_000 * 2 ** Math.max(0, attempt), 900_000); }
  static actionBackoff(attempt: number) { return Math.min(60_000 * 2 ** Math.max(1, attempt), 3_600_000); }
}

async function loadContext(orgId: string, subjectUserId: string | null, event: { eventType: string; objectType: string | null; source: string }): Promise<EvalContext | null> {
  const user = subjectUserId ? await prisma.user.findFirst({ where: { id: subjectUserId, organizationId: orgId }, select: { role: true, englishLevel: true, groupId: true } }) : null;
  if (subjectUserId && !user) return null;
  return { user: user ?? { role: "SYSTEM", englishLevel: null, groupId: null }, event };
}

function hashDefinition(definition: WorkflowDefinition) { return createHash("sha256").update(JSON.stringify(definition)).digest("hex"); }
export async function saveWorkflow(input: { organizationId: string; actorId: string; id?: string; name: string; description?: string; definition: unknown }) {
  const definition = validateDefinition(input.definition);
  const name = input.name.trim();
  if (name.length < 3 || name.length > 100) throw new Error("Workflow name must be 3–100 characters.");
  if (!input.id) {
    const count = await prisma.workflow.count({ where: { organizationId: input.organizationId, status: { not: "ARCHIVED" } } });
    if (count >= 200) throw new Error("Organization workflow limit reached (200 active or draft workflows).");
    return prisma.workflow.create({ data: {
      organizationId: input.organizationId, name, description: input.description?.trim().slice(0, 500) ?? null, createdById: input.actorId,
      versions: { create: { version: 1, status: "DRAFT", definitionJson: JSON.stringify(definition), checksum: hashDefinition(definition), createdById: input.actorId } },
    }, include: { versions: true } });
  }
  const current = await prisma.workflow.findFirst({ where: { id: input.id, organizationId: input.organizationId } });
  if (!current) throw new Error("Workflow not found in this organization.");
  if (current.status === "ARCHIVED") throw new Error("Archived workflows cannot be edited.");
  const nextVersion = current.currentVersion + 1;
  return prisma.$transaction(async (tx) => {
    const workflow = await tx.workflow.update({ where: { id: current.id }, data: { name, description: input.description?.trim().slice(0, 500) ?? null, currentVersion: nextVersion } });
    const version = await tx.workflowVersion.create({ data: { workflowId: current.id, version: nextVersion, status: "DRAFT", definitionJson: JSON.stringify(definition), checksum: hashDefinition(definition), createdById: input.actorId } });
    return { ...workflow, versions: [version] };
  });
}

export async function publishWorkflow(organizationId: string, workflowId: string) {
  const workflow = await prisma.workflow.findFirst({ where: { id: workflowId, organizationId } });
  const version = await prisma.workflowVersion.findFirst({ where: { workflowId, version: workflow?.currentVersion } });
  if (!workflow || !version) throw new Error("Workflow version not found in this organization.");
  const definition = validateDefinition(JSON.parse(version.definitionJson));
  if (!definition.steps.length) throw new Error("A published workflow needs at least one step.");
  await prisma.$transaction([
    prisma.workflowVersion.update({ where: { id: version.id }, data: { status: "PUBLISHED", publishedAt: new Date() } }),
    prisma.workflow.update({ where: { id: workflowId }, data: { status: "PUBLISHED" } }),
  ]);
  return { ...workflow, status: "PUBLISHED", version: version.version };
}

async function recordStep(runId: string, stepIndex: number, type: string, status: string, values: { input?: unknown; output?: unknown; error?: string } = {}) {
  const now = new Date();
  const common = { stepType: type, status, inputJson: values.input ? JSON.stringify(values.input).slice(0, 4000) : null, outputJson: values.output ? JSON.stringify(values.output).slice(0, 4000) : null, error: values.error?.slice(0, 500) ?? null };
  return prisma.workflowRunStep.upsert({
    where: { runId_stepIndex: { runId, stepIndex } },
    create: { runId, stepIndex, ...common, attempts: status === "RUNNING" ? 1 : 0, startedAt: status === "RUNNING" ? now : null, endedAt: status === "RUNNING" ? null : now },
    update: { ...common, ...(status === "RUNNING" ? { startedAt: now, endedAt: null, attempts: { increment: 1 } } : { endedAt: now }) },
  });
}

export async function executeAction(run: any, event: any, step: WorkflowDefinition["steps"][number], stepIndex: number) {
  const key = `${run.id}:${stepIndex}`;
  const existing = await prisma.workflowIdempotencyRecord.findUnique({ where: { organizationId_key: { organizationId: run.organizationId, key } } });
  if (existing?.status === "SUCCEEDED") return { skipped: true, reason: "Already completed" };
  if (!existing) await prisma.workflowIdempotencyRecord.create({ data: { organizationId: run.organizationId, key, workflowId: run.workflowId, runId: run.id, stepIndex, status: "STARTED" } });
  let output: Record<string, unknown>;
  if (step.type === "SEND_NOTIFICATION") {
    const recipient = event.subjectUserId ? await prisma.user.findFirst({ where: { id: event.subjectUserId, organizationId: run.organizationId, status: "ACTIVE" }, select: { id: true, firstName: true, role: true } }) : null;
    if (!recipient) return { skipped: true, reason: "No active in-organization subject user" };
    const title = step.title.replaceAll("{{firstName}}", recipient.firstName).replaceAll("{{eventType}}", event.eventType);
    const body = step.body.replaceAll("{{firstName}}", recipient.firstName).replaceAll("{{eventType}}", event.eventType);
    const { publishNotification } = await import("@/lib/communication/hub");
    const result = await publishNotification({ userIds: [recipient.id], type: "WORKFLOW_UPDATE", title, body, href: step.href ?? null, category: "ACADEMIC", source: "WORKFLOW", relatedType: "WORKFLOW_RUN", relatedId: run.id });
    output = { delivery: result };
  } else if (step.type === "CREATE_LEARNING_RECOMMENDATION") {
    const recipient = event.subjectUserId ? await prisma.user.findFirst({ where: { id: event.subjectUserId, organizationId: run.organizationId, status: "ACTIVE", role: "STUDENT" }, select: { id: true } }) : null;
    if (!recipient) return { skipped: true, reason: "No active in-organization student" };
    const marker = `workflow:${run.id}:${stepIndex}`;
    const found = await prisma.learningRecommendation.findFirst({ where: { studentId: recipient.id, source: "WORKFLOW", evidence: marker } });
    const row = found ?? await prisma.learningRecommendation.create({ data: { studentId: recipient.id, title: step.title, reason: step.reason, skillCode: step.skillCode ?? null, href: step.href, durationMin: step.durationMin, priority: 1, source: "WORKFLOW", evidence: marker } });
    output = { recommendationId: row.id, created: !found };
  } else {
    throw new Error("Only action steps can be passed to ActionExecutor.");
  }
  await prisma.workflowIdempotencyRecord.update({ where: { organizationId_key: { organizationId: run.organizationId, key } }, data: { status: "SUCCEEDED", completedAt: new Date() } });
  return output;
}

export class ActionExecutor {
  static execute(run: Parameters<typeof executeAction>[0], event: Parameters<typeof executeAction>[1], step: WorkflowDefinition["steps"][number], stepIndex: number) {
    return executeAction(run, event, step, stepIndex);
  }
}

async function runSteps(runId: string) {
  let run = await prisma.workflowRun.findUnique({ where: { id: runId }, include: { workflow: true, version: true, event: true } });
  if (!run || run.status !== "RUNNING") return;
  const parsedEvent = JSON.parse(run.event.metadataJson || "{}");
  const context = await loadContext(run.organizationId, run.event.subjectUserId, { eventType: run.event.eventType, objectType: run.event.objectType, source: run.event.source });
  if (!context) { await prisma.workflowRun.update({ where: { id: run.id }, data: { status: "SKIPPED", endedAt: new Date(), error: "Subject user is outside workflow organization." } }); return; }
  const definition = validateDefinition(JSON.parse(run.version.definitionJson));
  if (!ConditionEvaluator.evaluate(definition.conditions, context)) { await prisma.workflowRun.update({ where: { id: run.id }, data: { status: "SKIPPED", endedAt: new Date() } }); return; }
  await prisma.workflowRun.update({ where: { id: run.id }, data: { status: "RUNNING", nextRunAt: null, error: null } });
  for (let index = run.currentStep; index < definition.steps.length; index += 1) {
    run = await prisma.workflowRun.findUnique({ where: { id: run.id }, include: { workflow: true, version: true, event: true } });
    if (!run || run.status !== "RUNNING") return;
    const step = definition.steps[index];
    await recordStep(run.id, index, step.type, "RUNNING", { input: step });
    try {
      if (step.type === "WAIT") {
        const resumeAt = new Date(Date.now() + step.minutes * 60_000);
        await recordStep(run.id, index, step.type, "SUCCEEDED", { input: step, output: { resumeAt: resumeAt.toISOString() } });
        await prisma.workflowRun.update({ where: { id: run.id }, data: { status: "WAITING", currentStep: index + 1, nextRunAt: resumeAt } });
        return;
      }
      if (step.type === "REQUIRE_APPROVAL") {
        const expiresAt = new Date(Date.now() + step.timeoutHours * 3_600_000);
        await prisma.workflowApproval.upsert({ where: { runId_stepIndex: { runId: run.id, stepIndex: index } }, create: { runId: run.id, stepIndex: index, status: "PENDING", expiresAt }, update: {} });
        await recordStep(run.id, index, step.type, "WAITING", { input: step, output: { status: "PENDING", expiresAt: expiresAt.toISOString() } });
        await prisma.workflowRun.update({ where: { id: run.id }, data: { status: "WAITING", currentStep: index + 1, nextRunAt: expiresAt } });
        return;
      }
      const output = await ActionExecutor.execute(run, run.event, step, index);
      await recordStep(run.id, index, step.type, output && "skipped" in output ? "SKIPPED" : "SUCCEEDED", { input: step, output });
      await prisma.workflowRun.update({ where: { id: run.id }, data: { currentStep: index + 1 } });
    } catch (error) {
      const message = error instanceof Error ? error.message.slice(0, 500) : "Action failed";
      await recordStep(run.id, index, step.type, "FAILED", { input: step, error: message });
      const retries = run.retryCount + 1;
      const retry = retries < 5;
      await prisma.workflowRun.update({ where: { id: run.id }, data: { status: retry ? "FAILED" : "FAILED", retryCount: retries, nextRunAt: retry ? new Date(Date.now() + WorkflowRetryService.actionBackoff(retries)) : null, error: message, endedAt: retry ? null : new Date() } });
      return;
    }
  }
  await prisma.workflowRun.update({ where: { id: run.id }, data: { status: "COMPLETED", endedAt: new Date(), nextRunAt: null } });
}

export async function processWorkflowQueue(organizationId: string, limit = 25) {
  const cap = Math.min(50, Math.max(1, limit));
  const now = new Date();
  const staleLock = new Date(now.getTime() - 5 * 60_000);
  const dueEvents = await prisma.workflowEvent.findMany({ where: { organizationId, OR: [{ status: "QUEUED", nextAttemptAt: { lte: now } }, { status: "PROCESSING", lockedAt: { lt: staleLock } }] }, orderBy: { createdAt: "asc" }, take: cap });
  let eventsClaimed = 0;
  let runsCreated = 0;
  for (const event of dueEvents) {
    const claimed = await prisma.workflowEvent.updateMany({ where: { id: event.id, organizationId, OR: [{ status: "QUEUED", nextAttemptAt: { lte: now } }, { status: "PROCESSING", lockedAt: { lt: staleLock } }] }, data: { status: "PROCESSING", lockedAt: new Date(), attempts: { increment: 1 } } });
    if (!claimed.count) continue;
    eventsClaimed += 1;
    try {
      const workflows = await prisma.workflow.findMany({ where: { organizationId, status: "PUBLISHED" }, include: { versions: { where: { status: "PUBLISHED" }, orderBy: { version: "desc" }, take: 1 } } });
      for (const workflow of workflows) {
        const version = workflow.versions[0];
        if (!version) continue;
        const definition = validateDefinition(JSON.parse(version.definitionJson));
        if (!RuleEngine.matchesTrigger(definition, event, workflow.id)) continue;
        try {
          await prisma.workflowRun.create({ data: { organizationId, workflowId: workflow.id, versionId: version.id, eventId: event.id, subjectUserId: event.subjectUserId } });
          runsCreated += 1;
        } catch (error) { if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")) throw error; }
      }
      await prisma.workflowEvent.update({ where: { id: event.id }, data: { status: "PROCESSED", lockedAt: null, processedAt: new Date(), lastError: null } });
    } catch (error) {
      const delay = WorkflowRetryService.eventBackoff(event.attempts);
      await prisma.workflowEvent.update({ where: { id: event.id }, data: { status: event.attempts + 1 >= 5 ? "FAILED" : "QUEUED", lockedAt: null, nextAttemptAt: new Date(Date.now() + delay), lastError: error instanceof Error ? error.message.slice(0, 500) : "Dispatch failed" } });
    }
  }
  const dueRuns = await prisma.workflowRun.findMany({ where: { organizationId, OR: [
    { status: "QUEUED" },
    { status: "WAITING", nextRunAt: { lte: new Date() }, approvals: { none: { status: "PENDING" } } },
    { status: "FAILED", nextRunAt: { lte: new Date() } },
    { status: "RUNNING", startedAt: { lt: new Date(Date.now() - 5 * 60_000) } },
  ] }, orderBy: { createdAt: "asc" }, take: cap });
  let runsProcessed = 0;
  for (const run of dueRuns) {
    const claimed = await prisma.workflowRun.updateMany({
      where: { id: run.id, organizationId, status: run.status, ...(run.status === "QUEUED" ? {} : run.status === "RUNNING" ? { startedAt: { lt: new Date(Date.now() - 5 * 60_000) } } : { nextRunAt: { lte: new Date() } }) },
      data: { status: "RUNNING", startedAt: new Date() },
    });
    if (!claimed.count) continue;
    await runSteps(run.id);
    runsProcessed += 1;
  }
  return { eventsClaimed, runsCreated, runsProcessed };
}

export async function simulateWorkflow(organizationId: string, definitionInput: unknown, subjectUserId?: string) {
  const definition = validateDefinition(definitionInput);
  const event = { eventType: definition.trigger.eventType ?? "MANUAL", objectType: null, source: "TEST_SIMULATION" };
  const context = await loadContext(organizationId, subjectUserId ?? null, event);
  if (!context) throw new Error("Test subject must belong to this organization.");
  const matched = evaluateConditions(definition.conditions, context);
  return { triggerMatched: true, conditionMatched: matched, steps: definition.steps.map((step) => ({ type: step.type, wouldExecute: matched && step.type !== "WAIT" && step.type !== "REQUIRE_APPROVAL", simulated: true })), sideEffectsApplied: false };
}
