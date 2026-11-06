import { apiRoute, jsonOk, requireApiUser } from "@/lib/api";
import { adaptiveUsage } from "@/lib/adaptive/service";

export const GET = apiRoute(async () => {
  await requireApiUser(["ADMIN"]);
  return jsonOk(await adaptiveUsage());
});
