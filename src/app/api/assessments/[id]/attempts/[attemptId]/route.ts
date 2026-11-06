import { ApiError, apiRoute, jsonOk, requireApiUser } from "@/lib/api";
import { getAttemptState, type Viewer } from "@/lib/assessment/engine";
import { prisma } from "@/lib/prisma";

interface Ctx {
  params: { id: string; attemptId: string };
}

/**
 * GET /api/assessments/[id]/attempts/[attemptId] — the session student's
 * attempt state: sanitized questions (no correct answers), saved answers and
 * the SERVER deadline + serverNow so the client can render a trustworthy
 * countdown. Expired attempts are finalized server-side first.
 */
export const GET = apiRoute<Ctx>(async (_req, ctx) => {
  const user = await requireApiUser(["STUDENT"]);
  const viewer: Viewer = { id: user.id, role: user.role, groupId: user.groupId };

  const exists = await prisma.assessmentAttempt.findUnique({
    where: { id: ctx.params.attemptId },
    select: { assessmentId: true },
  });
  if (!exists || exists.assessmentId !== ctx.params.id) throw new ApiError(404, "Attempt not found.");

  const state = await getAttemptState(viewer, ctx.params.attemptId);
  return jsonOk(state);
});
