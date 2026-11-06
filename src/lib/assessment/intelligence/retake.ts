import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api";

export async function assertRetakeAllowed(assessmentId: string, studentId: string) {
  const policy = await prisma.assessmentRetakePolicy.findUnique({ where: { assessmentId } });
  if (!policy) return;
  const attempts = await prisma.assessmentAttempt.findMany({
    where: { assessmentId, studentId, status: { not: "IN_PROGRESS" } },
    orderBy: { startedAt: "desc" },
    select: { startedAt: true },
  });
  const used = attempts.length;
  if (policy.mode === "NONE" && used >= 1) throw new ApiError(422, "This assessment does not allow a retake.");
  if (policy.mode === "ONE" && used >= 2) throw new ApiError(422, "The retake for this assessment has already been used.");
  if (policy.mode === "TWO" && used >= 3) throw new ApiError(422, "The retake limit for this assessment has been reached.");
  if ((policy.mode === "WAIT" || policy.mode === "REMEDIAL") && policy.waitDays && attempts[0]) {
    const readyAt = attempts[0].startedAt.getTime() + policy.waitDays * 86400000;
    if (Date.now() < readyAt) throw new ApiError(422, "The waiting period for a retake has not ended.");
  }
}

export async function officialAttempt(assessmentId: string, studentId: string) {
  const policy = await prisma.assessmentRetakePolicy.findUnique({ where: { assessmentId } });
  const attempts = await prisma.assessmentAttempt.findMany({
    where: { assessmentId, studentId, status: { in: ["GRADED", "EXPIRED", "SUBMITTED"] } },
    orderBy: { attemptNumber: "asc" },
  });
  if (attempts.length === 0) return null;
  const countsAs = policy?.countsAs ?? "LATEST";
  if (countsAs === "HIGHEST") return [...attempts].sort((a, b) => (b.percentage ?? -1) - (a.percentage ?? -1))[0];
  if (countsAs === "TEACHER_APPROVED") {
    const correction = await prisma.assessmentCorrection.findFirst({
      where: { attemptId: { in: attempts.map((attempt) => attempt.id) } },
      orderBy: { createdAt: "desc" },
    });
    return attempts.find((attempt) => attempt.id === correction?.attemptId) ?? attempts[attempts.length - 1];
  }
  return attempts[attempts.length - 1];
}
