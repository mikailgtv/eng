import { ApiError, apiRoute, assertSameOrigin, jsonOk, parseJsonBody, requireApiUser } from "@/lib/api";
import { assertContentRate, assertStaffContent } from "@/lib/content/access";
import { createAiDraft, reviewAiDraft } from "@/lib/content/ai-draft";

export const POST = apiRoute(async (req) => {
  assertSameOrigin(req);
  const user = await requireApiUser(["TEACHER", "ADMIN"]);
  await assertContentRate(user.id);
  await assertStaffContent(user);
  const body = await parseJsonBody(req) as { action?: string; prompt?: string; kind?: string; lessonId?: string; id?: string; status?: "REVIEWED" | "REJECTED"; body?: string };
  if (body.action === "review" && body.id && body.status) return jsonOk(await reviewAiDraft(user, body.id, { status: body.status, body: body.body }));
  if (!body.prompt) throw new ApiError(400, "Enter a prompt.");
  return jsonOk(await createAiDraft(user, { prompt: body.prompt, kind: body.kind ?? "VOCABULARY", lessonId: body.lessonId }), 201);
});
