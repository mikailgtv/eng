import { apiRoute, assertSameOrigin, jsonOk, requireApiUser } from "@/lib/api";
import { studentPlan } from "@/lib/adaptive/service";

export const POST = apiRoute(async (req) => {
  assertSameOrigin(req);
  const user = await requireApiUser(["STUDENT"]);
  return jsonOk({ plan: await studentPlan(user.id, true) });
});
