import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api";
import { audit } from "@/lib/audit";
import { assertGroupAccess } from "@/lib/teaching/access";
import { getStudentLevelAccessContext } from "@/lib/learning/level-access";

export type LevelAssignmentInput = {
  currentLevelCode: string;
  targetLevelCode: string | null;
  courseId: string | null;
  learningPace: "GENTLE" | "STANDARD" | "INTENSIVE";
  dailyGoalMinutes: number;
  reason: string;
};

export async function updateStudentLearningProfile(
  viewer: { id: string; role: string; groupId: string | null },
  studentId: string,
  input: LevelAssignmentInput
) {
  if (viewer.role !== "TEACHER" && viewer.role !== "ADMIN") throw new ApiError(403, "Not authorized.");
  const [actor, student] = await Promise.all([
    prisma.user.findUnique({ where: { id: viewer.id }, select: { organizationId: true, role: true } }),
    prisma.user.findFirst({
      where: { id: studentId, role: "STUDENT", status: "ACTIVE", archivedAt: null },
      select: { id: true, groupId: true, organizationId: true, englishLevel: true },
    }),
  ]);
  if (!actor || !student?.groupId) throw new ApiError(404, "Student not found.");
  if (actor.organizationId && student.organizationId !== actor.organizationId) throw new ApiError(404, "Student not found.");
  await assertGroupAccess({ ...viewer, role: viewer.role }, student.groupId);

  const current = await prisma.level.findFirst({
    where: { code: input.currentLevelCode, status: "ACTIVE", OR: [{ organizationId: student.organizationId }, { organizationId: null }] },
    select: { code: true, order: true, organizationId: true },
  });
  if (!current) throw new ApiError(422, "Choose an active level for this organization.");
  const target = input.targetLevelCode
    ? await prisma.level.findFirst({
        where: { code: input.targetLevelCode, status: "ACTIVE", OR: [{ organizationId: student.organizationId }, { organizationId: null }] },
        select: { code: true, order: true },
      })
    : null;
  if (input.targetLevelCode && !target) throw new ApiError(422, "Choose an active target level.");
  if (target && target.order < current.order) throw new ApiError(422, "The target level must not be below the current level.");

  const course = input.courseId
    ? await prisma.course.findFirst({
        where: { id: input.courseId, status: "PUBLISHED", level: { status: "ACTIVE" } },
        select: { id: true, level: { select: { order: true, organizationId: true } } },
      })
    : null;
  if (input.courseId && !course) throw new ApiError(404, "Published course not found.");
  if (course?.level.organizationId && course.level.organizationId !== student.organizationId) throw new ApiError(404, "Published course not found.");
  if (course && course.level.order > current.order) throw new ApiError(422, "A higher-level course requires a separate teacher preview assignment.");

  const updated = await prisma.$transaction(async (tx) => {
    const profile = await tx.studentLearningProfile.upsert({
      where: { studentId },
      create: {
        studentId,
        organizationId: student.organizationId,
        targetLevelCode: target?.code ?? null,
        levelStatus: "CONFIRMED",
        assignedTeacherId: viewer.role === "TEACHER" ? viewer.id : null,
        assignedCourseId: course?.id ?? null,
        learningPace: input.learningPace,
        dailyGoalMinutes: input.dailyGoalMinutes,
        updatedById: viewer.id,
      },
      update: {
        organizationId: student.organizationId,
        targetLevelCode: target?.code ?? null,
        levelStatus: "CONFIRMED",
        assignedTeacherId: viewer.role === "TEACHER" ? viewer.id : undefined,
        assignedCourseId: course?.id ?? null,
        learningPace: input.learningPace,
        dailyGoalMinutes: input.dailyGoalMinutes,
        updatedById: viewer.id,
      },
    });
    await tx.user.update({ where: { id: studentId }, data: { englishLevel: current.code } });
    await tx.studentLearningPreference.upsert({
      where: { studentId },
      create: { studentId, dailyMinutes: input.dailyGoalMinutes, lastSyncedAt: null },
      update: { dailyMinutes: input.dailyGoalMinutes, lastSyncedAt: null },
    });

    if (viewer.role === "TEACHER") {
      await tx.teacherStudentAssignment.upsert({
        where: { teacherId_studentId: { teacherId: viewer.id, studentId } },
        create: { teacherId: viewer.id, studentId, groupId: student.groupId, organizationId: student.organizationId, status: "ACTIVE" },
        update: { groupId: student.groupId, organizationId: student.organizationId, status: "ACTIVE" },
      });
    }
    if (course) {
      await tx.studentCourseAssignment.upsert({
        where: { studentId_courseId: { studentId, courseId: course.id } },
        create: { studentId, courseId: course.id, assignedById: viewer.id, accessType: "ASSIGNED", active: true },
        update: { assignedById: viewer.id, accessType: "ASSIGNED", active: true },
      });
    }
    return profile;
  });

  await audit({
    actorId: viewer.id,
    action: "STUDENT_LEARNING_PROFILE_UPDATED",
    entityType: "USER",
    entityId: studentId,
    metadata: { previousLevel: student.englishLevel, currentLevel: current.code, targetLevel: target?.code ?? null, courseId: course?.id ?? null, reason: input.reason.trim() },
  });
  return { studentId, currentLevelCode: current.code, targetLevelCode: target?.code ?? null, profileUpdatedAt: updated.updatedAt };
}

export async function createStudentCoursePreview(
  viewer: { id: string; role: string; groupId: string | null },
  studentId: string,
  courseId: string
) {
  if (viewer.role !== "TEACHER" && viewer.role !== "ADMIN") throw new ApiError(403, "Not authorized.");
  const [actor, student, course] = await Promise.all([
    prisma.user.findUnique({ where: { id: viewer.id }, select: { organizationId: true } }),
    prisma.user.findFirst({ where: { id: studentId, role: "STUDENT", status: "ACTIVE" }, select: { groupId: true, organizationId: true } }),
    prisma.course.findFirst({ where: { id: courseId, status: "PUBLISHED", level: { status: "ACTIVE" } }, select: { id: true, level: { select: { organizationId: true, order: true } } } }),
  ]);
  if (!student?.groupId || !course) throw new ApiError(404, "Student or course not found.");
  if (actor?.organizationId && student.organizationId !== actor.organizationId) throw new ApiError(404, "Student not found.");
  if (course.level.organizationId && course.level.organizationId !== student.organizationId) throw new ApiError(404, "Course not found.");
  const levelContext = await getStudentLevelAccessContext(studentId);
  if (!levelContext) throw new ApiError(404, "Student not found.");
  if (levelContext.currentLevelOrder !== null && course.level.order > levelContext.currentLevelOrder && !levelContext.allowAssignedHigherPreview) {
    throw new ApiError(403, "Higher-level previews are disabled by organization policy.");
  }
  await assertGroupAccess(viewer, student.groupId);
  const row = await prisma.studentCourseAssignment.upsert({
    where: { studentId_courseId: { studentId, courseId } },
    create: { studentId, courseId, assignedById: viewer.id, accessType: "PREVIEW", active: true },
    update: { assignedById: viewer.id, accessType: "PREVIEW", active: true },
  });
  await audit({ actorId: viewer.id, action: "STUDENT_COURSE_PREVIEW_ASSIGNED", entityType: "CONTENT", entityId: courseId, metadata: { studentId } });
  return { id: row.id, accessType: row.accessType };
}
