import { apiRoute, assertSameOrigin, jsonOk, parseJsonBody } from "@/lib/api";
import { acceptInvitation } from "@/lib/identity/service";
import { assertIdentityRate } from "@/lib/identity/security";
import { clientIpKey } from "@/lib/request-trust";

/** Public, one-time invitation acceptance. No session required. */
export const POST = apiRoute(async (req) => {
  assertSameOrigin(req);
  assertIdentityRate(`invite:${clientIpKey(req)}`, 10);
  const body = await parseJsonBody(req) as { token: string; firstName: string; lastName: string; username: string; employeeCode: string; password: string };
  return jsonOk(await acceptInvitation(body), 201);
});
