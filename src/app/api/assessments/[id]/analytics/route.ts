import { ApiError, apiRoute, jsonOk, requireApiUser } from "@/lib/api";
import { groupAnalyticsForStaff, skillAnalyticsForStaff } from "@/lib/assessment/queries";
import { prisma } from "@/lib/prisma";

interface Ctx {
  params: { id: string };
}

/**
 * GET /api/assessments/[id]/analytics — per-group completion/pass aggregates
 * and per-skill performance (descriptive only — never individual rankings).
 */
export const GET = apiRoute<Ctx>(async (_req, ctx) => {
  const user = await requireApiUser(["TEACHER", "ADMIN"]);
  const exists = await prisma.assessment.findUnique({ where: { id: ctx.params.id }, select: { id: true } });
  if (!exists) throw new ApiError(404, "Assessment not found.");
  const [groups, skills] = await Promise.all([
    groupAnalyticsForStaff({ id: user.id, role: user.role, groupId: user.groupId }, ctx.params.id),
    skillAnalyticsForStaff(ctx.params.id),
  ]);
  return jsonOk({ groups, skills });
});

