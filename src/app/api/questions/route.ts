import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ApiError, apiRoute, assertSameOrigin, jsonOk, parseJsonBody, requireApiUser } from "@/lib/api";
import { audit, clientIp } from "@/lib/audit";
import { isQuestionType, OPTION_TYPES, QUESTION_STATUSES } from "@/lib/assessment/registry";
import {
  trueFalseConfig,
  fillBlankConfig,
  matchingConfig,
  wordOrderConfig,
  listeningConfig,
  manualConfig,
} from "@/lib/assessment/schemas";
import { questionPayloadSchema, validateOptions } from "@/lib/assessment/authoring";

/**
 * GET /api/questions — question-bank search for STAFF with filters and
 * pagination (the builder never loads the whole bank at once).
 * Includes correct answers — STAFF ONLY, never proxied to students.
 */
export const GET = apiRoute(async (req) => {
  await requireApiUser(["TEACHER", "ADMIN"]);
  const sp = new URL(req.url).searchParams;
  const page = Math.max(1, Number(sp.get("page") ?? "1") || 1);
  const pageSize = Math.min(50, Math.max(5, Number(sp.get("pageSize") ?? "20") || 20));

  const where: any = {};
  const status = sp.get("status");
  where.status = status && (QUESTION_STATUSES as readonly string[]).includes(status) ? status : { not: "ARCHIVED" };
  if (sp.get("type")) where.type = sp.get("type");
  if (sp.get("skill")) where.skill = sp.get("skill");
  if (sp.get("difficulty")) where.difficulty = sp.get("difficulty");
  if (sp.get("levelId")) where.levelId = sp.get("levelId");
  if (sp.get("lessonId")) where.lessonId = sp.get("lessonId");
  if (sp.get("q")) where.questionText = { contains: sp.get("q")! };

  const [rows, total] = await Promise.all([
    prisma.question.findMany({
      where,
      include: {
        options: { select: { id: true, text: true, isCorrect: true, order: true }, orderBy: { order: "asc" } },
        lesson: { select: { title: true } },
        level: { select: { code: true } },
      },
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.question.count({ where }),
  ]);

  return jsonOk({
    questions: rows.map((q) => ({
      id: q.id,
      type: q.type,
      questionText: q.questionText,
      explanation: q.explanation,
      difficulty: q.difficulty,
      points: q.points,
      skill: q.skill,
      status: q.status,
      lessonTitle: q.lesson?.title ?? null,
      levelCode: q.level?.code ?? null,
      options: q.options,
      configuration: safeParse(q.configuration),
    })),
    total,
    page,
    pageSize,
  });
});

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
      return z.object({}).passthrough();
  }
};

/**
 * POST /api/questions — create a bank question. Configuration is validated
 * with the same schemas used for grading; multiple-choice style questions
 * must carry 2–6 options with exactly one correct answer.
 */
export const POST = apiRoute(async (req) => {
  const user = await requireApiUser(["TEACHER", "ADMIN"]);
  assertSameOrigin(req);

  const payload = questionPayloadSchema.parse(await parseJsonBody(req));
  if (!isQuestionType(payload.type)) throw new ApiError(422, "Unknown question type.");
  validateOptions(payload);

  const configResult = configSchemaFor(payload.type).safeParse(payload.configuration ?? {});
  if (!configResult.success) {
    throw new ApiError(422, "The question content is invalid. Please check the highlighted fields.");
  }

  const question = await prisma.question.create({
    data: {
      type: payload.type,
      questionText: payload.questionText,
      explanation: payload.explanation,
      difficulty: payload.difficulty,
      points: payload.points,
      skill: payload.skill,
      levelId: payload.levelId || null,
      lessonId: payload.lessonId || null,
      moduleId: payload.moduleId || null,
      grammarConceptId: payload.grammarConceptId || null,
      vocabularyId: payload.vocabularyId || null,
      status: payload.status,
      configuration: JSON.stringify(configResult.data),
      createdById: user.id,
      options:
        payload.options && OPTION_TYPES.has(payload.type as any)
          ? {
              create: payload.options.map((o, i) => ({ text: o.text, isCorrect: o.isCorrect, order: i + 1 })),
            }
          : { create: [] },
    },
    select: { id: true },
  });

  await audit({
    actorId: user.id,
    action: "QUESTION_CREATED",
    entityType: "QUESTION",
    entityId: question.id,
    metadata: { type: payload.type },
    ipAddress: clientIp(req),
  });
  return jsonOk({ id: question.id }, 201);
});



function safeParse(v: string): unknown {
  try {
    return JSON.parse(v);
  } catch {
    return null;
  }
}
