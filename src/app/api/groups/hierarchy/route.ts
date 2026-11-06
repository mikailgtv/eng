import { apiRoute, assertSameOrigin, jsonOk, parseJsonBody, requireApiUser } from "@/lib/api";
import { setGroupHierarchy } from "@/lib/identity/service";

export const POST = apiRoute(async (req) => {
  assertSameOrigin(req);
  const actor = await requireApiUser();
  const body = await parseJsonBody(req) as { groupId: string; parentId?: string | null; code?: string | null; departmentId?: string | null; managerId?: string | null };
  return jsonOk(await setGroupHierarchy(actor, body.groupId, body));
});
