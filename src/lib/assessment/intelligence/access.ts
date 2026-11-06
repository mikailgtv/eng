import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api";
import type { SessionUser } from "@/types";
import { PERMISSIONS, SYSTEM_ROLES, type PermissionKey } from "@/lib/identity/catalog";
import { ensureIdentity, requirePermission } from "@/lib/identity/permissions";

const KEYS: PermissionKey[] = ["assessments.manage", "assessments.review", "assessments.take", "assessments.analytics"];

/** Adds Phase 17 permissions without waiting for a process restart. */
export async function syncAssessmentPermissions() {
  await ensureIdentity();
  const org = await prisma.organization.findFirst({ orderBy: { createdAt: "asc" } });
  if (!org) return;
  for (const item of PERMISSIONS.filter((row) => KEYS.includes(row[0]))) {
    await prisma.permission.upsert({
      where: { key: item[0] },
      update: { category: item[1], description: item[2] },
      create: { key: item[0], category: item[1], description: item[2] },
    });
  }
  const permissions = await prisma.permission.findMany({ where: { key: { in: KEYS } }, select: { id: true, key: true } });
  const byKey = new Map(permissions.map((row) => [row.key, row.id]));
  for (const role of SYSTEM_ROLES) {
    const saved = await prisma.accessRole.findUnique({ where: { organizationId_key: { organizationId: org.id, key: role.key } } });
    if (!saved) continue;
    for (const key of role.permissions.filter((item) => KEYS.includes(item))) {
      const permissionId = byKey.get(key);
      if (!permissionId) continue;
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: saved.id, permissionId } },
        update: {},
        create: { roleId: saved.id, permissionId },
      });
    }
  }
}

export async function requireAssessmentPermission(user: SessionUser, key: PermissionKey) {
  await syncAssessmentPermissions();
  await requirePermission(user, key);
}

export async function teacherGroupIds(userId: string): Promise<string[] | null> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (user?.role === "ADMIN") return null;
  const [lead, links] = await Promise.all([
    prisma.learningGroup.findMany({ where: { teacherId: userId }, select: { id: true } }),
    prisma.teacherGroupAssignment.findMany({ where: { teacherId: userId }, select: { groupId: true } }),
  ]);
  return [...new Set([...lead.map((row) => row.id), ...links.map((row) => row.groupId)])];
}

export async function assertStudentInScope(actor: { id: string; role: string }, studentId: string) {
  if (actor.role === "ADMIN") return;
  if (actor.role !== "TEACHER") throw new ApiError(403, "You do not have permission to perform this action.");
  const student = await prisma.user.findUnique({ where: { id: studentId }, select: { groupId: true, role: true } });
  if (!student || student.role !== "STUDENT") throw new ApiError(404, "Student not found.");
  const groups = await teacherGroupIds(actor.id);
  if (!student.groupId || !groups?.includes(student.groupId)) throw new ApiError(404, "Student not found.");
}
