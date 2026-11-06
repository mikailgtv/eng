import { prisma } from "@/lib/prisma";

export async function buildAssessmentReport(actorId: string, filters: { from?: string; to?: string; type?: string; groupId?: string }) {
  const from = filters.from ? new Date(filters.from) : null;
  const to = filters.to ? new Date(filters.to) : null;
  const attempts = await prisma.assessmentAttempt.findMany({
    where: {
      status: { in: ["GRADED", "EXPIRED", "SUBMITTED"] },
      ...(from || to ? { submittedAt: { gte: from ?? undefined, lte: to ?? undefined } } : {}),
      assessment: filters.type ? { type: filters.type } : undefined,
      student: filters.groupId ? { groupId: filters.groupId } : undefined,
    },
    include: { assessment: { select: { type: true, title: true } } },
    take: 1000,
  });
  const byType = new Map<string, { count: number; passed: number }>();
  for (const attempt of attempts) {
    const row = byType.get(attempt.assessment.type) ?? { count: 0, passed: 0 };
    row.count += 1;
    if (attempt.passed) row.passed += 1;
    byType.set(attempt.assessment.type, row);
  }
  const result = {
    source: "assessment_attempts",
    method: "Count of stored finished attempts. Pass count uses the stored passed flag. No ranking is calculated.",
    sampleSize: attempts.length,
    period: { from: filters.from ?? null, to: filters.to ?? null },
    filters,
    byType: [...byType.entries()].map(([type, row]) => ({ type, ...row })),
    generatedAt: new Date().toISOString(),
  };
  const snapshot = await prisma.assessmentReportSnapshot.create({
    data: {
      title: "Assessment activity",
      filters: JSON.stringify(filters),
      method: result.method,
      sampleSize: attempts.length,
      periodStart: from,
      periodEnd: to,
      result: JSON.stringify(result),
      createdById: actorId,
    },
  });
  return { id: snapshot.id, ...result };
}
