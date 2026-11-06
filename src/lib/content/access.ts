import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api";
import { assignedGroupIds } from "@/lib/teaching/access";
import type { SessionUser } from "@/types";
import { contentSettings } from "./settings";
import { prerequisiteMet, releaseOpen } from "./rules";

const writes = new Map<string, { count: number; resetAt: number }>();

export function assertContentRate(userId: string) {
  const now = Date.now();
  const row = writes.get(userId);
  if (!row || row.resetAt < now) {
    writes.set(userId, { count: 1, resetAt: now + 60_000 });
    return;
  }
  row.count += 1;
  if (row.count > 200) throw new ApiError(429, "Too many content changes. Wait a minute and try again.");
}

export async function assertBuilderEnabled() {
  const settings = await contentSettings();
  if (!settings.builderEnabled) throw new ApiError(403, "The content builder is turned off.");
  return settings;
}

export async function isReviewer(user: { id: string; role: string }) {
  if (user.role === "ADMIN") return true;
  const row = await prisma.user.findUnique({ where: { id: user.id }, select: { contentReviewer: true, role: true } });
  if (row?.contentReviewer && row.role === "TEACHER") return true;
  const { hasPermission } = await import("@/lib/identity/permissions");
  return hasPermission(user, "content.review");
}

export async function assertStaffContent(user: SessionUser) {
  if (user.role !== "ADMIN" && user.role !== "TEACHER") throw new ApiError(403, "You do not have permission to edit content.");
  return assertBuilderEnabled();
}

export async function canEditCourse(user: { id: string; role: string }, courseId: string) {
  if (user.role === "ADMIN") {
    // Phase 32: administrators edit courses of their own tenant only. Courses
    // have no organizationId of their own, so the tenant is derived from the
    // course's level. Cross-tenant access is denied (404) unless SUPER_ADMIN.
    const { assertTenant, courseOrgId } = await import("@/lib/identity/tenant");
    await assertTenant(user, await courseOrgId(courseId), "courses.edit");
    return true;
  }
  if (user.role !== "TEACHER") return false;
  const course = await prisma.course.findUnique({ where: { id: courseId }, select: { createdById: true, assignments: { select: { groupId: true } } } });
  if (!course) return false;
  if (course.createdById === user.id) return true;
  const ids = await assignedGroupIds(user);
  if (ids === null) return true;
  if (course.assignments.length === 0) return false;
  return course.assignments.some((row) => ids.includes(row.groupId));
}

export async function assertCourseEdit(user: { id: string; role: string }, courseId: string) {
  if (!(await canEditCourse(user, courseId))) throw new ApiError(404, "Course not found.");
}

export async function studentContentGate(studentId: string, lessonId: string) {
  const override = await prisma.contentOverride.findUnique({ where: { studentId_resourceType_resourceId: { studentId, resourceType: "LESSON", resourceId: lessonId } } });
  const release = await prisma.contentRelease.findUnique({ where: { resourceType_resourceId: { resourceType: "LESSON", resourceId: lessonId } } });
  let afterCompleted = true;
  if (release?.mode === "SEQUENTIAL" && release.afterId) {
    const progress = await prisma.lessonProgress.findUnique({ where: { studentId_lessonId: { studentId, lessonId: release.afterId } } });
    afterCompleted = progress?.status === "COMPLETED";
  }
  if (release && !releaseOpen({
    mode: release.mode,
    releaseAt: release.releaseAt,
    released: release.released,
    afterCompleted,
    now: new Date(),
    hasOverride: Boolean(override),
  })) {
    return { ok: false as const, reason: "This lesson is not released yet." };
  }
  const prerequisites = await prisma.contentPrerequisite.findMany({ where: { resourceType: "LESSON", resourceId: lessonId } });
  for (const item of prerequisites) {
    if (item.requiredType !== "LESSON") continue;
    const progress = await prisma.lessonProgress.findUnique({ where: { studentId_lessonId: { studentId, lessonId: item.requiredId } } });
    if (!prerequisiteMet(progress?.status === "COMPLETED", Boolean(override))) {
      return { ok: false as const, reason: "Complete the prerequisite lesson first, or ask a teacher for an override." };
    }
  }
  return { ok: true as const };
}
