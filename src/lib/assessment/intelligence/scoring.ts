import { prisma } from "@/lib/prisma";

/** Reads the stored official result. Never recomputes from the current question or rule. */
export async function officialResult(attemptId: string) {
  const attempt = await prisma.assessmentAttempt.findUnique({
    where: { id: attemptId },
    include: { assessment: { select: { type: true, passingScore: true } } },
  });
  if (!attempt) return null;
  const snapshot = await prisma.assessmentAttemptSnapshot.findUnique({ where: { attemptId } });
  const scoring = snapshot ? JSON.parse(snapshot.scoringConfig) as { passingScore?: number } : null;
  return {
    attemptId,
    status: attempt.status,
    score: attempt.score,
    totalPoints: attempt.totalPoints,
    percentage: attempt.percentage,
    passed: attempt.passed,
    storedPassingScore: scoring?.passingScore ?? null,
    currentAssessmentPassingScore: attempt.assessment.passingScore,
    type: attempt.assessment.type,
    official: attempt.assessment.type === "EXAM" || attempt.assessment.type === "FINAL",
    recomputed: false,
  };
}
