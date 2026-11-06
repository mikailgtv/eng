import { ApiError, apiRoute, assertSameOrigin, jsonOk, parseJsonBody, requireApiUser } from "@/lib/api";
import { assertConfirmed, requestOrigin } from "@/lib/certificates/access";
import { recertifyCertificate } from "@/lib/certificates/service";

export const POST = apiRoute(async (req) => {
  assertSameOrigin(req);
  const user = await requireApiUser(["ADMIN"]);
  const body = await parseJsonBody(req) as { publicId?: string; confirm?: boolean; reason?: string };
  assertConfirmed(body.confirm, body.reason, true);
  if (!body.publicId) throw new ApiError(400, "Choose a certificate.");
  return jsonOk(await recertifyCertificate(user, body.publicId, body.reason!.trim(), requestOrigin(req)), 201);
});
