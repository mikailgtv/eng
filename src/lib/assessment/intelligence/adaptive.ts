import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api";

const RANK = { EASY: 1, MEDIUM: 2, HARD: 3 } as const;

/**
 * Chooses the next approved question inside the assessment pool.
 * The reason is stored. This is not a precise ability score.
 */
export async function nextAdaptiveQuestion(studentId: string, assessmentId: string, previous?: { questionId: string; correct: boolean }) {
  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId },
    include: { questions: { include: { question: { select: { id: true, difficulty: true, status: true, skill: true } } } } },
  });
  if (!assessment || assessment.type !== "DIAGNOSTIC") throw new ApiError(404, "Adaptive diagnostic not found.");
  const pool = assessment.questions.map((link) => link.question).filter((question) => question.status === "PUBLISHED");
  if (pool.length === 0) throw new ApiError(422, "This diagnostic has no published questions.");
  let session = await prisma.adaptiveAssessmentSession.findFirst({
    where: { studentId, assessmentId, status: "IN_PROGRESS" },
    include: { events: true },
  });
  if (!session) {
    session = await prisma.adaptiveAssessmentSession.create({
      data: { studentId, assessmentId, config: JSON.stringify({ boundary: "approved-pool-only", claim: "not-a-precise-ability-score" }) },
      include: { events: true },
    });
  }
  const used = new Set(session.events.map((event) => event.questionId));
  let reason = "First question is a medium item from the approved pool.";
  let target: "EASY" | "MEDIUM" | "HARD" = "MEDIUM";
  if (previous) {
    target = previous.correct ? "HARD" : "EASY";
    reason = previous.correct
      ? "The previous answer was correct, so the next question is a harder item from the same approved pool."
      : "The previous answer was not correct, so the next question is an easier item from the same approved pool.";
    await prisma.adaptiveAssessmentEvent.create({
      data: { sessionId: session.id, questionId: previous.questionId, reason: "Previous answer recorded.", correct: previous.correct },
    });
    used.add(previous.questionId);
  }
  const remaining = pool.filter((question) => !used.has(question.id));
  const choice = remaining.find((question) => question.difficulty === target)
    ?? remaining.sort((a, b) => Math.abs(RANK[a.difficulty as keyof typeof RANK] - RANK[target]) - Math.abs(RANK[b.difficulty as keyof typeof RANK] - RANK[target]))[0];
  if (!choice) {
    await prisma.adaptiveAssessmentSession.update({ where: { id: session.id }, data: { status: "COMPLETED" } });
    return { done: true, message: "The approved pool has no further questions. This is not a precise ability score." };
  }
  await prisma.adaptiveAssessmentEvent.create({
    data: { sessionId: session.id, questionId: choice.id, reason },
  });
  return {
    done: false,
    sessionId: session.id,
    questionId: choice.id,
    reason,
    note: "Selection stayed inside the approved pool. This is not a precise ability score.",
  };
}
