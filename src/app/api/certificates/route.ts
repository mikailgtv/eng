import { ApiError, apiRoute, jsonOk, requireApiUser } from "@/lib/api";
import { visibleStudent } from "@/lib/certificates/access";
import { evaluateCourse } from "@/lib/certificates/engine";
import { adminDesk, studentCertificateHome, teacherDesk } from "@/lib/certificates/service";

export const GET = apiRoute(async (req) => {
  const user = await requireApiUser();
  const url = new URL(req.url);
  const courseId = url.searchParams.get("courseId");
  if (courseId) {
    const studentId = user.role === "STUDENT" ? user.id : url.searchParams.get("studentId") ?? "";
    if (!studentId) throw new ApiError(400, "Choose a student.");
    await visibleStudent(user, studentId);
    return jsonOk(await evaluateCourse(studentId, courseId));
  }
  if (user.role === "STUDENT") return jsonOk(await studentCertificateHome(user.id));
  if (user.role === "TEACHER") return jsonOk(await teacherDesk(user, url.searchParams.get("groupId") ?? undefined));
  return jsonOk(await adminDesk());
});
