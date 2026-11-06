import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api";
import { audit } from "@/lib/audit";

export async function grantAccommodation(actorId: string, input: {
  studentId: string;
  assessmentId?: string | null;
  extraMinutes?: number;
  largerText?: boolean;
  extraInstructions?: string | null;
  audioReplays?: number | null;
  windowExtensionMinutes?: number;
  staffNote?: string | null;
}) {
  if ((input.extraMinutes ?? 0) < 0 || (input.extraMinutes ?? 0) > 180) throw new ApiError(422, "Extra time must be between 0 and 180 minutes.");
  const row = await prisma.assessmentAccommodation.create({
    data: {
      studentId: input.studentId,
      assessmentId: input.assessmentId || null,
      extraMinutes: input.extraMinutes ?? 0,
      largerText: Boolean(input.largerText),
      extraInstructions: input.extraInstructions || null,
      audioReplays: input.audioReplays ?? null,
      windowExtensionMinutes: input.windowExtensionMinutes ?? 0,
      staffNote: input.staffNote || null,
      createdById: actorId,
    },
  });
  await audit({
    actorId,
    action: "ASSESSMENT_ACCOMMODATION_SET",
    entityType: "ASSESSMENT",
    entityId: row.id,
    metadata: { studentId: input.studentId, assessmentId: input.assessmentId ?? null, extraMinutes: row.extraMinutes },
  });
  return { id: row.id };
}

export async function applyAccommodation(attemptId: string, studentId: string, assessmentId: string) {
  const row = await prisma.assessmentAccommodation.findFirst({
    where: { studentId, OR: [{ assessmentId }, { assessmentId: null }] },
    orderBy: [{ assessmentId: "desc" }, { createdAt: "desc" }],
  });
  if (!row) return null;
  const snapshot = await prisma.assessmentAttemptSnapshot.findUnique({ where: { attemptId } });
  const time = snapshot ? JSON.parse(snapshot.timeConfig) as { accommodationApplied?: boolean; deadlineAt?: string | null } : null;
  if (time?.accommodationApplied) return publicAccommodation(row);
  const attempt = await prisma.assessmentAttempt.findUnique({ where: { id: attemptId } });
  if (attempt?.deadlineAt && row.extraMinutes > 0 && attempt.status === "IN_PROGRESS") {
    const deadlineAt = new Date(attempt.deadlineAt.getTime() + row.extraMinutes * 60_000);
    await prisma.assessmentAttempt.update({ where: { id: attemptId }, data: { deadlineAt } });
  }
  if (snapshot) {
    const next = { ...(time ?? {}), accommodationApplied: true, extraMinutes: row.extraMinutes };
    await prisma.assessmentAttemptSnapshot.update({ where: { attemptId }, data: { timeConfig: JSON.stringify(next) } });
  }
  return publicAccommodation(row);
}

export function publicAccommodation(row: { extraMinutes: number; largerText: boolean; extraInstructions: string | null; audioReplays: number | null }) {
  return {
    extraMinutes: row.extraMinutes,
    largerText: row.largerText,
    extraInstructions: row.extraInstructions,
    audioReplays: row.audioReplays,
  };
}
