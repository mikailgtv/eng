import { ApiError, apiRoute, assertSameOrigin, jsonOk, parseJsonBody, requireApiUser } from "@/lib/api";
import { assertContentRate, assertStaffContent } from "@/lib/content/access";
import { createCourse, updateCourse } from "@/lib/content/service";
import { prisma } from "@/lib/prisma";

export const GET = apiRoute(async (req) => {
  const user = await requireApiUser(["TEACHER", "ADMIN"]);
  await assertStaffContent(user);
  const id = new URL(req.url).searchParams.get("id");
  if (!id) {
    const courses = await prisma.course.findMany({ orderBy: { title: "asc" }, take: 40, select: { id: true, title: true, status: true, code: true, levelId: true, curriculumId: true } });
    return jsonOk(courses);
  }
  const course = await prisma.course.findUnique({
    where: { id },
    include: { modules: { orderBy: { order: "asc" }, include: { units: { orderBy: { order: "asc" } }, lessons: { orderBy: { order: "asc" }, select: { id: true, title: true, status: true, workflowStatus: true, unitId: true } } } } },
  });
  if (!course) throw new ApiError(404, "Course not found.");
  return jsonOk(course);
});

export const POST = apiRoute(async (req) => {
  assertSameOrigin(req);
  const user = await requireApiUser(["TEACHER", "ADMIN"]);
  await assertContentRate(user.id);
  const body = await parseJsonBody(req) as { id?: string; levelId?: string; title?: string; description?: string; goal?: string; outcomes?: string; curriculumId?: string; durationWeeks?: number; sessionCount?: number; plannedHours?: number };
  if (body.id) return jsonOk(await updateCourse(user, body.id, body));
  if (!body.levelId || !body.title) throw new ApiError(400, "Choose a level and a title.");
  return jsonOk(await createCourse(user, { levelId: body.levelId, title: body.title, description: body.description, goal: body.goal, outcomes: body.outcomes, curriculumId: body.curriculumId, durationWeeks: body.durationWeeks, sessionCount: body.sessionCount, plannedHours: body.plannedHours }), 201);
});
