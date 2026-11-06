import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ApiError, apiRoute, assertSameOrigin, jsonOk, parseJsonBody, requireApiUser } from "@/lib/api";
import { audit, clientIp } from "@/lib/audit";
import { assertAssessmentAccess } from "@/lib/assessment/access";

interface Ctx {
  params: { id: string };
}

const questionsSchema = z
  .object({
    questions: z
      .array(
        z.object({
          questionId: z.string().trim().min(1),
          points: z.number().int().min(1).max(100),
        })
      )
      .min(0)
      .max(100),
  })
  .strict();

/**
 * PUT /api/assessments/[id]/questions — replace the assessment's question
 * list (order + per-assessment points) in one transaction. Explicit
 * selection only; random pools are a future feature.
 * Phase 32: enforces group/course and tenant scope
 */
export const PUT = apiRoute<Ctx>(async (req, ctx) => {
  const user = await requireApiUser(["TEACHER", "ADMIN"]);
  assertSameOrigin(req);
  await assertAssessmentAccess(user, ctx.params.id);
  const existing = await prisma.assessment.findUnique({ where: { id: ctx.params.id } });
  if (!existing) throw new ApiError(404, "Assessment not found.");

  const body = questionsSchema.parse(await parseJsonBody(req));
  const ids = body.questions.map((q) => q.questionId);
  const usable = await prisma.question.findMany({
    where: { id: { in: ids }, status: "PUBLISHED" },
    select: { id: true },
  });
  const usableIds = new Set(usable.map((q) => q.id));
  const missing = ids.filter((id) => !usableIds.has(id));
  if (missing.length > 0) throw new ApiError(422, "Some selected questions are not published.");

  await prisma.$transaction(async (tx) => {
    await tx.assessmentQuestion.deleteMany({ where: { assessmentId: existing.id } });
    if (body.questions.length > 0) {
      await tx.assessmentQuestion.createMany({
        data: body.questions.map((q, i) => ({
          assessmentId: existing.id,
          questionId: q.questionId,
          points: q.points,
          order: i + 1,
        })),
      });
    }
  });
  await audit({
    actorId: user.id,
    action: "ASSESSMENT_QUESTIONS_UPDATED",
    entityType: "ASSESSMENT",
    entityId: existing.id,
    metadata: { count: body.questions.length },
    ipAddress: clientIp(req),
  });
  return jsonOk({ ok: true });
});
