import { ApiError, apiRoute, assertSameOrigin, jsonOk, parseJsonBody, requireApiUser } from "@/lib/api";
import { assertConfirmed, requestOrigin } from "@/lib/certificates/access";
import { batchIssue } from "@/lib/certificates/service";

export const POST = apiRoute(async (req) => {
  assertSameOrigin(req);
  const user = await requireApiUser(["ADMIN"]);
  const body = await parseJsonBody(req) as { courseId?: string; groupId?: string; confirm?: boolean; reason?: string };
  assertConfirmed(body.confirm, body.reason, true);
  if (!body.courseId || !body.groupId) throw new ApiError(400, "Choose a course and a group.");
  return jsonOk(await batchIssue(user, body.courseId, body.groupId, body.reason!.trim(), requestOrigin(req)));
});
