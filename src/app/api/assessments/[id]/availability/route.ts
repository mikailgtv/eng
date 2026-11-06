import { ApiError, apiRoute, jsonOk, requireApiUser } from "@/lib/api";
import { assessableByStudent, isWindowOpen, type Viewer } from "@/lib/assessment/engine";
import { prisma } from "@/lib/prisma";

interface Ctx {
  params: { id: string };
}

/**
 * GET /api/assessments/[id]/availability — read-only probe for the start
 * screen: is it open for the session student, how many attempts are used,
 * and is there an active attempt to resume. No side effects.
 */
export const GET = apiRoute<Ctx>(async (_req, ctx) => {
  const user = await requireApiUser(["STUDENT"]);
  const viewer: Viewer = { id: user.id, role: user.role, groupId: user.groupId };

  const assessment = await prisma.assessment.findUnique({
    where: { id: ctx.params.id },
    include: { questions: { select: { id: true } } },
  });
  if (!assessment || !(await assessableByStudent(viewer, assessment))) {
    throw new ApiError(404, "Assessment not found.");
  }
  const [myAttempts, active] = await Promise.all([
    prisma.assessmentAttempt.count({
      where: { assessmentId: assessment.id, studentId: user.id },
    }),
    prisma.assessmentAttempt.findFirst({
      where: { assessmentId: assessment.id, studentId: user.id, status: "IN_PROGRESS" },
      select: { id: true },
    }),
  ]);
  const attemptsLeft = assessment.maxAttempts === null || myAttempts < assessment.maxAttempts;
  return jsonOk({
    title: assessment.title,
    type: assessment.type,
    open: isWindowOpen(assessment),
    status: assessment.status,
    startAt: assessment.startAt,
    endAt: assessment.endAt,
    durationMinutes: assessment.durationMinutes,
    passingScore: assessment.passingScore,
    maxAttempts: assessment.maxAttempts,
    questionsCount: assessment.questions.length,
    myAttempts,
    attemptsLeft,
    activeAttemptId: active?.id ?? null,
  });
});
