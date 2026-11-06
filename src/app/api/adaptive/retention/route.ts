import { apiRoute, assertSameOrigin, jsonOk, requireApiUser } from "@/lib/api";
import { applyRetention } from "@/lib/adaptive/service";

export const POST = apiRoute(async (req) => {
  assertSameOrigin(req);
  const user = await requireApiUser(["ADMIN"]);
  return jsonOk(await applyRetention(user.id));
});
