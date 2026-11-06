import { ApiError, apiRoute, assertSameOrigin, jsonOk, parseJsonBody, requireApiUser } from "@/lib/api";
import { assertConfirmed } from "@/lib/certificates/access";
import { archiveCompletion } from "@/lib/certificates/service";

export const POST = apiRoute(async (req) => {
  assertSameOrigin(req);
  const user = await requireApiUser(["ADMIN"]);
  const body = await parseJsonBody(req) as { studentId?: string; courseId?: string; confirm?: boolean; reason?: string };
  assertConfirmed(body.confirm, body.reason, true);
  if (!body.studentId || !body.courseId) throw new ApiError(400, "Choose a student and a course.");
  return jsonOk(await archiveCompletion(user, body.studentId, body.courseId, body.reason!.trim()));
});
