import { prisma } from "@/lib/prisma";
import { buildLearningContext } from "./context";

/** Recommendations only when stored progress or practice misses support them. */
export async function refreshRecommendations(studentId: string) {
  const context = await buildLearningContext(studentId);
  if (context.recommendation) {
    const reason = context.mistakes[0]
      ? `${context.mistakes[0].count} recent practice misses on ${context.mistakes[0].topic}.`
      : "The current lesson is not completed yet.";
    const existing = await prisma.aiRecommendation.findFirst({
      where: { studentId, suggestion: context.recommendation, dismissedAt: null },
    });
    if (!existing) {
      await prisma.aiRecommendation.create({
        data: {
          studentId,
          reason,
          suggestion: context.recommendation,
          lessonId: context.mistakes[0]?.lessonId ?? context.lessonId,
          source: context.mistakes[0] ? "PRACTICE" : "PROGRESS",
        },
      });
    }
  }
  return prisma.aiRecommendation.findMany({
    where: { studentId, dismissedAt: null },
    orderBy: { createdAt: "desc" },
    take: 3,
  });
}
