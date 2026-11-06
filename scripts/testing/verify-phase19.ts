import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { EventBus, evaluateConditions, processWorkflowQueue, publishWorkflow, saveWorkflow, simulateWorkflow, validateDefinition, WORKFLOW_EVENTS } from "@/lib/workflows/engine";
import { decideWorkflowApproval } from "@/lib/workflows/approvals";

async function main() {
  const nonce = randomUUID().replace(/-/g, "").slice(0, 16);
  const organization = await prisma.organization.create({ data: { name: `Phase 19 QA ${nonce}`, code: `P19-${nonce}` } });
  try {
    const definition = validateDefinition({ trigger: { type: "EVENT", eventType: "LESSON_COMPLETED" }, conditions: { operator: "AND", rules: [{ field: "user.englishLevel", op: "EQ", value: "PRE_A1" }] }, steps: [{ type: "SEND_NOTIFICATION", title: "Good work", body: "Keep going", href: "/student/learning" }] });
    assert.equal(definition.trigger.eventType, "LESSON_COMPLETED");
    assert.equal(WORKFLOW_EVENTS.includes("ATTENDANCE_ABSENT"), true);
    assert.equal(evaluateConditions({ operator: "AND", rules: [{ field: "event.eventType", op: "EQ", value: "LESSON_COMPLETED" }, { field: "user.role", op: "NE", value: "ADMIN" }] }, { event: { eventType: "LESSON_COMPLETED", objectType: "LESSON", source: "TEST" }, user: { role: "STUDENT", englishLevel: "PRE_A1", groupId: "g1" } }), true);
    assert.equal(evaluateConditions({ operator: "OR", rules: [{ field: "user.role", op: "EQ", value: "ADMIN" }, { field: "user.groupId", op: "IS_EMPTY" }] }, { event: { eventType: "LESSON_COMPLETED", objectType: "LESSON", source: "TEST" }, user: { role: "STUDENT", englishLevel: null, groupId: null } }), true);
    assert.throws(() => validateDefinition({ trigger: { type: "EVENT", eventType: "LESSON_COMPLETED" }, conditions: { operator: "AND", rules: [] }, steps: [{ type: "SEND_NOTIFICATION", title: "x", body: "y", href: "https://attacker.invalid" }] }), /safe internal paths/i);
    assert.throws(() => validateDefinition({ trigger: { type: "EVENT", eventType: "LESSON_COMPLETED" }, conditions: { operator: "AND", rules: [] }, steps: [{ type: "RUN_JAVASCRIPT", code: "process.exit()" }] }), /Invalid input|Invalid discriminator/i);
    assert.throws(() => validateDefinition({ trigger: { type: "EVENT", eventType: "LESSON_COMPLETED" }, conditions: { operator: "AND", rules: [{ field: "arbitrary.code", op: "EQ", value: "x" }] }, steps: [{ type: "WAIT", minutes: 10 }] }), /Invalid enum value/i);

    const noSideEffects = await simulateWorkflow(organization.id, { trigger: { type: "MANUAL" }, conditions: { operator: "AND", rules: [] }, steps: [{ type: "WAIT", minutes: 5 }, { type: "REQUIRE_APPROVAL", label: "Check", timeoutHours: 24 }] });
    assert.equal(noSideEffects.sideEffectsApplied, false);
    assert.equal(noSideEffects.steps.every((step) => step.simulated), true);

    const waitDefinition = { trigger: { type: "MANUAL" }, conditions: { operator: "AND", rules: [] }, steps: [{ type: "WAIT", minutes: 5 }] };
    let workflow = await saveWorkflow({ organizationId: organization.id, actorId: "phase19-qa", name: `Durable wait ${nonce}`, definition: waitDefinition });
    await publishWorkflow(organization.id, workflow.id);
    const v1 = await prisma.workflowVersion.findUniqueOrThrow({ where: { workflowId_version: { workflowId: workflow.id, version: 1 } } });
    workflow = await saveWorkflow({ organizationId: organization.id, actorId: "phase19-qa", id: workflow.id, name: workflow.name, description: "version two", definition: waitDefinition });
    assert.equal(workflow.status, "PUBLISHED", "the previous published version remains live while a draft is being reviewed");
    const v1After = await prisma.workflowVersion.findUniqueOrThrow({ where: { workflowId_version: { workflowId: workflow.id, version: 1 } } });
    assert.equal(v1After.checksum, v1.checksum, "published version checksum must be immutable");
    assert.equal(v1After.status, "PUBLISHED");
    await publishWorkflow(organization.id, workflow.id);
    const waitEvent = await EventBus.publish({ organizationId: organization.id, eventType: "MANUAL_TRIGGERED", source: "TEST", objectType: "WORKFLOW", objectId: workflow.id, idempotencyKey: `wait:${nonce}` });
    assert.ok(waitEvent);
    const repeated = await EventBus.publish({ organizationId: organization.id, eventType: "MANUAL_TRIGGERED", source: "TEST", objectType: "WORKFLOW", objectId: workflow.id, idempotencyKey: `wait:${nonce}`, metadata: { changed: true } });
    assert.equal(repeated?.id, waitEvent.id, "event idempotency must return original event");
    const cleanBeforeOtherTenant = await prisma.workflowEvent.findUniqueOrThrow({ where: { id: waitEvent!.id } });
    await processWorkflowQueue(`other-org-${nonce}`, 10);
    assert.equal((await prisma.workflowEvent.findUniqueOrThrow({ where: { id: waitEvent!.id } })).status, cleanBeforeOtherTenant.status, "another tenant worker must not consume this event");

    const approvalWorkflow = await saveWorkflow({ organizationId: organization.id, actorId: "phase19-qa", name: `Approval ${nonce}`, definition: { trigger: { type: "MANUAL" }, conditions: { operator: "AND", rules: [] }, steps: [{ type: "REQUIRE_APPROVAL", label: "QA review", timeoutHours: 24 }] } });
    await publishWorkflow(organization.id, approvalWorkflow.id);
    const approvalEvent = await EventBus.publish({ organizationId: organization.id, eventType: "MANUAL_TRIGGERED", source: "TEST", objectType: "WORKFLOW", objectId: approvalWorkflow.id, idempotencyKey: `approval:${nonce}` });
    assert.ok(approvalEvent);
    const processed = await processWorkflowQueue(organization.id, 10);
    assert.ok(processed.runsCreated >= 2);
    const waitRun = await prisma.workflowRun.findFirstOrThrow({ where: { workflowId: workflow.id, eventId: waitEvent!.id } });
    assert.equal(waitRun.status, "WAITING");
    const approvalRun = await prisma.workflowRun.findFirstOrThrow({ where: { workflowId: approvalWorkflow.id, eventId: approvalEvent!.id } });
    assert.equal(approvalRun.status, "WAITING");
    const approval = await prisma.workflowApproval.findFirstOrThrow({ where: { runId: approvalRun.id } });
    const decision = await decideWorkflowApproval({ organizationId: organization.id, approvalId: approval.id, actorId: "phase19-qa-approver", decision: "APPROVE" });
    assert.equal(decision.status, "APPROVED");
    await prisma.workflowRun.update({ where: { id: waitRun.id }, data: { nextRunAt: new Date(Date.now() - 1000) } });
    await processWorkflowQueue(organization.id, 10);
    assert.equal((await prisma.workflowRun.findUniqueOrThrow({ where: { id: waitRun.id } })).status, "COMPLETED", "wait must resume after restart/worker tick");
    assert.equal((await prisma.workflowRun.findUniqueOrThrow({ where: { id: approvalRun.id } })).status, "COMPLETED", "approved workflow should resume");

    const sanitized = await EventBus.publish({ organizationId: organization.id, eventType: "LESSON_COMPLETED", source: "TEST", idempotencyKey: `privacy:${nonce}`, metadata: { courseId: "c1", email: "private@example.test", password: "never", count: 2 } });
    const savedMetadata = JSON.parse(sanitized!.metadataJson);
    assert.deepEqual(savedMetadata, { courseId: "c1", count: 2 }, "event payload must omit sensitive keys");
    await assert.rejects(() => EventBus.publish({ organizationId: organization.id, eventType: "LESSON_COMPLETED", source: "WORKFLOW_ACTION", idempotencyKey: `loop:${nonce}` }), /recursively re-enter/i);

    console.log("✓ trigger definition and allow-list validation");
    console.log("✓ condition groups AND/OR and safe operators");
    console.log("✓ SSRF link rejection and arbitrary-code rejection");
    console.log("✓ dry-run has no side effects");
    console.log("✓ immutable workflow versions and checksums");
    console.log("✓ durable event queue, deduplication, and cross-tenant isolation");
    console.log("✓ WAIT pause/resume and human approval resume");
    console.log("✓ metadata secret filtering and recursive-event protection");
  } finally {
    const workflowRows = await prisma.workflow.findMany({ where: { organizationId: organization.id }, select: { id: true } });
    const workflowIds = workflowRows.map((row) => row.id);
    const runRows = await prisma.workflowRun.findMany({ where: { organizationId: organization.id }, select: { id: true } });
    const runIds = runRows.map((row) => row.id);
    if (runIds.length) await prisma.workflowRun.deleteMany({ where: { id: { in: runIds } } });
    await prisma.workflowIdempotencyRecord.deleteMany({ where: { organizationId: organization.id } });
    await prisma.workflowEvent.deleteMany({ where: { organizationId: organization.id } });
    if (workflowIds.length) {
      await prisma.workflowVersion.deleteMany({ where: { workflowId: { in: workflowIds } } });
      await prisma.workflow.deleteMany({ where: { id: { in: workflowIds } } });
    }
    await prisma.organization.delete({ where: { id: organization.id } });
  }
  await prisma.$disconnect();
}

main().catch(async (error) => { console.error(error); await prisma.$disconnect(); process.exit(1); });
