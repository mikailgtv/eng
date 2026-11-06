import { apiRoute, jsonOk, requireApiUser } from "@/lib/api";
import { studentEngagement } from "@/lib/gamification/service";

export const GET = apiRoute(async () => {
  const user = await requireApiUser(["STUDENT"]);
  return jsonOk(await studentEngagement(user.id));
});
