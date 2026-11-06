import { ApiError, apiRoute, assertSameOrigin, jsonOk, parseJsonBody, requireApiUser } from "@/lib/api";
import { assertConfirmed } from "@/lib/certificates/access";
import { saveRule } from "@/lib/certificates/service";

export const POST = apiRoute(async (req) => {
  assertSameOrigin(req);
  const user = await requireApiUser(["ADMIN"]);
  const body = await parseJsonBody(req) as { courseId?: string; rules?: unknown; confirm?: boolean };
  assertConfirmed(body.confirm, undefined, false);
  if (!body.courseId) throw new ApiError(400, "Choose a course.");
  return jsonOk(await saveRule(user, body.courseId, body.rules));
});
