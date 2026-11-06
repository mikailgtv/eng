import { ApiError, apiRoute, assertSameOrigin, jsonOk, parseJsonBody, requireApiUser } from "@/lib/api";
import { assertContentRate, assertStaffContent } from "@/lib/content/access";
import { createLibraryItem, saveGrammar, saveVocabulary, searchLibrary, useItemInLesson } from "@/lib/content/library";

export const GET = apiRoute(async (req) => {
  const user = await requireApiUser(["TEACHER", "ADMIN"]);
  await assertStaffContent(user);
  const url = new URL(req.url);
  return jsonOk(await searchLibrary({
    q: url.searchParams.get("q") ?? undefined,
    kind: url.searchParams.get("kind") ?? undefined,
    level: url.searchParams.get("level") ?? undefined,
    topic: url.searchParams.get("topic") ?? undefined,
    skill: url.searchParams.get("skill") ?? undefined,
    take: Number(url.searchParams.get("take") ?? "20"),
    cursor: url.searchParams.get("cursor") ?? undefined,
  }));
});

export const POST = apiRoute(async (req) => {
  assertSameOrigin(req);
  const user = await requireApiUser(["TEACHER", "ADMIN"]);
  await assertContentRate(user.id);
  const body = await parseJsonBody(req) as { action?: string; lessonId?: string; itemId?: string; kind?: string; title?: string; body?: string; word?: string; levelCode?: string; difficulty?: string; topic?: string; primarySkill?: string; tags?: string[]; placement?: string; explanation?: string; translation?: string };
  if (body.action === "use" && body.itemId && body.lessonId) return jsonOk(await useItemInLesson(user, body.itemId, body.lessonId, body.placement), 201);
  if (body.action === "vocabulary" && body.lessonId && body.word) return jsonOk(await saveVocabulary(user, body.lessonId, { word: body.word, translation: body.translation, difficulty: body.difficulty, topic: body.topic, levelCode: body.levelCode }), 201);
  if (body.action === "grammar" && body.lessonId && body.title) return jsonOk(await saveGrammar(user, body.lessonId, { title: body.title, explanation: body.explanation, translation: body.translation, difficulty: body.difficulty, levelCode: body.levelCode }), 201);
  if (!body.kind || !body.title) throw new ApiError(400, "Enter a library item.");
  return jsonOk(await createLibraryItem(user, { kind: body.kind, title: body.title, body: body.body, levelCode: body.levelCode, difficulty: body.difficulty, topic: body.topic, primarySkill: body.primarySkill, tags: body.tags }), 201);
});
