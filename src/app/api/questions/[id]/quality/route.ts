import { apiRoute, jsonOk, requireApiUser } from "@/lib/api";
import { requireAssessmentPermission } from "@/lib/assessment/intelligence/access";
import { checkQuestionQuality } from "@/lib/assessment/intelligence/quality";

interface Ctx {
  params: { id: string };
}

export const GET = apiRoute<Ctx>(async (req, ctx) => {
  const user = await requireApiUser(["TEACHER", "ADMIN"]);
  await requireAssessmentPermission(user, "assessments.manage");
  const result = await checkQuestionQuality(ctx.params.id);
  return jsonOk(result);
});
