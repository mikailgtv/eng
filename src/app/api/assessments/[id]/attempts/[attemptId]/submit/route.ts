import { prisma } from "@/lib/prisma";
import { apiRoute, assertSameOrigin, jsonOk, requireApiUser } from "@/lib/api";
import { submitAttempt, type Viewer } from "@/lib/assessment/engine";
import { notifyUsers } from "@/lib/teaching/notify";

interface Ctx {
  params: { id: string; attemptId: string };
}

/**
 * POST /api/assessments/[id]/attempts/[attemptId]/submit — official
 * submission. The server grades every question inside a transaction and the
 * guarded IN_PROGRESS→terminal update makes double submission impossible.
 * A submission after the deadline (beyond the grace window) is refused — the
 * server finalizes the attempt as EXPIRED instead, using the saved answers.
 */
export const POST = apiRoute<Ctx>(async (req, ctx) => {
  assertSameOrigin(req);
  const user = await requireApiUser(["STUDENT"]);
  const viewer: Viewer = { id: user.id, role: user.role, groupId: user.groupId };
  const result = await submitAttempt(viewer, ctx.params.attemptId);
  if (user.groupId) {
    const [assessment, group] = await Promise.all([
      prisma.assessment.findUnique({ where: { id: ctx.params.id }, select: { title: true, type: true } }),
      prisma.learningGroup.findUnique({ where: { id: user.groupId }, select: { teacherId: true, teacherLinks: { select: { teacherId: true } } } }),
    ]);
    const teacherIds = [group?.teacherId, ...(group?.teacherLinks.map((link) => link.teacherId) ?? [])].filter((id): id is string => Boolean(id));
    if (assessment) {
      await notifyUsers(teacherIds, {
        type: "EXAM",
        title: assessment.type === "EXAM" ? "Exam submitted" : "Quiz submitted",
        body: assessment.title,
        href: `/teacher/exams/${ctx.params.id}`,
      });
    }
  }
  return jsonOk(result);
});
