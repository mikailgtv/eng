import { ApiError, apiRoute, assertSameOrigin, jsonOk, parseJsonBody, requireApiUser } from "@/lib/api";
import { assertConfirmed, requestOrigin } from "@/lib/certificates/access";
import { issueCertificate } from "@/lib/certificates/service";

export const POST = apiRoute(async (req) => {
  assertSameOrigin(req);
  const user = await requireApiUser(["ADMIN"]);
  const body = await parseJsonBody(req) as { courseId?: string; studentId?: string; confirm?: boolean; reason?: string };
  assertConfirmed(body.confirm, body.reason, true);
  if (!body.courseId || !body.studentId) throw new ApiError(400, "Choose a student and a course.");
  const issued = await issueCertificate({
    actorId: user.id,
    studentId: body.studentId,
    courseId: body.courseId,
    reason: body.reason!.trim(),
    automatic: false,
    origin: requestOrigin(req),
  });
  return jsonOk(issued, 201);
});
