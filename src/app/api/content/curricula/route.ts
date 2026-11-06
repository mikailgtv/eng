import { ApiError, apiRoute, assertSameOrigin, jsonOk, parseJsonBody, requireApiUser } from "@/lib/api";
import { assertContentRate, assertStaffContent } from "@/lib/content/access";
import { createCurriculum, duplicateCurriculum, listCurricula, updateCurriculum } from "@/lib/content/service";

export const GET = apiRoute(async () => {
  const user = await requireApiUser(["TEACHER", "ADMIN"]);
  await assertStaffContent(user);
  return jsonOk(await listCurricula());
});

export const POST = apiRoute(async (req) => {
  assertSameOrigin(req);
  const user = await requireApiUser(["ADMIN"]);
  await assertContentRate(user.id);
  const body = await parseJsonBody(req) as { title?: string; description?: string; levelCode?: string; goal?: string; durationWeeks?: number; sessionCount?: number; plannedHours?: number; id?: string; action?: string; confirm?: boolean; status?: string };
  if (body.action === "duplicate") {
    if (body.confirm !== true || !body.id) throw new ApiError(400, "Confirm the duplicate.");
    return jsonOk(await duplicateCurriculum(user, body.id), 201);
  }
  if (body.id) return jsonOk(await updateCurriculum(user, body.id, body));
  if (!body.title) throw new ApiError(400, "Enter a title.");
  return jsonOk(await createCurriculum(user, { title: body.title, description: body.description, levelCode: body.levelCode, goal: body.goal, durationWeeks: body.durationWeeks, sessionCount: body.sessionCount, plannedHours: body.plannedHours }), 201);
});
