import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api";

export type RubricCriterion = { name: string; weight: number; levels: { score: number; description: string }[] };

export function validateCriteria(criteria: RubricCriterion[]) {
  if (criteria.length < 1 || criteria.length > 8) throw new ApiError(422, "A rubric needs between 1 and 8 criteria.");
  const weight = criteria.reduce((sum, item) => sum + item.weight, 0);
  if (Math.round(weight) !== 100) throw new ApiError(422, "Rubric weights must add up to 100.");
  for (const item of criteria) {
    if (item.levels.length < 2) throw new ApiError(422, "Each criterion needs at least two levels.");
  }
  return criteria;
}

export async function createRubric(actorId: string, input: { title: string; kind: string; courseId?: string | null; criteria: RubricCriterion[] }) {
  const criteria = validateCriteria(input.criteria);
  return prisma.rubric.create({
    data: {
      title: input.title,
      kind: input.kind,
      courseId: input.courseId || null,
      createdById: actorId,
      versions: { create: { version: 1, criteria: JSON.stringify(criteria), immutable: false } },
    },
    include: { versions: true },
  });
}

export async function scoreWithRubric(input: {
  attemptId: string;
  questionId?: string;
  rubricVersionId: string;
  reviewerId: string;
  selections: { name: string; score: number }[];
  feedback?: string;
  finalize: boolean;
}) {
  const version = await prisma.rubricVersion.findUnique({ where: { id: input.rubricVersionId } });
  if (!version) throw new ApiError(404, "Rubric version not found.");
  const existing = await prisma.assessmentRubricScore.findUnique({
    where: { attemptId_questionId: { attemptId: input.attemptId, questionId: input.questionId ?? "" } },
  });
  if (existing?.status === "FINALIZED") throw new ApiError(409, "This score is finalized. Use the correction workflow to change it.");
  const criteria = JSON.parse(version.criteria) as RubricCriterion[];
  let weighted = 0;
  let max = 0;
  for (const criterion of criteria) {
    const selected = input.selections.find((item) => item.name === criterion.name);
    if (!selected) throw new ApiError(422, `Choose a level for ${criterion.name}.`);
    const level = criterion.levels.find((item) => item.score === selected.score);
    if (!level) throw new ApiError(422, `The selected level for ${criterion.name} is not in this rubric version.`);
    const top = Math.max(...criterion.levels.map((item) => item.score));
    weighted += (selected.score / top) * criterion.weight;
    max += criterion.weight;
  }
  const total = Math.round(weighted * 10) / 10;
  const saved = await prisma.assessmentRubricScore.upsert({
    where: { attemptId_questionId: { attemptId: input.attemptId, questionId: input.questionId ?? "" } },
    create: {
      attemptId: input.attemptId,
      questionId: input.questionId ?? "",
      rubricVersionId: version.id,
      reviewerId: input.reviewerId,
      scores: JSON.stringify(input.selections),
      total,
      maxScore: max,
      feedback: input.feedback ?? null,
      status: input.finalize ? "FINALIZED" : "REVIEWED",
      finalizedAt: input.finalize ? new Date() : null,
    },
    update: {
      scores: JSON.stringify(input.selections),
      total,
      feedback: input.feedback ?? null,
      status: input.finalize ? "FINALIZED" : "REVIEWED",
      finalizedAt: input.finalize ? new Date() : null,
      reviewerId: input.reviewerId,
    },
  });
  if (input.finalize) {
    await prisma.rubricVersion.update({ where: { id: version.id }, data: { immutable: true } });
    await prisma.assessmentReviewItem.updateMany({
      where: { attemptId: input.attemptId, questionId: input.questionId ?? undefined, status: { not: "FINALIZED" } },
      data: { status: "FINALIZED", reviewerId: input.reviewerId },
    });
  }
  return saved;
}
