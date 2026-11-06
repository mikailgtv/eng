import { apiRoute, assertSameOrigin, jsonOk, requireApiUser } from "@/lib/api";
import { publishAssignment } from "@/lib/teaching/service";

export const POST = apiRoute<{ params: { id: string } }>(async (req, ctx) => {
  assertSameOrigin(req);
  const user = await requireApiUser(["TEACHER", "ADMIN"]);
  const assignment = await publishAssignment({ id: user.id, role: user.role, groupId: user.groupId }, ctx.params.id);
  return jsonOk({ id: assignment.id, status: assignment.status });
});
