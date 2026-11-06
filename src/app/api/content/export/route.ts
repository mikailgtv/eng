import { ApiError, apiRoute, assertSameOrigin, jsonOk, parseJsonBody, requireApiUser } from "@/lib/api";
import { assertStaffContent } from "@/lib/content/access";
import { exportCourse, importCourseJson } from "@/lib/content/export";

export const GET = apiRoute(async (req) => {
  const user = await requireApiUser(["TEACHER", "ADMIN"]);
  await assertStaffContent(user);
  const url = new URL(req.url);
  const courseId = url.searchParams.get("courseId");
  if (!courseId) throw new ApiError(400, "Choose a course.");
  const format = url.searchParams.get("format") === "csv" ? "csv" : "json";
  const file = await exportCourse(user, courseId, format);
  return new Response(file.body, { headers: { "Content-Type": format === "csv" ? "text/csv" : "application/json", "Content-Disposition": `attachment; filename="${file.filename}"` } });
});

export const POST = apiRoute(async (req) => {
  assertSameOrigin(req);
  const user = await requireApiUser(["TEACHER", "ADMIN"]);
  await assertStaffContent(user);
  const body = await parseJsonBody(req) as { courseId?: string; json?: string; confirm?: boolean };
  if (body.confirm !== true || !body.courseId || !body.json) throw new ApiError(400, "Confirm the import.");
  return jsonOk(await importCourseJson(user, body.courseId, body.json));
});
