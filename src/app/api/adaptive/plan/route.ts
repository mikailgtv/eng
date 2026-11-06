import { apiRoute, jsonOk, requireApiUser } from "@/lib/api";
import { studentPlan } from "@/lib/adaptive/service";

export const GET = apiRoute(async () => {
  const user = await requireApiUser(["STUDENT"]);
  return jsonOk({ plan: await studentPlan(user.id) });
});
