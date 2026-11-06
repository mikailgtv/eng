import { ApiError, apiRoute, assertSameOrigin, jsonOk, parseJsonBody, requireApiUser } from "@/lib/api";
import { assertConfirmed } from "@/lib/certificates/access";
import { saveSetting } from "@/lib/certificates/service";

export const POST = apiRoute(async (req) => {
  assertSameOrigin(req);
  const user = await requireApiUser(["ADMIN"]);
  const body = await parseJsonBody(req) as { key?: string; value?: string; confirm?: boolean };
  assertConfirmed(body.confirm, undefined, false);
  if (!body.key || typeof body.value !== "string") throw new ApiError(400, "Choose a setting and a value.");
  return jsonOk(await saveSetting(user, body.key, body.value));
});
