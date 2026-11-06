import { logSafeError } from "@/lib/logging";
import { ApiError, apiRoute, assertSameOrigin, jsonOk, parseJsonBody, requireApiUser } from "@/lib/api";
import { canRecordProgress, completeLesson, recordLessonAccess } from "@/lib/learning";
import { checkLessonCompletion } from "@/lib/practice";
import { lessonCompleteSchema } from "@/lib/validations";
import { EventBus } from "@/lib/workflows/engine";
import { prisma } from "@/lib/prisma";

interface Ctx {
  params: { id: string };
}

/**
 * POST /api/lessons/[id]/complete — mark the lesson complete for the CURRENT
 * student. Authorization is server-side: the lesson must be published and
 * assigned to the student's own group. Idempotent — completing twice keeps a
 * single progress record (unique student+lesson) and the first completedAt.
 * A client-supplied studentId would be ignored: progress is always scoped to
 * the authenticated session user.
 */
export const POST = apiRoute<Ctx>(async (req, ctx) => {
  assertSameOrigin(req);
  const viewer = await requireApiUser(["STUDENT", "ADMIN"]);
  const body = lessonCompleteSchema.parse(await parseJsonBody(req));

  const allowed = await canRecordProgress(viewer, ctx.params.id);
  if (!allowed) throw new ApiError(404, "Lesson not found or not available for your account.");

  // Completion rule (Phase 3): course-configurable. Default requires every
  // REQUIRED activity to be attempted (correctness not required). The check
  // runs here — server-side — so the UI can never bypass it.
  const completion = await checkLessonCompletion(viewer.id, ctx.params.id);
  if (!completion.allowed) {
    throw new ApiError(
      422,
      `Practice first: ${completion.missing} required exercise${completion.missing === 1 ? "" : "s"} left.`,
      { practice: ["Complete the required exercises, then mark the lesson as done."] }
    );
  }

  // "Viewed" leg of the rule: ensure an access/progress row exists even if
  // the access beacon failed.
  await recordLessonAccess(viewer.id, ctx.params.id);

  const result = await completeLesson(viewer.id, ctx.params.id, body.timeSpentSec);
  if (result.status === "COMPLETED" && result.completedAt) {
    try {
      const [membership, lesson] = await Promise.all([
        prisma.user.findUnique({ where: { id: viewer.id }, select: { organizationId: true } }),
        prisma.lesson.findUnique({ where: { id: ctx.params.id }, select: { id: true, title: true } }),
      ]);
      if (membership?.organizationId) await EventBus.publish({
        organizationId: membership.organizationId, eventType: "LESSON_COMPLETED", actorId: viewer.id, subjectUserId: viewer.id,
        objectType: "LESSON", objectId: ctx.params.id, source: "LESSON_COMPLETION", idempotencyKey: `lesson-completed:${viewer.id}:${ctx.params.id}`,
        metadata: { lessonTitle: lesson?.title ?? null, completedAt: result.completedAt.toISOString() },
      });
    } catch (error) {
      logSafeError("workflow-event.lesson-completion-queue-failed", error);
    }
  }
  return jsonOk({ ok: true, status: result.status, completedAt: result.completedAt });
});
