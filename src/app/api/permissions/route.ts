import { apiRoute, assertSameOrigin, jsonOk, parseJsonBody, requireApiUser } from "@/lib/api";
import { grantTemporary, permissionMatrix } from "@/lib/identity/service";
import type { PermissionKey } from "@/lib/identity/catalog";

export const GET = apiRoute(async () => {
  const actor = await requireApiUser();
  return jsonOk(await permissionMatrix(actor));
});

export const POST = apiRoute(async (req) => {
  assertSameOrigin(req);
  const actor = await requireApiUser();
  const body = await parseJsonBody(req) as { userId: string; permissionKey: PermissionKey; startsAt: string; endsAt: string; scopeType?: string; scopeId?: string | null };
  return jsonOk(await grantTemporary(actor, body), 201);
});
