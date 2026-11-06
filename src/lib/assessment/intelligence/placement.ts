import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api";
import { PLACEMENT_LEVELS } from "@/lib/assessment/registry";
import { audit } from "@/lib/audit";

const ORDER = ["PRE_A1", "A1", "A2", "B1", "B2", "C1"];

export async function recordPlacement(attemptId: string) {
  const attempt = await prisma.assessmentAttempt.findUnique({ where: { id: attemptId }, include: { assessment: true } });
  if (!attempt || attempt.assessment.type !== "PLACEMENT" || attempt.percentage === null) return null;
  const existing = await prisma.placementResult.findUnique({ where: { attemptId } });
  if (existing) return existing;
  const level = levelForPercent(attempt.percentage);
  return prisma.placementResult.create({
    data: { studentId: attempt.studentId, attemptId, recommendedLevel: level },
  });
}

export function levelForPercent(percentage: number) {
  if (percentage < 30) return "PRE_A1";
  if (percentage < 45) return "A1";
  if (percentage < 60) return "A2";
  if (percentage < 75) return "B1";
  if (percentage < 88) return "B2";
  return "C1";
}

export async function overridePlacement(actorId: string, input: { studentId: string; level: string; reason: string; applyToProfile: boolean }) {
  if (!(PLACEMENT_LEVELS as readonly string[]).includes(input.level)) throw new ApiError(422, "Choose a placement level from Pre-A1 to C1.");
  if (input.reason.trim().length < 8) throw new ApiError(422, "Enter a reason for the placement override.");
  const result = await prisma.placementResult.create({
    data: {
      studentId: input.studentId,
      recommendedLevel: input.level,
      officialOverride: input.level,
      overrideById: actorId,
      overrideReason: input.reason.trim(),
      appliedToProfile: input.applyToProfile,
    },
  });
  if (input.applyToProfile) {
    await prisma.user.update({ where: { id: input.studentId }, data: { englishLevel: input.level } });
  }
  await audit({
    actorId,
    action: "PLACEMENT_OVERRIDDEN",
    entityType: "ASSESSMENT",
    entityId: result.id,
    metadata: { studentId: input.studentId, level: input.level, appliedToProfile: input.applyToProfile },
  });
  return result;
}

export { ORDER };
