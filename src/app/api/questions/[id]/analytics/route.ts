import { apiRoute, jsonOk, requireApiUser } from "@/lib/api";
import { requireAssessmentPermission } from "@/lib/assessment/intelligence/access";
import { analyzeQuestion } from "@/lib/assessment/intelligence/analytics";

interface Ctx {
  params: { id: string };
}

export const GET = apiRoute<Ctx>(async (req, ctx) => {
  const user = await requireApiUser(["TEACHER", "ADMIN"]);
  await requireAssessmentPermission(user, "assessments.analytics");
  const result = await analyzeQuestion(ctx.params.id);
  return jsonOk(result);
});
