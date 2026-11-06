import { prisma } from "@/lib/prisma";

export type LevelAccessContext = {
  studentId: string;
  organizationId: string | null;
  currentLevelCode: string | null;
  currentLevelOrder: number | null;
  allowLowerLevelReview: boolean;
  allowAssignedHigherPreview: boolean;
  requireExplicitAssignment: boolean;
};

/**
 * Server-side level policy. A student's current level is sourced from the
 * existing User.englishLevel field; a higher-level course is never granted by
 * group membership alone and requires an explicit student-course assignment.
 */
export async function getStudentLevelAccessContext(studentId: string): Promise<LevelAccessContext | null> {
  const student = await prisma.user.findFirst({
    where: { id: studentId, role: "STUDENT", status: "ACTIVE", archivedAt: null },
    select: { id: true, englishLevel: true, organizationId: true },
  });
  if (!student) return null;

  const level = student.englishLevel
    ? await prisma.level.findFirst({
        where: {
          code: student.englishLevel,
          status: "ACTIVE",
          OR: [{ organizationId: student.organizationId }, { organizationId: null }],
        },
        select: { code: true, order: true },
      })
    : null;

  const policy = student.englishLevel
    ? (student.organizationId
        ? await prisma.levelAccessPolicy.findFirst({
            where: { organizationId: student.organizationId, levelCode: student.englishLevel, active: true },
          })
        : null) ?? (await prisma.levelAccessPolicy.findFirst({
            where: { organizationId: null, levelCode: student.englishLevel, active: true },
          }))
    : null;

  return {
    studentId,
    organizationId: student.organizationId,
    currentLevelCode: level?.code ?? null,
    currentLevelOrder: level?.order ?? null,
    allowLowerLevelReview: policy?.allowLowerLevelReview ?? true,
    allowAssignedHigherPreview: policy?.allowAssignedHigherPreview ?? true,
    requireExplicitAssignment: policy?.requireExplicitAssignment ?? true,
  };
}

export function canAccessCourseAtLevel(input: {
  context: LevelAccessContext;
  courseLevelOrder: number;
  groupAssigned: boolean;
  explicitAssignment: boolean;
}): boolean {
  const { context, courseLevelOrder, groupAssigned, explicitAssignment } = input;
  if (!context.currentLevelOrder) return explicitAssignment;

  if (courseLevelOrder < context.currentLevelOrder) {
    return context.allowLowerLevelReview && (groupAssigned || explicitAssignment);
  }
  if (courseLevelOrder === context.currentLevelOrder) return groupAssigned || explicitAssignment;

  if (!context.allowAssignedHigherPreview) return false;
  if (context.requireExplicitAssignment) return explicitAssignment;
  // Even a relaxed policy never turns a group-level assignment into higher-level access.
  return explicitAssignment;
}

export async function studentCanAccessCourse(studentId: string, courseId: string): Promise<boolean> {
  const [context, student, course] = await Promise.all([
    getStudentLevelAccessContext(studentId),
    prisma.user.findUnique({ where: { id: studentId }, select: { groupId: true, organizationId: true } }),
    prisma.course.findUnique({
      where: { id: courseId },
      select: {
        level: { select: { order: true, organizationId: true, status: true } },
        assignments: { select: { groupId: true } },
        studentAssignments: { where: { studentId, active: true }, select: { accessType: true } },
      },
    }),
  ]);
  if (!context || !student || !course || course.level.status !== "ACTIVE") return false;
  if (course.level.organizationId && course.level.organizationId !== student.organizationId) return false;
  const groupAssigned = !!student.groupId && course.assignments.some((assignment) => assignment.groupId === student.groupId);
  const explicitAssignment = course.studentAssignments.some((assignment) =>
    assignment.accessType === "ASSIGNED" || assignment.accessType === "PREVIEW"
  );
  return canAccessCourseAtLevel({ context, courseLevelOrder: course.level.order, groupAssigned, explicitAssignment });
}

export async function studentCanAccessLesson(studentId: string, lessonId: string): Promise<boolean> {
  const row = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: { module: { select: { courseId: true } } },
  });
  return row ? studentCanAccessCourse(studentId, row.module.courseId) : false;
}
