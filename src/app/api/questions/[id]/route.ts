import { prisma } from "@/lib/prisma";
import { ApiError, apiRoute, assertSameOrigin, jsonOk, parseJsonBody, requireApiUser } from "@/lib/api";
import { audit, clientIp } from "@/lib/audit";
import { isQuestionType, OPTION_TYPES } from "@/lib/assessment/registry";
import {
  trueFalseConfig,
  fillBlankConfig,
  matchingConfig,
  wordOrderConfig,
  listeningConfig,
  manualConfig,
} from "@/lib/assessment/schemas";
import { questionPayloadSchema, validateOptions } from "@/lib/assessment/authoring";

interface Ctx {
  params: { id: string };
}

const configSchemaFor = (type: string) => {
  switch (type) {
    case "TRUE_FALSE":
      return trueFalseConfig;
    case "FILL_BLANK":
      return fillBlankConfig;
    case "MATCHING":
      return matchingConfig;
    case "WORD_ORDER":
      return wordOrderConfig;
    case "LISTENING":
      return listeningConfig;
    case "READING":
    case "WRITING":
    case "SPEAKING":
      return manualConfig;
    default:
      return undefined;
  }
};

/** PATCH /api/questions/[id] — edit or archive a bank question (staff only). */
export const PATCH = apiRoute<Ctx>(async (req, ctx) => {
  const user = await requireApiUser(["TEACHER", "ADMIN"]);
  assertSameOrigin(req);

  const existing = await prisma.question.findUnique({ where: { id: ctx.params.id } });
  if (!existing) throw new ApiError(404, "Question not found.");

  const payload = questionPayloadSchema.parse(await parseJsonBody(req));
  if (!isQuestionType(payload.type)) throw new ApiError(422, "Unknown question type.");
  validateOptions(payload);

  const data: any = {
    type: payload.type,
    questionText: payload.questionText,
    explanation: payload.explanation ?? null,
    difficulty: payload.difficulty,
    points: payload.points,
    skill: payload.skill ?? null,
    levelId: payload.levelId || null,
    lessonId: payload.lessonId || null,
    moduleId: payload.moduleId || null,
    grammarConceptId: payload.grammarConceptId || null,
    vocabularyId: payload.vocabularyId || null,
    status: payload.status,
  };

  if (payload.configuration !== undefined) {
    const schema = configSchemaFor(payload.type);
    if (schema) {
      const configResult = schema.safeParse(payload.configuration);
      if (!configResult.success) throw new ApiError(422, "The question content is invalid.");
      data.configuration = JSON.stringify(configResult.data);
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.question.update({ where: { id: existing.id }, data });
    if (payload.options && OPTION_TYPES.has(payload.type as any)) {
      await tx.questionOption.deleteMany({ where: { questionId: existing.id } });
      await tx.questionOption.createMany({
        data: payload.options.map((o, i) => ({
          questionId: existing.id,
          text: o.text,
          isCorrect: o.isCorrect,
          order: i + 1,
        })),
      });
    }
  });

  const { recordQuestionVersion } = await import("@/lib/assessment/intelligence/snapshot");
  await recordQuestionVersion(existing.id).catch(() => undefined);

  await audit({
    actorId: user.id,
    action: payload.status === "ARCHIVED" ? "QUESTION_ARCHIVED" : "QUESTION_UPDATED",
    entityType: "QUESTION",
    entityId: existing.id,
    metadata: { type: payload.type, status: payload.status },
    ipAddress: clientIp(req),
  });
  return jsonOk({ ok: true });
});

/**
 * DELETE /api/questions/[id] — soft-archive (users are never destroyed, and
 * question history must stay intact for past attempts).
 */
export const DELETE = apiRoute<Ctx>(async (req, ctx) => {
  const user = await requireApiUser(["TEACHER", "ADMIN"]);
  assertSameOrigin(req);
  const existing = await prisma.question.findUnique({ where: { id: ctx.params.id } });
  if (!existing) throw new ApiError(404, "Question not found.");

  await prisma.question.update({ where: { id: existing.id }, data: { status: "ARCHIVED" } });
  await audit({
    actorId: user.id,
    action: "QUESTION_ARCHIVED",
    entityType: "QUESTION",
    entityId: existing.id,
    metadata: null,
    ipAddress: clientIp(req),
  });
  return jsonOk({ ok: true });
});
