import { ApiError, apiRoute, assertSameOrigin, jsonOk, parseJsonBody, requireApiUser } from "@/lib/api";
import { assertContentRate, assertStaffContent } from "@/lib/content/access";
import { checkQuality, createBuilderLesson, publishLesson, readDraft, reviewLesson, saveDraft, submitForReview } from "@/lib/content/lessons";

export const GET = apiRoute(async (req) => {
  const user = await requireApiUser(["TEACHER", "ADMIN"]);
  await assertStaffContent(user);
  const id = new URL(req.url).searchParams.get("id");
  if (!id) throw new ApiError(400, "Choose a lesson.");
  return jsonOk(await readDraft(user, id));
});

export const POST = apiRoute(async (req) => {
  assertSameOrigin(req);
  const user = await requireApiUser(["TEACHER", "ADMIN"]);
  await assertContentRate(user.id);
  await assertStaffContent(user);
  const body = await parseJsonBody(req) as {
    action?: string;
    moduleId?: string;
    unitId?: string;
    title?: string;
    beginnerMode?: boolean;
    difficulty?: string;
    lessonId?: string;
    blocks?: unknown[];
    confirm?: boolean;
    status?: "APPROVED" | "REJECTED" | "CHANGES_REQUESTED";
    reason?: string;
    comment?: string;
  };
  if (body.action === "create" && body.moduleId && body.title) return jsonOk(await createBuilderLesson(user, { moduleId: body.moduleId, unitId: body.unitId, title: body.title, beginnerMode: body.beginnerMode, difficulty: body.difficulty }), 201);
  if (!body.lessonId) throw new ApiError(400, "Choose a lesson.");
  if (body.action === "draft") return jsonOk(await saveDraft(user, body.lessonId, body.blocks ?? []));
  if (body.action === "quality") return jsonOk(await checkQuality(body.lessonId));
  if (body.action === "submit") return jsonOk(await submitForReview(user, body.lessonId));
  if (body.action === "review" && body.status) return jsonOk(await reviewLesson(user, body.lessonId, { status: body.status, reason: body.reason, comment: body.comment }));
  if (body.action === "publish") return jsonOk(await publishLesson(user, body.lessonId, body.confirm === true));
  throw new ApiError(400, "Choose a lesson action.");
});
