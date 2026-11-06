import { prisma } from "@/lib/prisma";
import { ApiError, apiRoute, assertSameOrigin, jsonOk, parseJsonBody, requireApiUser } from "@/lib/api";
import { audit, clientIp } from "@/lib/audit";
import { finalizeOpenAttempts } from "@/lib/assessment/engine";
import { isAssessmentType } from "@/lib/assessment/registry";
import { assessmentInput } from "@/lib/assessment/schemas";
import { assertAssessmentAccess } from "@/lib/assessment/access";

interface Ctx {
  params: { id: string };
}

/**
 * GET /api/assessments/[id] — full assessment for the BUILDER (staff only).
 * Includes per-question points/order and the question bank payloads — this is
 * a staff-only endpoint; student payloads are separate and sanitized.
 * Phase 32: enforces group/course and tenant scope
 */
export const GET = apiRoute<Ctx>(async (_req, ctx) => {
  const user = await requireApiUser(["TEACHER", "ADMIN"]);
  await assertAssessmentAccess(user, ctx.params.id);
  const assessment = await prisma.assessment.findUnique({
    where: { id: ctx.params.id },
    include: {
      course: { select: { id: true, title: true } },
      level: { select: { id: true, code: true } },
      module: { select: { id: true, title: true } },
      questions: {
        orderBy: { order: "asc" },
        include: {
          question: {
            include: {
              options: { select: { id: true, text: true, isCorrect: true, order: true }, orderBy: { order: "asc" } },
              lesson: { select: { title: true } },
            },
          },
        },
      },
      _count: { select: { attempts: true } },
    },
  });
  if (!assessment) throw new ApiError(404, "Assessment not found.");
  return jsonOk(assessment);
});

const updateSchema = assessmentInput.partial();

/** PATCH /api/assessments/[id] — update settings or change status (staff). */
export const PATCH = apiRoute<Ctx>(async (req, ctx) => {
  const user = await requireApiUser(["TEACHER", "ADMIN"]);
  assertSameOrigin(req);
  await assertAssessmentAccess(user, ctx.params.id);
  const existing = await prisma.assessment.findUnique({ where: { id: ctx.params.id } });
  if (!existing) throw new ApiError(404, "Assessment not found.");

  const payload = updateSchema.parse(await parseJsonBody(req));
  if (payload.type !== undefined && !isAssessmentType(payload.type)) {
    throw new ApiError(422, "Assessment type must be QUIZ or EXAM.");
  }

  if (payload.status === "OPEN" || payload.status === "SCHEDULED") {
    const count = await prisma.assessmentQuestion.count({ where: { assessmentId: existing.id } });
    if (count === 0) throw new ApiError(422, "Add at least one question before opening this assessment.");
  }
  if (payload.startAt && payload.endAt && new Date(payload.startAt) >= new Date(payload.endAt)) {
    throw new ApiError(422, "The end date must be after the start date.");
  }

  const data: any = { ...payload };
  if (payload.startAt !== undefined) data.startAt = payload.startAt ? new Date(payload.startAt) : null;
  if (payload.endAt !== undefined) data.endAt = payload.endAt ? new Date(payload.endAt) : null;
  delete data.courseId;
  delete data.levelId;
  delete data.moduleId;
  if (payload.courseId !== undefined) data.courseId = payload.courseId || null;
  if (payload.levelId !== undefined) data.levelId = payload.levelId || null;
  if (payload.moduleId !== undefined) data.moduleId = payload.moduleId || null;

  await prisma.assessment.update({ where: { id: existing.id }, data });

  let finalized = 0;
  if (
    (payload.status === "CLOSED" || payload.status === "ARCHIVED") &&
    payload.status !== existing.status
  ) {
    finalized = await finalizeOpenAttempts(existing.id);
  }

  await audit({
    actorId: user.id,
    action: payload.status && payload.status !== existing.status ? "ASSESSMENT_STATUS_CHANGED" : "ASSESSMENT_UPDATED",
    entityType: "ASSESSMENT",
    entityId: existing.id,
    metadata: { status: payload.status ?? existing.status, finalizedAttempts: finalized },
    ipAddress: clientIp(req),
  });
  return jsonOk({ ok: true });
});
