import { ApiError, apiRoute, assertSameOrigin, jsonOk, parseJsonBody, requireApiUser } from "@/lib/api";
import { assertConfirmed } from "@/lib/certificates/access";
import { saveSignatory } from "@/lib/certificates/service";

export const POST = apiRoute(async (req) => {
  assertSameOrigin(req);
  const user = await requireApiUser(["ADMIN"]);
  const body = await parseJsonBody(req) as { name?: string; title?: string; confirm?: boolean };
  assertConfirmed(body.confirm, undefined, false);
  if (!body.name || !body.title) throw new ApiError(400, "Enter the signatory name and title.");
  return jsonOk(await saveSignatory(user, body.name, body.title));
});
