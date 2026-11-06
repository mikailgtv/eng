import { z } from "zod";
import { apiRoute, assertSameOrigin, jsonOk, parseJsonBody, requireApiUser } from "@/lib/api";
import { requireAssessmentPermission } from "@/lib/assessment/intelligence/access";
import { correctOfficialScore } from "@/lib/assessment/intelligence/review";

interface Ctx {
  params: { id: string };
}

const correctSchema = z.object({
  newScore: z.number().min(0).max(1000),
  newPassed: z.boolean(),
  reason: z.string().trim().min(8).max(500),
}).strict();

export const POST = apiRoute<Ctx>(async (req, ctx) => {
  const user = await requireApiUser(["TEACHER", "ADMIN"]);
  assertSameOrigin(req);
  await requireAssessmentPermission(user, "assessments.review");
  const payload = correctSchema.parse(await parseJsonBody(req));
  const result = await correctOfficialScore(user.id, {
    attemptId: ctx.params.id,
    ...payload,
  });
  return jsonOk(result);
});
