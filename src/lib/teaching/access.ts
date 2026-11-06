/**
 * Phase 5 authorization. Teachers only reach groups they are assigned to.
 * Admins reach every group. Checks live here so pages and APIs share one rule.
 */
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api";

export type Viewer = { id: string; role: string; groupId?: string | null };

/** null means "every group" (admin). */
export async function assignedGroupIds(viewer: Viewer): Promise<string[] | null> {
  if (viewer.role === "ADMIN") return null;
  const [links, leads] = await Promise.all([
    prisma.teacherGroupAssignment.findMany({
      where: { teacherId: viewer.id },
      select: { groupId: true },
    }),
    prisma.learningGroup.findMany({
      where: { teacherId: viewer.id },
      select: { id: true },
    }),
  ]);
  return [...new Set([...links.map((l) => l.groupId), ...leads.map((g) => g.id)])];
}

export function groupWhere(ids: string[] | null) {
  return ids === null ? {} : { id: { in: ids } };
}

export async function assertGroupAccess(viewer: Viewer, groupId: string) {
  const group = await prisma.learningGroup.findUnique({
    where: { id: groupId },
    select: { id: true, name: true, teacherId: true, status: true },
  });
  if (!group) throw new ApiError(404, "Group not found.");
  const ids = await assignedGroupIds(viewer);
  if (ids !== null && !ids.includes(groupId)) throw new ApiError(404, "Group not found.");
  return group;
}

export async function assertSessionAccess(viewer: Viewer, sessionId: string) {
  const session = await prisma.classSession.findUnique({
    where: { id: sessionId },
    include: { group: { select: { id: true, name: true } }, lesson: { select: { id: true, title: true } } },
  });
  if (!session) throw new ApiError(404, "Class not found.");
  await assertGroupAccess(viewer, session.groupId);
  return session;
}

export async function assertLessonStaffAccess(viewer: Viewer, lessonId: string) {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: {
      module: {
        include: {
          course: {
            select: {
              id: true,
              title: true,
              status: true,
              assignments: { select: { groupId: true } },
            },
          },
        },
      },
    },
  });
  if (!lesson) throw new ApiError(404, "Lesson not found.");
  const ids = await assignedGroupIds(viewer);
  if (ids !== null) {
    const visible = lesson.module.course.assignments.some((a) => ids.includes(a.groupId));
    if (!visible) throw new ApiError(404, "Lesson not found.");
  }
  return lesson;
}

export async function assertAssignmentAccess(viewer: Viewer, assignmentId: string) {
  const assignment = await prisma.assignment.findUnique({ where: { id: assignmentId } });
  if (!assignment) throw new ApiError(404, "Assignment not found.");
  await assertGroupAccess(viewer, assignment.groupId);
  return assignment;
}

/** A student may only touch assignments published to their own group. */
export async function assertStudentAssignment(viewer: Viewer, assignmentId: string) {
  if (viewer.role !== "STUDENT" || !viewer.groupId) throw new ApiError(404, "Assignment not found.");
  const assignment = await prisma.assignment.findFirst({
    where: { id: assignmentId, groupId: viewer.groupId, status: { in: ["PUBLISHED", "CLOSED"] } },
  });
  if (!assignment) throw new ApiError(404, "Assignment not found.");
  return assignment;
}

export const requireGroup = assertGroupAccess;
export const requireSession = assertSessionAccess;

export async function requireStudent(viewer: Viewer, studentId: string) {
  const student = await prisma.user.findFirst({
    where: { id: studentId, role: "STUDENT" },
    include: { group: { select: { id: true, name: true } } },
  });
  if (!student?.groupId) throw new ApiError(404, "Student not found.");
  await assertGroupAccess(viewer, student.groupId);
  return student;
}
