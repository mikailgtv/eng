import { apiRoute, jsonOk, requireApiUser } from "@/lib/api";
import { engagementUsage } from "@/lib/gamification/service";

export const GET = apiRoute(async () => {
  await requireApiUser(["ADMIN"]);
  return jsonOk(await engagementUsage());
});
