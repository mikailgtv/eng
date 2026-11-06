import { apiRoute, jsonOk, requireApiUser } from "@/lib/api";
import { usageSummary } from "@/lib/ai/service";

export const GET = apiRoute(async () => {
  await requireApiUser(["ADMIN"]);
  return jsonOk(await usageSummary());
});
