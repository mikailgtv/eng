import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api";
import { MIN_ITEM_SAMPLE, MIN_RELIABLE_SAMPLE } from "@/lib/assessment/registry";

type Row = { correct: boolean | null; omitted: boolean; seconds: number | null; optionId: string | null; totalPercent: number | null };

export async function analyzeQuestion(questionId: string) {
  const question = await prisma.question.findUnique({ where: { id: questionId }, include: { options: { orderBy: { order: "asc" } } } });
  if (!question) throw new ApiError(404, "Question not found.");
  const answers = await prisma.assessmentAnswer.findMany({
    where: { questionId, attempt: { status: { in: ["GRADED", "EXPIRED", "SUBMITTED"] } } },
    include: { attempt: { select: { startedAt: true, percentage: true, assessment: { select: { id: true, title: true, type: true } } } } },
    take: 2000,
  });
  const rows: Row[] = answers.map((answer) => {
    const parsed = answer.answer ? safe(answer.answer) : null;
    const seconds = answer.answeredAt && answer.attempt.startedAt
      ? Math.max(0, Math.round((answer.answeredAt.getTime() - answer.attempt.startedAt.getTime()) / 1000))
      : null;
    return {
      correct: answer.isCorrect,
      omitted: answer.answer === null,
      seconds,
      optionId: typeof parsed?.optionId === "string" ? parsed.optionId : null,
      totalPercent: answer.attempt.percentage,
    };
  });
  const sampleSize = rows.length;
  const descriptive = sampleSize >= MIN_ITEM_SAMPLE;
  const reliable = sampleSize >= MIN_RELIABLE_SAMPLE;
  const answered = rows.filter((row) => row.correct !== null);
  const correctRate = answered.length ? answered.filter((row) => row.correct).length / answered.length : null;
  const omissionRate = sampleSize ? rows.filter((row) => row.omitted).length / sampleSize : null;
  const times = rows.map((row) => row.seconds).filter((value): value is number => value !== null);
  const avgResponseSec = times.length ? times.reduce((sum, value) => sum + value, 0) / times.length : null;
  const pointBiserial = reliable ? correlation(rows) : null;
  const discrimination = reliable ? pointBiserial : null;
  const note = reliable
    ? "These indicators describe this sample. They are not a final judgment of the question."
    : "Insufficient data for reliable analysis.";
  const stat = await prisma.assessmentItemStatistic.create({
    data: {
      questionId,
      sampleSize,
      correctRate: descriptive ? correctRate : null,
      omissionRate: descriptive ? omissionRate : null,
      avgResponseSec: descriptive ? avgResponseSec : null,
      discrimination,
      pointBiserial,
      sufficient: reliable,
      note,
    },
  });
  const distractors = question.options.map((option) => {
    const selected = rows.filter((row) => row.optionId === option.id).length;
    return {
      optionId: option.id,
      optionText: option.text,
      selectedCount: selected,
      sampleSize,
      percent: sampleSize ? Math.round((selected / sampleSize) * 1000) / 10 : 0,
      isCorrect: option.isCorrect,
    };
  });
  if (sampleSize) {
    await prisma.assessmentDistractorStatistic.createMany({
      data: distractors.map((item) => ({
        questionId,
        optionId: item.optionId,
        optionText: item.optionText,
        selectedCount: item.selectedCount,
        sampleSize,
        percent: item.percent,
      })),
    });
  }
  const contexts = [...new Map(answers.map((answer) => [answer.attempt.assessment.id, answer.attempt.assessment])).values()];
  return {
    questionId,
    sampleSize,
    sufficient: reliable,
    descriptive: descriptive,
    note,
    correctRate: descriptive && correctRate !== null ? Math.round(correctRate * 1000) / 10 : null,
    omissionRate: descriptive && omissionRate !== null ? Math.round(omissionRate * 1000) / 10 : null,
    avgResponseSec: descriptive && avgResponseSec !== null ? Math.round(avgResponseSec) : null,
    discrimination,
    pointBiserial,
    usageCount: sampleSize,
    contexts,
    distractors: distractors.map((item) => ({
      ...item,
      insight: sampleSize < MIN_ITEM_SAMPLE
        ? "Insufficient data for reliable analysis."
        : `Option was selected by ${item.percent}% of attempts.`,
    })),
    calculatedAt: stat.calculatedAt,
    decision: "A teacher decides whether revision is required. This report does not retire the question.",
  };
}

function correlation(rows: Row[]) {
  const usable = rows.filter((row) => row.correct !== null && row.totalPercent !== null);
  const ones = usable.filter((row) => row.correct);
  const zeros = usable.filter((row) => !row.correct);
  if (ones.length === 0 || zeros.length === 0) return null;
  const mean = (items: Row[]) => items.reduce((sum, row) => sum + (row.totalPercent ?? 0), 0) / items.length;
  const allMean = mean(usable);
  const variance = usable.reduce((sum, row) => sum + ((row.totalPercent ?? 0) - allMean) ** 2, 0) / usable.length;
  const sd = Math.sqrt(variance);
  if (sd === 0) return null;
  const p = ones.length / usable.length;
  const value = ((mean(ones) - mean(zeros)) / sd) * Math.sqrt(p * (1 - p));
  return Math.round(value * 1000) / 1000;
}

function safe(value: string): { optionId?: string } {
  try { return JSON.parse(value) as { optionId?: string }; } catch { return {}; }
}
