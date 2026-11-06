import { ApiError, apiRoute, jsonOk, requireApiUser } from "@/lib/api";
import { getLessonForStudent } from "@/lib/learning";
import { getLessonActivitiesForStudent, getPracticeState } from "@/lib/practice";

// Always dynamic — reads the session from cookies.
export const dynamic = "force-dynamic";

interface Ctx {
  params: { id: string };
}

/**
 * GET /api/lessons/[id]/practice — the current student's practice state for
 * a lesson: the sanitized activities (answers stripped server-side) plus
 * their latest-attempt map and calculated Practice Score.
 * Scoped to the session user; the lesson must be visible to them.
 */
export const GET = apiRoute<Ctx>(async (_req, ctx) => {
  const viewer = await requireApiUser(["STUDENT", "ADMIN"]);
  const lesson = await getLessonForStudent(viewer, ctx.params.id);
  if (!lesson) throw new ApiError(404, "Lesson not found or not available for your account.");

  const [activities, state] = await Promise.all([
    getLessonActivitiesForStudent(ctx.params.id),
    getPracticeState(viewer.id, ctx.params.id),
  ]);
  return jsonOk({ activities, ...state });
});
