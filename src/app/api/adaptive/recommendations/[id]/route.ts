import { apiRoute, jsonOk, requireApiUser } from "@/lib/api";
import { explainRecommendation } from "@/lib/adaptive/service";

export const GET = apiRoute<{ params: { id: string } }>(async (_req, ctx) => {
  const user = await requireApiUser(["STUDENT", "TEACHER", "ADMIN"]);
  return jsonOk(await explainRecommendation(user, ctx.params.id));
});
