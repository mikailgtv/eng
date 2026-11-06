import { apiRoute, assertSameOrigin, jsonOk, parseJsonBody, requireApiUser } from "@/lib/api";
import { decideAccess, openAccessReview } from "@/lib/identity/service";

export const POST = apiRoute(async (req) => {
  assertSameOrigin(req);
  const actor = await requireApiUser();
  const body = await parseJsonBody(req) as { action?: string; title?: string; reviewId?: string; assignmentId?: string; decision?: "KEEP" | "REMOVE" | "EXPIRE"; note?: string };
  if (body.action === "decide" && body.reviewId && body.assignmentId && body.decision) {
    return jsonOk(await decideAccess(actor, { reviewId: body.reviewId, assignmentId: body.assignmentId, action: body.decision, note: body.note }));
  }
  return jsonOk(await openAccessReview(actor, body.title || "Access review"), 201);
});
