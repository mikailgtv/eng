import { ApiError, apiRoute, jsonOk, requireApiUser } from "@/lib/api";
import { assertStaffContent } from "@/lib/content/access";
import { previewLesson } from "@/lib/content/lessons";

export const GET = apiRoute(async (req) => {
  const user = await requireApiUser(["TEACHER", "ADMIN"]);
  await assertStaffContent(user);
  const id = new URL(req.url).searchParams.get("lessonId");
  if (!id) throw new ApiError(400, "Choose a lesson.");
  return jsonOk(await previewLesson(user, id));
});
