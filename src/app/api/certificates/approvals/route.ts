import { ApiError, apiRoute, assertSameOrigin, jsonOk, parseJsonBody, requireApiUser } from "@/lib/api";
import { assertConfirmed } from "@/lib/certificates/access";
import { saveApproval } from "@/lib/certificates/service";

export const POST = apiRoute(async (req) => {
  assertSameOrigin(req);
  const user = await requireApiUser(["TEACHER", "ADMIN"]);
  const body = await parseJsonBody(req) as { studentId?: string; courseId?: string; kind?: string; status?: string; note?: string; confirm?: boolean; reason?: string };
  assertConfirmed(body.confirm, body.reason, true);
  if (!body.studentId || !body.courseId || !body.kind || !body.status) throw new ApiError(400, "Choose a student, course, and approval.");
  return jsonOk(await saveApproval(user, { studentId: body.studentId, courseId: body.courseId, kind: body.kind, status: body.status, note: body.note }));
});
