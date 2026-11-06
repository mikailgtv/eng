/**
 * Phase 32 — Assessment access control with tenant and group scope
 * Fixes HIGH finding: assessment GET/PATCH/question replacement allowed broad TEACHER role without assessment-specific group/course scope
 */

import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api";
import { assignedGroupIds } from "@/lib/teaching/access";
import type { SessionUser } from "@/types";

export type AssessmentViewer = { id: string; role: string; organizationId?: string | null };

async function getAssessmentOrganization(assessment: { courseId?: string | null; levelId?: string | null; moduleId?: string | null }): Promise<string | null> {
  // Try to derive organization via course assignment -> group -> organization, or level -> organization, or module -> course -> ...
  if (assessment.courseId) {
    const courseAssignments = await prisma.courseAssignment.findMany({
      where: { courseId: assessment.courseId },
      include: { group: { select: { organizationId: true } } },
      take: 5,
    });
    for (const ca of courseAssignments) {
      if (ca.group.organizationId) return ca.group.organizationId;
    }
    // Fallback: course's level? Course has levelId
    const course = await prisma.course.findUnique({ where: { id: assessment.courseId }, select: { levelId: true } });
    if (course?.levelId) {
      const level = await prisma.level.findUnique({ where: { id: course.levelId }, select: { organizationId: true } });
      if (level?.organizationId) return level.organizationId;
    }
  }
  if (assessment.levelId) {
    const level = await prisma.level.findUnique({ where: { id: assessment.levelId }, select: { organizationId: true } });
    if (level?.organizationId) return level.organizationId;
  }
  if (assessment.moduleId) {
    const mod = await prisma.module.findUnique({ where: { id: assessment.moduleId }, select: { courseId: true } });
    if (mod?.courseId) {
      return getAssessmentOrganization({ courseId: mod.courseId });
    }
  }
  return null;
}

export async function assertAssessmentAccess(viewer: AssessmentViewer, assessmentId: string): Promise<{ id: string; courseId: string | null; organizationId: string | null }> {
  // Phase 32: never trust the caller's object for tenant identity — resolve it
  // from the database. SessionUser previously had no organizationId at all, so
  // every `viewer.organizationId && ...` check here was silently skipped.
  if (!viewer.organizationId) {
    const row = await prisma.user.findUnique({ where: { id: viewer.id }, select: { organizationId: true } });
    viewer = { ...viewer, organizationId: row?.organizationId ?? null };
  }
  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId },
    select: { id: true, courseId: true, levelId: true, moduleId: true },
  });
  if (!assessment) throw new ApiError(404, "Assessment not found.");

  // Tenant isolation: check organization
  const assessmentOrgId = await getAssessmentOrganization(assessment);
  
  if (viewer.role !== "ADMIN") {
    // Teacher must have group access to course's assigned groups
    if (assessment.courseId) {
      const groupIds = await assignedGroupIds(viewer as any);
      if (groupIds !== null) {
        // Teacher: must have at least one group assigned to this course
        const assignment = await prisma.courseAssignment.findFirst({
          where: { courseId: assessment.courseId, groupId: { in: groupIds } },
        });
        if (!assignment) {
          throw new ApiError(404, "Assessment not found.");
        }
      }
      // For admin with null groupIds (all groups), allow but still check org if possible
      if (viewer.organizationId && assessmentOrgId && viewer.organizationId !== assessmentOrgId) {
        throw new ApiError(404, "Assessment not found.");
      }
    } else {
      // Assessment without course: only allow if level's org matches viewer's org
      if (viewer.organizationId && assessmentOrgId && viewer.organizationId !== assessmentOrgId) {
        throw new ApiError(404, "Assessment not found.");
      }
      // If no course and viewer is teacher with no group access to any course, deny
      // For now, allow teacher if they have any assigned groups (conservative)
      if (viewer.role === "TEACHER") {
        const groupIds = await assignedGroupIds(viewer as any);
        if (groupIds !== null && groupIds.length === 0) {
          throw new ApiError(404, "Assessment not found.");
        }
      }
    }
  } else {
    // ADMIN: check org isolation unless SUPER_ADMIN
    if (viewer.organizationId && assessmentOrgId && viewer.organizationId !== assessmentOrgId) {
      // Check if SUPER_ADMIN
      const { grantsFor } = await import("@/lib/identity/permissions");
      const grants = await grantsFor(viewer.id);
      const isSuperAdmin = grants.some(g => g.roleKey === "SUPER_ADMIN");
      if (!isSuperAdmin) {
        throw new ApiError(404, "Assessment not found.");
      }
    }
  }

  return { id: assessment.id, courseId: assessment.courseId, organizationId: assessmentOrgId };
}

export async function assertAssessmentGroupAccess(viewer: SessionUser, assessmentId: string) {
  return assertAssessmentAccess(viewer, assessmentId);
}
