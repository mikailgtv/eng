import { ApiError, apiRoute, assertSameOrigin, jsonOk, parseJsonBody, requireApiUser } from "@/lib/api";
import { assertContentRate, assertStaffContent } from "@/lib/content/access";
import { assignContent } from "@/lib/content/service";

export const POST = apiRoute(async (req) => {
  assertSameOrigin(req);
  const user = await requireApiUser(["TEACHER", "ADMIN"]);
  await assertContentRate(user.id);
  await assertStaffContent(user);
  const body = await parseJsonBody(req) as { resourceType?: string; resourceId?: string; targetType?: string; targetId?: string; confirm?: boolean };
  if (body.confirm !== true || !body.resourceType || !body.resourceId || !body.targetType || !body.targetId) throw new ApiError(400, "Confirm the assignment.");
  return jsonOk(await assignContent(user, { resourceType: body.resourceType, resourceId: body.resourceId, targetType: body.targetType, targetId: body.targetId }), 201);
});
