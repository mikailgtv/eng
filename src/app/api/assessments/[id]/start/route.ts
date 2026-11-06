import { apiRoute, assertSameOrigin, jsonOk, requireApiUser } from "@/lib/api";
import { startOrResumeAttempt, type Viewer } from "@/lib/assessment/engine";

/**
 * POST /api/assessments/[id]/start — start (or resume) the session student's
 * attempt. All guards (open window, attempt limit, group assignment, single
 * active attempt, official server start time) run inside a transaction here.
 */
export const POST = apiRoute<{ params: { id: string } }>(async (req, ctx) => {
  assertSameOrigin(req);
  const user = await requireApiUser(["STUDENT"]);
  const viewer: Viewer = { id: user.id, role: user.role, groupId: user.groupId };
  const attempt = await startOrResumeAttempt(viewer, ctx.params.id);
  return jsonOk(attempt);
});
