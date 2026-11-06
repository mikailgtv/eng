import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api";
import { audit } from "@/lib/audit";
import { teacherGroupIds } from "./access";

export async function enqueueManualReviews(attemptId: string) {
  const attempt = await prisma.assessmentAttempt.findUnique({
    where: { id: attemptId },
    include: { answers: true },
  });
  if (!attempt) return;
  const questions = await prisma.question.findMany({
    where: { id: { in: attempt.answers.map((answer) => answer.questionId) }, type: { in: ["WRITING", "SPEAKING"] } },
    select: { id: true, type: true },
  });
  for (const question of questions) {
    const answer = attempt.answers.find((item) => item.questionId === question.id);
    const text = answer?.answer ? readText(answer.answer) : "";
    if (question.type === "WRITING") {
      await prisma.writingSubmission.upsert({
        where: { attemptId_questionId: { attemptId, questionId: question.id } },
        create: { attemptId, questionId: question.id, studentId: attempt.studentId, text, wordCount: countWords(text) },
        update: { text, wordCount: countWords(text) },
      });
    }
    if (question.type === "SPEAKING") {
      await prisma.assessmentSpeakingSubmission.upsert({
        where: { attemptId_questionId: { attemptId, questionId: question.id } },
        create: { attemptId, questionId: question.id, studentId: attempt.studentId, transcript: text || null },
        update: { transcript: text || null },
      });
    }
    const existing = await prisma.assessmentReviewItem.findFirst({ where: { attemptId, questionId: question.id } });
    if (!existing) {
      await prisma.assessmentReviewItem.create({
        data: { attemptId, questionId: question.id, kind: question.type, status: "SUBMITTED" },
      });
    }
  }
}

export async function listReviewQueue(actor: { id: string; role: string }) {
  const groups = await teacherGroupIds(actor.id);
  const items = await prisma.assessmentReviewItem.findMany({
    where: { status: { not: "FINALIZED" } },
    orderBy: { createdAt: "asc" },
    take: 50,
  });
  const attempts = await prisma.assessmentAttempt.findMany({
    where: { id: { in: items.map((item) => item.attemptId) } },
    include: { student: { select: { id: true, firstName: true, lastName: true, groupId: true } }, assessment: { select: { title: true, type: true } } },
  });
  const byId = new Map(attempts.map((attempt) => [attempt.id, attempt]));
  return items.filter((item) => {
    const attempt = byId.get(item.attemptId);
    if (!attempt) return false;
    if (groups === null) return true;
    return Boolean(attempt.student.groupId && groups.includes(attempt.student.groupId));
  }).map((item) => {
    const attempt = byId.get(item.attemptId)!;
    return {
      id: item.id,
      status: item.status,
      kind: item.kind,
      attemptId: item.attemptId,
      questionId: item.questionId,
      assessment: attempt.assessment.title,
      student: `${attempt.student.firstName} ${attempt.student.lastName}`,
    };
  });
}

export async function correctOfficialScore(actorId: string, input: { attemptId: string; newScore: number; newPassed: boolean; reason: string }) {
  if (input.reason.trim().length < 8) throw new ApiError(422, "Enter a reason for the correction.");
  const attempt = await prisma.assessmentAttempt.findUnique({ where: { id: input.attemptId } });
  if (!attempt || attempt.score === null) throw new ApiError(404, "Finished attempt not found.");
  if (attempt.status === "IN_PROGRESS") throw new ApiError(409, "Submit the attempt before correcting it.");
  const previousScore = attempt.score;
  const previousPassed = attempt.passed;
  await prisma.assessmentCorrection.create({
    data: {
      attemptId: attempt.id,
      previousScore,
      newScore: input.newScore,
      previousPassed,
      newPassed: input.newPassed,
      reason: input.reason.trim(),
      actorId,
    },
  });
  await prisma.assessmentAttempt.update({
    where: { id: attempt.id },
    data: { score: input.newScore, passed: input.newPassed },
  });
  await audit({
    actorId,
    action: "ASSESSMENT_SCORE_CORRECTED",
    entityType: "ASSESSMENT",
    entityId: attempt.id,
    metadata: { previousScore, newScore: input.newScore, reason: input.reason.trim() },
  });
  return { previousScore, newScore: input.newScore };
}

function readText(value: string) {
  try {
    const parsed = JSON.parse(value) as { text?: string };
    return parsed.text ?? "";
  } catch {
    return "";
  }
}

function countWords(text: string) {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}
