import { prisma } from "@/lib/prisma";

export type FrozenQuestion = {
  questionId: string;
  version: number;
  type: string;
  questionText: string;
  explanation: string | null;
  skill: string | null;
  configuration: unknown;
  options: { id: string; text: string; isCorrect: boolean; order: number }[];
};

export async function freezeAttempt(attemptId: string) {
  const existing = await prisma.assessmentAttemptSnapshot.findUnique({ where: { attemptId } });
  if (existing) return existing;
  const attempt = await prisma.assessmentAttempt.findUnique({
    where: { id: attemptId },
    include: { assessment: true },
  });
  if (!attempt) return null;
  const order = JSON.parse(attempt.questionOrder) as { questionId: string; points: number; optionOrder: string[] | null }[];
  const questions = await prisma.question.findMany({
    where: { id: { in: order.map((item) => item.questionId) } },
    include: { options: true, versions: { orderBy: { version: "desc" }, take: 1 } },
  });
  const byId = new Map(questions.map((question) => [question.id, question]));
  const frozen: FrozenQuestion[] = [];
  for (const entry of order) {
    const question = byId.get(entry.questionId);
    if (!question) continue;
    const version = question.versions[0]?.version ?? 1;
    if (question.versions.length === 0) {
      await prisma.questionVersion.create({
        data: {
          questionId: question.id,
          version: 1,
          snapshot: JSON.stringify({ questionText: question.questionText, configuration: question.configuration }),
        },
      });
    }
    frozen.push({
      questionId: question.id,
      version,
      type: question.type,
      questionText: question.questionText,
      explanation: question.explanation,
      skill: question.skill,
      configuration: safe(question.configuration),
      options: question.options.map((option) => ({ id: option.id, text: option.text, isCorrect: option.isCorrect, order: option.order })),
    });
  }
  const policy = await prisma.assessmentRetakePolicy.findUnique({ where: { assessmentId: attempt.assessmentId } });
  return prisma.assessmentAttemptSnapshot.create({
    data: {
      attemptId,
      assessmentVersion: attempt.assessment.updatedAt.toISOString(),
      questionVersions: JSON.stringify(frozen),
      questionOrder: attempt.questionOrder,
      timeConfig: JSON.stringify({
        durationMinutes: attempt.assessment.durationMinutes,
        deadlineAt: attempt.deadlineAt?.toISOString() ?? null,
        accommodationApplied: false,
      }),
      scoringConfig: JSON.stringify({
        passingScore: attempt.assessment.passingScore,
        method: "points-at-start",
      }),
      attemptPolicy: JSON.stringify(policy ?? { maxAttempts: attempt.assessment.maxAttempts, countsAs: "LATEST" }),
    },
  });
}

export async function readFrozen(attemptId: string): Promise<{ questions: FrozenQuestion[]; scoring: { passingScore?: number } } | null> {
  const row = await prisma.assessmentAttemptSnapshot.findUnique({ where: { attemptId } });
  if (!row) return null;
  return {
    questions: JSON.parse(row.questionVersions) as FrozenQuestion[],
    scoring: JSON.parse(row.scoringConfig) as { passingScore?: number },
  };
}

export async function recordQuestionVersion(questionId: string) {
  const question = await prisma.question.findUnique({ where: { id: questionId }, include: { options: true, versions: { orderBy: { version: "desc" }, take: 1 } } });
  if (!question) return;
  const next = (question.versions[0]?.version ?? 0) + 1;
  await prisma.questionVersion.create({
    data: {
      questionId,
      version: next,
      snapshot: JSON.stringify({
        questionText: question.questionText,
        configuration: question.configuration,
        options: question.options.map((option) => ({ id: option.id, text: option.text, isCorrect: option.isCorrect })),
      }),
    },
  });
  await prisma.questionBankMeta.upsert({
    where: { questionId },
    update: { version: next },
    create: { questionId, version: next, reviewState: question.status === "PUBLISHED" ? "PUBLISHED" : "DRAFT" },
  });
}

function safe(value: string) {
  try { return JSON.parse(value); } catch { return {}; }
}
