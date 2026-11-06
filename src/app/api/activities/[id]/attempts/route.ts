import { ApiError, apiRoute, assertSameOrigin, jsonOk, parseJsonBody, requireApiUser } from "@/lib/api";
import { canAccessActivity, submitAttempt } from "@/lib/practice";

interface Ctx {
  params: { id: string };
}

/**
 * POST /api/activities/[id]/attempts — record the CURRENT student's attempt.
 * Security:
 *  - studentId is derived from the session (never accepted from the body).
 *  - The activity must be published and belong to a course assigned to the
 *    student's own group (server-side check, IDs in the URL cannot escape it).
 *  - The answer payload is validated against the activity type's schema and
 *    correctness is computed SERVER-SIDE (the client never reports scores).
 * Attempts are append-only history — retries simply add attempt records.
 */
export const POST = apiRoute<Ctx>(async (req, ctx) => {
  assertSameOrigin(req);
  const viewer = await requireApiUser(["STUDENT", "ADMIN"]);
  const body = await parseJsonBody(req);

  const access = await canAccessActivity(viewer, ctx.params.id);
  if (!access.allowed) throw new ApiError(404, "Activity not found or not available for your account.");

  const result = await submitAttempt(viewer.id, ctx.params.id, body);
  if (!result.ok) {
    if (result.reason === "not_found") throw new ApiError(404, "Activity not found.");
    if (result.reason === "invalid_config") throw new ApiError(422, "This activity is misconfigured. Please tell your teacher.");
    throw new ApiError(422, "That answer could not be accepted. Please check it and try again.");
  }

  return jsonOk({
    attemptNumber: result.attemptNumber,
    feedback: result.feedback,
  });
});
