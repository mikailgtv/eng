import { apiRoute, assertSameOrigin, jsonOk, parseJsonBody, requireApiUser } from "@/lib/api";
import { savePreference } from "@/lib/certificates/service";

export const POST = apiRoute(async (req) => {
  assertSameOrigin(req);
  const user = await requireApiUser();
  const body = await parseJsonBody(req) as { notifyEligible?: boolean; notifyIssued?: boolean; notifyRevoked?: boolean; notifyExpiring?: boolean };
  return jsonOk(await savePreference(user.id, {
    notifyEligible: body.notifyEligible !== false,
    notifyIssued: body.notifyIssued !== false,
    notifyRevoked: body.notifyRevoked !== false,
    notifyExpiring: body.notifyExpiring !== false,
  }));
});
