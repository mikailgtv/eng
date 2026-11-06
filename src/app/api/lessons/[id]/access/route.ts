import { z } from "zod";
import { ApiError, apiRoute, assertSameOrigin, jsonOk, parseJsonBody, requireApiUser } from "@/lib/api";
import { canRecordProgress, recordLessonAccess } from "@/lib/learning";

interface Ctx {
  params: { id: string };
}

const accessSchema = z.object({}).strict();

/**
 * POST /api/lessons/[id]/access — mark the current student as viewing a lesson.
 * Creates/refreshes their OWN progress row (IN_PROGRESS + lastAccessedAt).
 * Students can only ever touch their own row: there is no student id in the
 * request — the session decides. Repeated calls never duplicate records
 * (unique student+lesson) and never downgrade COMPLETED to IN_PROGRESS.
 */
export const POST = apiRoute<Ctx>(async (req, ctx) => {
  assertSameOrigin(req);
  const viewer = await requireApiUser(["STUDENT", "ADMIN"]);
  accessSchema.parse(await parseJsonBody(req).catch(() => ({})));

  const allowed = await canRecordProgress(viewer, ctx.params.id);
  if (!allowed) throw new ApiError(404, "Lesson not found or not available for your account.");

  await recordLessonAccess(viewer.id, ctx.params.id);
  return jsonOk({ ok: true });
});
