import { ApiError, apiRoute, jsonOk, requireApiUser } from "@/lib/api";
import { assertStaffContent } from "@/lib/content/access";
import { contentAnalytics, recommendForStudent } from "@/lib/content/library";

export const GET = apiRoute(async (req) => {
  const user = await requireApiUser(["TEACHER", "ADMIN", "STUDENT"]);
  const url = new URL(req.url);
  if (user.role === "STUDENT") return jsonOk(await recommendForStudent(user.id));
  await assertStaffContent(user);
  const resourceId = url.searchParams.get("resourceId");
  if (!resourceId) throw new ApiError(400, "Choose content.");
  return jsonOk(await contentAnalytics(url.searchParams.get("resourceType") ?? "LESSON", resourceId));
});
