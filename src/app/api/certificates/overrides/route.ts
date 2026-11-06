import { ApiError, apiRoute, assertSameOrigin, jsonOk, parseJsonBody, requireApiUser } from "@/lib/api";
import { assertConfirmed } from "@/lib/certificates/access";
import { saveOverride } from "@/lib/certificates/service";

export const POST = apiRoute(async (req) => {
  assertSameOrigin(req);
  const user = await requireApiUser(["ADMIN"]);
  const body = await parseJsonBody(req) as { studentId?: string; courseId?: string; requirementKey?: string; reason?: string; confirm?: boolean };
  assertConfirmed(body.confirm, body.reason, true);
  if (!body.studentId || !body.courseId || !body.requirementKey) throw new ApiError(400, "Choose a student, course, and requirement.");
  return jsonOk(await saveOverride(user, { studentId: body.studentId, courseId: body.courseId, requirementKey: body.requirementKey, reason: body.reason! }));
});
