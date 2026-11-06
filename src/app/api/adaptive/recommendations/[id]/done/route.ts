import { apiRoute, assertSameOrigin, jsonOk, requireApiUser } from "@/lib/api";
import { markPlanItemDone } from "@/lib/adaptive/service";

export const POST = apiRoute<{ params: { id: string } }>(async (req, ctx) => {
  assertSameOrigin(req);
  const user = await requireApiUser(["STUDENT"]);
  return jsonOk(await markPlanItemDone(user.id, ctx.params.id));
});
